'use client';

import type { InventoryItem, InventoryItemWithProduct, CreateInventoryInput } from '@/types/inventory';
import type { Product } from '@/types/product';
import { SHEET_NAMES } from './sheetsManager';
import { logError } from '@/lib/errorLogger';
import { storageService } from '@/lib/storageService';

/**
 * Сервис синхронизации инвентаря с Google Sheets
 * Работает с новой структурой данных (Inventory + Products)
 */
export class InventorySyncService {
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
  private isApiReady(): boolean {
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
   * Получить весь инвентарь
   */
  async getInventory(spreadsheetId: string): Promise<InventoryItem[]> {
    // Мягкая проверка - если API не готов, возвращаем пустой массив
    if (!this.isApiReady()) {
      console.warn('Google Sheets API not ready yet');
      return [];
    }

    this.ensureToken();

    try {
      const response = await this.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_NAMES.INVENTORY}!A2:G`,
      });

      const rows = response.result.values || [];
      
      return rows.map((row: any[]) => ({
        inventory_id: row[0] || crypto.randomUUID(),
        product_id: row[1] || '',
        quantity: Number(row[2]) || 0,
        unit: row[3] || 'шт',
        expiry_date: row[4] || undefined,
        added_date: row[5] || new Date().toISOString(),
        notes: row[6] || undefined,
      }));
    } catch (error) {
      logError('InventorySync.getInventory', error);
      throw new Error('Failed to get inventory');
    }
  }

  /**
   * Получить инвентарь с данными о продуктах (JOIN)
   */
  async getInventoryWithProducts(spreadsheetId: string): Promise<InventoryItemWithProduct[]> {
    // Мягкая проверка - если API не готов, возвращаем пустой массив
    if (!this.isApiReady()) {
      console.warn('Google Sheets API not ready yet');
      return [];
    }
    
    this.checkGapi();
    this.ensureToken();

    // Получить инвентарь и продукты параллельно
    const [inventory, products] = await Promise.all([
      this.getInventory(spreadsheetId),
      this.getProducts(spreadsheetId),
    ]);

    // Создать map для быстрого поиска продуктов
    const productMap = new Map<string, Product>();
    products.forEach(product => {
      productMap.set(product.product_id, product);
    });

    // Объединить данные
    return inventory.map(item => {
      const product = productMap.get(item.product_id);
      if (!product) {
        console.warn(`Product not found for inventory item: ${item.inventory_id}`);
        // Создаем заглушку продукта
        return {
          ...item,
          product: {
            product_id: item.product_id,
            name: 'Unknown Product',
            default_unit: item.unit,
            created_date: new Date().toISOString(),
            usage_count: 0,
          },
        };
      }
      return {
        ...item,
        product,
      };
    });
  }

  /**
   * Получить все продукты из справочника
   */
  private async getProducts(spreadsheetId: string): Promise<Product[]> {
    try {
      const response = await this.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_NAMES.PRODUCTS}!A2:G`,
      });

      const rows = response.result.values || [];
      
      return rows.map((row: any[]) => ({
        product_id: row[0] || '',
        name: row[1] || '',
        default_unit: row[2] || 'шт',
        aliases: row[3] || undefined,
        typical_shelf_life_days: row[4] ? Number(row[4]) : undefined,
        created_date: row[5] || new Date().toISOString(),
        usage_count: Number(row[6]) || 0,
      }));
    } catch (error) {
      logError('InventorySync.getProducts', error);
      return [];
    }
  }

  /**
   * Добавить новый элемент в инвентарь
   */
  async addInventoryItem(
    spreadsheetId: string,
    input: CreateInventoryInput
  ): Promise<InventoryItem> {
    this.checkGapi();
    this.ensureToken();

    const item: InventoryItem = {
      inventory_id: crypto.randomUUID(),
      ...input,
      added_date: new Date().toISOString(),
    };

    const row = [
      item.inventory_id,
      item.product_id,
      item.quantity,
      item.unit,
      item.expiry_date || '',
      item.added_date,
      item.notes || '',
    ];

    try {
      await this.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${SHEET_NAMES.INVENTORY}!A2`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [row],
        },
      });

      console.log('Inventory item added:', item.inventory_id);
      return item;
    } catch (error) {
      logError('InventorySync.addInventoryItem', error);
      throw new Error('Failed to add inventory item');
    }
  }

  /**
   * Обновить элемент инвентаря
   */
  async updateInventoryItem(
    spreadsheetId: string,
    item: InventoryItem
  ): Promise<boolean> {
    this.checkGapi();
    this.ensureToken();

    try {
      // Найти строку с нужным inventory_id
      const inventory = await this.getInventory(spreadsheetId);
      const rowIndex = inventory.findIndex(i => i.inventory_id === item.inventory_id);
      
      if (rowIndex === -1) {
        logError('InventorySync.updateInventoryItem', `Inventory item not found: ${item.inventory_id}`);
        return false;
      }

      // Строки начинаются с 2 (заголовки на строке 1)
      const sheetRow = rowIndex + 2;

      const row = [
        item.inventory_id,
        item.product_id,
        item.quantity,
        item.unit,
        item.expiry_date || '',
        item.added_date,
        item.notes || '',
      ];

      await this.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_NAMES.INVENTORY}!A${sheetRow}:G${sheetRow}`,
        valueInputOption: 'RAW',
        resource: {
          values: [row],
        },
      });

      console.log('Inventory item updated:', item.inventory_id);
      return true;
    } catch (error) {
      logError('InventorySync.updateInventoryItem', error);
      return false;
    }
  }

  /**
   * Удалить элемент из инвентаря
   */
  async deleteInventoryItem(
    spreadsheetId: string,
    inventoryId: string
  ): Promise<boolean> {
    this.checkGapi();
    this.ensureToken();

    try {
      // Найти строку с нужным inventory_id
      const inventory = await this.getInventory(spreadsheetId);
      const rowIndex = inventory.findIndex(i => i.inventory_id === inventoryId);
      
      if (rowIndex === -1) {
        logError('InventorySync.deleteInventoryItem', `Inventory item not found: ${inventoryId}`);
        return false;
      }

      // Получить sheetId
      const sheetsResponse = await this.gapi.client.sheets.spreadsheets.get({
        spreadsheetId,
      });
      
      const sheets = sheetsResponse.result.sheets || [];
      const inventorySheet = sheets.find((s: any) => s.properties.title === SHEET_NAMES.INVENTORY);
      
      if (!inventorySheet) {
        throw new Error('Inventory sheet not found');
      }

      const sheetId = inventorySheet.properties.sheetId;
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

      console.log('Inventory item deleted:', inventoryId);
      return true;
    } catch (error) {
      logError('InventorySync.deleteInventoryItem', error);
      return false;
    }
  }

  /**
   * Обновить количество продукта в инвентаре
   */
  async updateQuantity(
    spreadsheetId: string,
    inventoryId: string,
    newQuantity: number
  ): Promise<boolean> {
    this.checkGapi();

    try {
      const inventory = await this.getInventory(spreadsheetId);
      const item = inventory.find(i => i.inventory_id === inventoryId);
      
      if (!item) {
        logError('InventorySync.updateQuantity', `Inventory item not found: ${inventoryId}`);
        return false;
      }

      item.quantity = newQuantity;
      return await this.updateInventoryItem(spreadsheetId, item);
    } catch (error) {
      logError('InventorySync.updateQuantity', error);
      return false;
    }
  }

  /**
   * Найти элементы инвентаря по product_id
   */
  async findByProductId(
    spreadsheetId: string,
    productId: string
  ): Promise<InventoryItem[]> {
    const inventory = await this.getInventory(spreadsheetId);
    return inventory.filter(item => item.product_id === productId);
  }

  /**
   * Получить просроченные продукты
   */
  async getExpiredItems(spreadsheetId: string): Promise<InventoryItemWithProduct[]> {
    const inventory = await this.getInventoryWithProducts(spreadsheetId);
    const today = new Date();
    
    return inventory.filter(item => {
      if (!item.expiry_date) return false;
      return new Date(item.expiry_date) < today;
    });
  }

  /**
   * Получить продукты, срок годности которых истекает скоро
   */
  async getExpiringSoonItems(
    spreadsheetId: string,
    daysThreshold: number = 3
  ): Promise<InventoryItemWithProduct[]> {
    const inventory = await this.getInventoryWithProducts(spreadsheetId);
    const today = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(today.getDate() + daysThreshold);
    
    return inventory.filter(item => {
      if (!item.expiry_date) return false;
      const expiryDate = new Date(item.expiry_date);
      return expiryDate >= today && expiryDate <= thresholdDate;
    });
  }

  /**
   * Получить общее количество продукта в инвентаре
   */
  async getTotalQuantityByProduct(
    spreadsheetId: string,
    productId: string
  ): Promise<number> {
    const items = await this.findByProductId(spreadsheetId, productId);
    return items.reduce((total, item) => total + item.quantity, 0);
  }
}

/**
 * Singleton instance
 */
let inventorySyncInstance: InventorySyncService | null = null;

export function getInventorySyncService(): InventorySyncService {
  if (!inventorySyncInstance) {
    inventorySyncInstance = new InventorySyncService();
  }
  return inventorySyncInstance;
}
