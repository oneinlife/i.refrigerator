'use client';

import type { Product, CreateProductInput } from '@/types/product';
import { SHEET_NAMES } from './sheetsManager';
import { logError } from '@/lib/errorLogger';
import { storageService } from '@/lib/storageService';
import { normalizeProductName } from '@/lib/utils/textUtils';

/**
 * Сервис синхронизации справочника продуктов с Google Sheets
 */
export class ProductsSyncService {
  /**
   * Динамически получает gapi при обращении
   */
  private get gapi(): any {
    return typeof window !== 'undefined' ? (window as any).gapi : undefined;
  }

  /**
   * Проверяет, что API инициализирован
   */
  private checkGapi(): void {
    if (!this.gapi?.client?.sheets) {
      throw new Error('Google Sheets API не инициализирован. Пожалуйста, авторизуйтесь и обновите страницу.');
    }
  }
  
  /**
   * Проверяет, что API готов к работе (мягкая проверка)
   */
  public isApiReady(): boolean {
    return !!(this.gapi?.client?.sheets);
  }

  /**
   * Устанавливает токен авторизации для API
   */
  private ensureToken(): void {
    const token = storageService.getGoogleToken();
    
    if (token && this.gapi?.client) {
      this.gapi.client.setToken({ access_token: token });
    }
  }

  /**
   * Получить все продукты из справочника
   */
  async getAllProducts(spreadsheetId: string): Promise<Product[]> {
    // Мягкая проверка - если API не готов, возвращаем пустой массив
    if (!this.isApiReady()) {
      console.warn('⚠️ Google Sheets API not ready yet');
      return [];
    }

    this.ensureToken();

    try {
      const response = await this.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_NAMES.PRODUCTS}!A2:G`,
      });

      const rows = response.result.values || [];
      
      const products = rows.map((row: any[]) => ({
        product_id: row[0] || '',
        name: row[1] || '',
        default_unit: row[2] || 'шт',
        aliases: row[3] || undefined,
        typical_shelf_life_days: row[4] ? Number(row[4]) : undefined,
        created_date: row[5] || new Date().toISOString(),
        usage_count: Number(row[6]) || 0,
      }));
      
      return products;
    } catch (error) {
      logError('ProductsSync.getAllProducts', error);
      console.error('❌ Failed to load products:', error);
      return [];
    }
  }

  /**
   * Получить продукт по ID
   */
  async getProduct(spreadsheetId: string, productId: string): Promise<Product | null> {
    const products = await this.getAllProducts(spreadsheetId);
    return products.find(p => p.product_id === productId) || null;
  }

  /**
   * Добавить новый продукт
   */
  async addProduct(
    spreadsheetId: string,
    input: CreateProductInput
  ): Promise<Product> {
    this.checkGapi();
    this.ensureToken();

    // Нормализуем название продукта: первая буква заглавная
    const normalizedName = normalizeProductName(input.name);
    
    const product: Product = {
      product_id: crypto.randomUUID(),
      ...input,
      name: normalizedName,
      created_date: new Date().toISOString(),
      usage_count: input.usage_count || 0,
    };

    const row = [
      product.product_id,
      product.name,
      product.default_unit,
      product.aliases || '',
      product.typical_shelf_life_days || '',
      product.created_date,
      product.usage_count,
    ];

    try {
      await this.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${SHEET_NAMES.PRODUCTS}!A2`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [row],
        },
      });

      console.log('Product added:', product.product_id, product.name);
      return product;
    } catch (error) {
      logError('ProductsSync.addProduct', error);
      
      // Проверяем, не истёк ли токен (ошибка 401)
      if (error && typeof error === 'object') {
        const errObj = error as Record<string, unknown>;
        const result = errObj.result as any;
        if (result?.error?.code === 401 || result?.error?.status === 'UNAUTHENTICATED') {
          // Токен истёк, очищаем его
          storageService.removeGoogleToken();
          throw new Error('Срок действия токена истёк. Пожалуйста, выйдите и войдите снова через Google.');
        }
        
        // Подробный вывод для отладки
        // eslint-disable-next-line no-console
        console.error('ProductsSync.addProduct RAW error:', error);
        for (const key in errObj) {
          // eslint-disable-next-line no-console
          console.error('Error property', key, errObj[key]);
        }
      }
      
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      throw new Error(`Не удалось добавить продукт в таблицу: ${errorMsg}`);
    }
  }

  /**
   * Обновить продукт
   */
  async updateProduct(
    spreadsheetId: string,
    product: Product
  ): Promise<boolean> {
    this.checkGapi();
    this.ensureToken();

    try {
      // Найти строку с нужным product_id
      const products = await this.getAllProducts(spreadsheetId);
      const rowIndex = products.findIndex(p => p.product_id === product.product_id);
      
      if (rowIndex === -1) {
        logError('ProductsSync.updateProduct', `Product not found: ${product.product_id}`);
        return false;
      }

      // Строки начинаются с 2 (заголовки на строке 1)
      const sheetRow = rowIndex + 2;

      const row = [
        product.product_id,
        product.name,
        product.default_unit,
        product.aliases || '',
        product.typical_shelf_life_days || '',
        product.created_date,
        product.usage_count,
      ];

      await this.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_NAMES.PRODUCTS}!A${sheetRow}:G${sheetRow}`,
        valueInputOption: 'RAW',
        resource: {
          values: [row],
        },
      });

      console.log('Product updated:', product.product_id, product.name);
      return true;
    } catch (error) {
      logError('ProductsSync.updateProduct', error);
      return false;
    }
  }

  /**
   * Удалить продукт
   */
  async deleteProduct(
    spreadsheetId: string,
    productId: string
  ): Promise<boolean> {
    this.checkGapi();
    this.ensureToken();

    try {
      // Найти строку с нужным product_id
      const products = await this.getAllProducts(spreadsheetId);
      const rowIndex = products.findIndex(p => p.product_id === productId);
      
      if (rowIndex === -1) {
        logError('ProductsSync.deleteProduct', `Product not found: ${productId}`);
        return false;
      }

      // Получить sheetId
      const sheetsResponse = await this.gapi.client.sheets.spreadsheets.get({
        spreadsheetId,
      });
      
      const sheets = sheetsResponse.result.sheets || [];
      const productsSheet = sheets.find((s: any) => s.properties.title === SHEET_NAMES.PRODUCTS);
      
      if (!productsSheet) {
        throw new Error('Products sheet not found');
      }

      const sheetId = productsSheet.properties.sheetId;
      const rowToDelete = rowIndex + 1; // +1 потому что заголовки на строке 0

      // Удалить строку
      await this.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: 'ROWS',
                  startIndex: rowToDelete,
                  endIndex: rowToDelete + 1,
                },
              },
            },
          ],
        },
      });

      console.log('Product deleted:', productId);
      return true;
    } catch (error) {
      logError('ProductsSync.deleteProduct', error);
      return false;
    }
  }

  /**
   * Поиск продуктов по запросу (для автодополнения)
   */
  async searchProducts(
    spreadsheetId: string,
    query: string
  ): Promise<Product[]> {
    const products = await this.getAllProducts(spreadsheetId);
    const lowerQuery = query.toLowerCase().trim();
    
    if (!lowerQuery) {
      return products;
    }

    return products.filter(product => {
      // Поиск по имени
      if (product.name.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      
      // Поиск по алиасам
      if (product.aliases) {
        const aliases = product.aliases.toLowerCase().split(',');
        return aliases.some(alias => alias.trim().includes(lowerQuery));
      }
      
      return false;
    });
  }

  /**
   * Получить наиболее используемые продукты
   */
  async getMostUsedProducts(
    spreadsheetId: string,
    limit: number = 10
  ): Promise<Product[]> {
    const products = await this.getAllProducts(spreadsheetId);
    
    return products
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, limit);
  }

  /**
   * Увеличить счетчик использования продукта
   */
  async incrementUsageCount(
    spreadsheetId: string,
    productId: string
  ): Promise<void> {
    const product = await this.getProduct(spreadsheetId, productId);
    
    if (!product) {
      console.warn('Product not found for usage increment:', productId);
      return;
    }

    product.usage_count++;
    await this.updateProduct(spreadsheetId, product);
  }

  /**
   * Найти продукт по имени (точное совпадение)
   */
  async findByName(
    spreadsheetId: string,
    name: string
  ): Promise<Product | null> {
    const products = await this.getAllProducts(spreadsheetId);
    const lowerName = name.toLowerCase().trim();
    
    return products.find(p => p.name.toLowerCase() === lowerName) || null;
  }

  /**
   * Получить или создать продукт по имени
   * Если продукт не найден - создает новый
   */
  async getOrCreateProduct(
    spreadsheetId: string,
    name: string,
    category: string,
    defaultUnit: string
  ): Promise<Product> {
    // Попробовать найти существующий
    const existing = await this.findByName(spreadsheetId, name);
    if (existing) {
      return existing;
    }

    // Создать новый
    return await this.addProduct(spreadsheetId, {
      name,
      default_unit: defaultUnit,
      usage_count: 0,
    });
  }

  /**
   * Получить продукты по категории
   */
  async getProductsByCategory(
    spreadsheetId: string,
    category: string
  ): Promise<Product[]> {
    const products = await this.getAllProducts(spreadsheetId);
    return [];
  }

  /**
   * Получить все уникальные категории продуктов
   */
  async getCategories(spreadsheetId: string): Promise<string[]> {
    const products = await this.getAllProducts(spreadsheetId);
    const categories = new Set<string>();
    
    // категории больше не используются
    
    return Array.from(categories).sort();
  }
}

/**
 * Singleton instance
 */
let productsSyncInstance: ProductsSyncService | null = null;

export function getProductsSyncService(): ProductsSyncService {
  if (!productsSyncInstance) {
    productsSyncInstance = new ProductsSyncService();
  }
  return productsSyncInstance;
}
