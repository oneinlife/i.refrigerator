'use client';

import type { LegacyInventoryItem } from '@/types/inventory';
import { storageService } from './storageService';

const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';

export class ClientGoogleSheetsService {
  private gapiInited = false;
  private tokenClient: any = null;

  async initialize(clientId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Not in browser environment'));
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = async () => {
        try {
          await this.initGapi();
          await this.initGis(clientId);
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      script.onerror = () => reject(new Error('Failed to load Google API'));
      document.body.appendChild(script);
    });
  }

  private async initGapi(): Promise<void> {
    return new Promise((resolve, reject) => {
      (window as any).gapi.load('client', async () => {
        try {
          await (window as any).gapi.client.init({
            discoveryDocs: [DISCOVERY_DOC],
          });
          this.gapiInited = true;
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  private async initGis(clientId: string): Promise<void> {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => {
        this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPES,
          callback: '', // будет установлен позже
        });
        resolve();
      };
      document.body.appendChild(script);
    });
  }

  authenticate(callback: (success: boolean, error?: string) => void): void {
    if (!this.gapiInited) {
      callback(false, 'Google API not initialized. Please reload the page.');
      return;
    }

    if (!this.tokenClient) {
      callback(false, 'Token client not initialized. Please reload the page.');
      return;
    }

    // Проверяем существующий токен
    const existingToken = storageService.getGoogleToken();
    if (existingToken && (window as any).gapi?.client) {
      // Сначала проверяем время истечения токена (быстрая локальная проверка)
      if (storageService.isGoogleTokenExpired()) {
        console.log('🔄 Токен истек, обновляем автоматически...');
        // Пытаемся обновить токен автоматически
        this.refreshTokenSilently()
          .then(() => {
            console.log('✅ Токен успешно обновлен при входе');
            callback(true);
          })
          .catch((error) => {
            console.warn('⚠️ Не удалось обновить токен автоматически:', error);
            // Если не удалось обновить автоматически, запрашиваем новый с показом окна
            storageService.removeGoogleToken();
            this.requestNewToken(callback);
          });
        return;
      }

      try {
        (window as any).gapi.client.setToken({ access_token: existingToken });
        // Проверяем, валиден ли токен, выполнив простой запрос
        this.verifyToken().then((valid) => {
          if (valid) {
            callback(true);
          } else {
            // Токен невалиден, запрашиваем новый
            storageService.removeGoogleToken();
            this.requestNewToken(callback);
          }
        }).catch(() => {
          // Токен невалиден, запрашиваем новый
          storageService.removeGoogleToken();
          this.requestNewToken(callback);
        });
        return;
      } catch (error) {
        // Токен невалиден, продолжаем с новым запросом
        storageService.removeGoogleToken();
      }
    }

    // Запрашиваем новый токен
    this.requestNewToken(callback);
  }

  private async verifyToken(): Promise<boolean> {
    try {
      // Пробуем выполнить простой запрос для проверки токена
      const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + storageService.getGoogleToken());
      return response.ok;
    } catch {
      return false;
    }
  }

  private requestNewToken(callback: (success: boolean, error?: string) => void): void {
    // Устанавливаем callback для обработки ответа
    this.tokenClient.callback = (response: any) => {
      if (response.error) {
        callback(false, response.error);
        return;
      }
      const token = response.access_token;
      const expiresIn = response.expires_in || 3600; // по умолчанию 1 час
      storageService.setGoogleToken(token, expiresIn);
      (window as any).gapi.client.setToken({ access_token: token });
      callback(true);
    };

    // Запрашиваем новый токен (это должно быть СИНХРОННО с действием пользователя!)
    try {
      this.tokenClient.requestAccessToken({ prompt: '' }); // Убрали 'consent' чтобы не спрашивать разрешения каждый раз
    } catch (error: any) {
      callback(false, error.message || 'Failed to request access token');
    }
  }

  revokeToken(): void {
    const token = storageService.getGoogleToken();
    if (token && (window as any).google?.accounts?.oauth2) {
      try {
        (window as any).google.accounts.oauth2.revoke(token, () => {
          console.log('Token revoked');
        });
      } catch (error) {
        console.error('Failed to revoke token:', error);
      }
    }
    storageService.removeGoogleToken();
    if ((window as any).gapi?.client) {
      (window as any).gapi.client.setToken(null);
    }
  }

  async exportToSheet(
    spreadsheetId: string,
    sheetName: string,
    items: LegacyInventoryItem[]
  ): Promise<void> {
    await this.ensureAuthenticated();

    if (!(window as any).gapi?.client?.sheets) {
      throw new Error('Google Sheets API not loaded. Please reload the page.');
    }

    const headers = [
      'ID',
      'Название',
      'Количество',
      'Единица',
      'Категория',
      'Срок годности',
      'Дата добавления',
      'Примечания',
    ];

    const values = [
      headers,
      ...items.map((item) => [
        item.id,
        item.name,
        item.quantity,
        item.unit,
        item.category,
        item.expiryDate || '',
        item.addedDate,
        item.notes || '',
      ]),
    ];

    await (window as any).gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      resource: {
        values,
      },
    });
  }

  async importFromSheet(
    spreadsheetId: string,
    sheetName: string
  ): Promise<LegacyInventoryItem[]> {
    await this.ensureAuthenticated();

    if (!(window as any).gapi?.client?.sheets) {
      throw new Error('Google Sheets API not loaded. Please reload the page.');
    }

    const response = await (window as any).gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A2:H`,
    });

    const rows = response.result.values || [];

    return rows.map((row: any[]) => ({
      id: row[0] || crypto.randomUUID(),
      name: row[1] || '',
      quantity: Number(row[2]) || 0,
      unit: row[3] || 'шт',
      category: row[4] || 'Другое',
      expiryDate: row[5] || undefined,
      addedDate: row[6] || new Date().toISOString(),
      notes: row[7] || undefined,
    }));
  }

  async syncWithSheet(
    spreadsheetId: string,
    sheetName: string,
    localItems: LegacyInventoryItem[]
  ): Promise<LegacyInventoryItem[]> {
    const remoteItems = await this.importFromSheet(spreadsheetId, sheetName);

    const remoteMap = new Map(remoteItems.map((item) => [item.id, item]));
    const localMap = new Map(localItems.map((item) => [item.id, item]));

    const mergedItems: LegacyInventoryItem[] = [];

    // Добавляем все локальные элементы (они имеют приоритет)
    localItems.forEach((item) => {
      mergedItems.push(item);
    });

    // Добавляем элементы, которые есть только на сервере
    remoteItems.forEach((item) => {
      if (!localMap.has(item.id)) {
        mergedItems.push(item);
      }
    });

    // Экспортируем объединенные данные обратно
    await this.exportToSheet(spreadsheetId, sheetName, mergedItems);

    return mergedItems;
  }

  async createSpreadsheet(title: string): Promise<string> {
    await this.ensureAuthenticated();

    if (!(window as any).gapi?.client?.sheets) {
      throw new Error('Google Sheets API not loaded. Please reload the page.');
    }

    const response = await (window as any).gapi.client.sheets.spreadsheets.create({
      resource: {
        properties: {
          title,
        },
        sheets: [
          {
            properties: {
              title: 'Inventory',
            },
          },
        ],
      },
    });

    return response.result.spreadsheetId;
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.gapiInited) {
      throw new Error('Google API not initialized. Please refresh the page.');
    }
    
    if (!(window as any).gapi || !(window as any).gapi.client) {
      throw new Error('Google API client not ready. Please try again.');
    }

    const token = storageService.getGoogleToken();
    if (!token) {
      throw new Error('Not authenticated. Please sign in with Google.');
    }

    // Проверяем, не истек ли токен
    if (storageService.isGoogleTokenExpired()) {
      console.log('⚠️ Токен истек, пытаемся обновить автоматически...');
      try {
        // Пытаемся автоматически обновить токен
        await this.refreshTokenSilently();
        console.log('✅ Токен успешно обновлен');
      } catch (error) {
        console.warn('⚠️ Не удалось автоматически обновить токен:', error);
        // Не выбрасываем ошибку - пусть попробует выполнить запрос с текущим токеном
        // Если токен действительно невалиден, API вернет 401 и пользователь увидит сообщение
      }
    }
    
    (window as any).gapi.client.setToken({ access_token: storageService.getGoogleToken() });
  }

  private async refreshTokenSilently(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.tokenClient) {
        reject(new Error('Token client not initialized'));
        return;
      }

      // Таймаут на случай если окно авторизации зависнет
      const timeout = setTimeout(() => {
        reject(new Error('Token refresh timeout'));
      }, 10000); // 10 секунд

      this.tokenClient.callback = (response: any) => {
        clearTimeout(timeout);
        
        if (response.error) {
          console.error('Не удалось обновить токен:', response.error);
          reject(new Error(response.error));
          return;
        }
        const token = response.access_token;
        const expiresIn = response.expires_in || 3600;
        storageService.setGoogleToken(token, expiresIn);
        resolve();
      };

      try {
        // Обновляем токен без показа окна (если пользователь уже давал разрешение)
        this.tokenClient.requestAccessToken({ prompt: '' });
      } catch (error: any) {
        clearTimeout(timeout);
        reject(new Error(error.message || 'Failed to refresh token'));
      }
    });
  }

  isAuthenticated(): boolean {
    return !!storageService.getGoogleToken();
  }
}

// Singleton instance
let instance: ClientGoogleSheetsService | null = null;

export function getGoogleSheetsService(): ClientGoogleSheetsService {
  if (!instance) {
    instance = new ClientGoogleSheetsService();
  }
  return instance;
}
