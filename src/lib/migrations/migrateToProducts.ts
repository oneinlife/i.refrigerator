'use client';

import type { Product, CreateProductInput } from '@/types/product';
import type { InventoryItem, LegacyInventoryItem } from '@/types/inventory';
import { getSheetsManager, SHEET_NAMES } from '../googleSheets/sheetsManager';

/**
 * Результат миграции
 */
export interface MigrationResult {
  success: boolean;
  message: string;
  productsCreated: number;
  inventoryItemsUpdated: number;
  errors: string[];
}

/**
 * Статус миграции
 */
export interface MigrationStatus {
  isCompleted: boolean;
  completedAt?: string;
  version: string;
}

const MIGRATION_STATUS_KEY = 'migration_to_products_completed';

/**
 * Проверить, была ли выполнена миграция
 */
export function isMigrationCompleted(): boolean {
  if (typeof window === 'undefined') return false;
  
  const status = localStorage.getItem(MIGRATION_STATUS_KEY);
  if (!status) return false;
  
  try {
    const parsed: MigrationStatus = JSON.parse(status);
    return parsed.isCompleted;
  } catch {
    return false;
  }
}

/**
 * Пометить миграцию как выполненную
 */
export function markMigrationCompleted(): void {
  const status: MigrationStatus = {
    isCompleted: true,
    completedAt: new Date().toISOString(),
    version: '1.0.0',
  };
  localStorage.setItem(MIGRATION_STATUS_KEY, JSON.stringify(status));
}

/**
 * Сбросить статус миграции (для тестирования)
 */
export function resetMigrationStatus(): void {
  localStorage.removeItem(MIGRATION_STATUS_KEY);
}

/**
 * Миграция данных из старого формата в новый с Products
 */
export class MigrationService {
  private gapi: any;
  private sheetsManager: ReturnType<typeof getSheetsManager>;

  constructor() {
    if (typeof window !== 'undefined') {
      this.gapi = (window as any).gapi;
    }
    this.sheetsManager = getSheetsManager();
  }

  /**
   * Выполнить миграцию данных
   */
  async migrate(spreadsheetId: string): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      message: '',
      productsCreated: 0,
      inventoryItemsUpdated: 0,
      errors: [],
    };

    try {
      // 1. Проверить, что миграция еще не выполнялась
      if (isMigrationCompleted()) {
        result.message = 'Migration already completed';
        result.success = true;
        return result;
      }

      // 2. Создать резервную копию старых данных
      console.log('Creating backup...');
      await this.createBackup(spreadsheetId);

      // 3. Убедиться, что все новые листы созданы
      console.log('Ensuring sheets exist...');
      await this.sheetsManager.ensureAllSheetsExist(spreadsheetId);

      // 4. Прочитать старый Inventory
      console.log('Reading legacy inventory...');
      const legacyInventory = await this.readLegacyInventory(spreadsheetId);
      
      if (legacyInventory.length === 0) {
        console.log('No legacy data found, skipping migration');
        result.message = 'No legacy data found';
        result.success = true;
        markMigrationCompleted();
        return result;
      }

      // 5. Извлечь уникальные продукты
      console.log('Extracting unique products...');
      const products = this.extractUniqueProducts(legacyInventory);
      
      // 6. Создать Products в новом листе
      console.log(`Creating ${products.length} products...`);
      const productMap = await this.createProducts(spreadsheetId, products);
      result.productsCreated = products.length;

      // 7. Обновить Inventory с product_id
      console.log('Updating inventory with product_id...');
      const updatedInventory = this.migrateInventoryItems(legacyInventory, productMap);
      await this.writeNewInventory(spreadsheetId, updatedInventory);
      result.inventoryItemsUpdated = updatedInventory.length;

      // 8. Пометить миграцию как выполненную
      markMigrationCompleted();

      result.success = true;
      result.message = `Migration completed successfully. Created ${result.productsCreated} products, updated ${result.inventoryItemsUpdated} inventory items.`;
      
      console.log('Migration completed!');
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMessage);
      result.message = `Migration failed: ${errorMessage}`;
      console.error('Migration failed:', error);
      return result;
    }
  }

  /**
   * Создать резервную копию старых данных
   */
  private async createBackup(spreadsheetId: string): Promise<void> {
    try {
      const backupSheetName = `Inventory_Backup_${new Date().toISOString().split('T')[0]}`;
      
      // Проверить, существует ли старый Inventory
      const inventoryExists = await this.sheetsManager.sheetExists(spreadsheetId, 'Inventory');
      if (!inventoryExists) {
        console.log('No inventory to backup');
        return;
      }

      // Прочитать данные из старого Inventory
      const response = await this.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Inventory!A:H',
      });

      const values = response.result.values || [];
      if (values.length === 0) {
        console.log('Inventory is empty, no backup needed');
        return;
      }

      // Создать лист для резервной копии
      await this.sheetsManager.createSheet(spreadsheetId, backupSheetName);

      // Записать данные в резервную копию
      await this.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${backupSheetName}!A1`,
        valueInputOption: 'RAW',
        resource: { values },
      });

      console.log(`Backup created: ${backupSheetName}`);
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw new Error('Failed to create backup');
    }
  }

  /**
   * Прочитать данные из старого формата Inventory
   */
  private async readLegacyInventory(spreadsheetId: string): Promise<LegacyInventoryItem[]> {
    try {
      const response = await this.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Inventory!A2:H', // Пропускаем заголовки
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
    } catch (error) {
      console.error('Failed to read legacy inventory:', error);
      return [];
    }
  }

  /**
   * Извлечь уникальные продукты из старого инвентаря
   */
  private extractUniqueProducts(inventory: LegacyInventoryItem[]): CreateProductInput[] {
    const productMap = new Map<string, CreateProductInput>();

    inventory.forEach(item => {
      const productKey = `${item.name.toLowerCase()}_${item.category}`;
      
      if (!productMap.has(productKey)) {
        productMap.set(productKey, {
          name: item.name,
          category: item.category,
          default_unit: item.unit,
          usage_count: 1,
        });
      } else {
        // Увеличиваем счетчик использования
        const product = productMap.get(productKey)!;
        product.usage_count++;
      }
    });

    return Array.from(productMap.values());
  }

  /**
   * Создать продукты в листе Products и вернуть маппинг name -> product_id
   */
  private async createProducts(
    spreadsheetId: string,
    products: CreateProductInput[]
  ): Promise<Map<string, string>> {
    const productMap = new Map<string, string>();
    const rows: any[][] = [];

    products.forEach(product => {
      const product_id = crypto.randomUUID();
      const created_date = new Date().toISOString();
      
      rows.push([
        product_id,
        product.name,
        product.category,
        product.default_unit,
        product.aliases || '',
        product.typical_shelf_life_days || '',
        created_date,
        product.usage_count,
      ]);

      // Создаем ключ для маппинга (name + category)
      const key = `${product.name.toLowerCase()}_${product.category}`;
      productMap.set(key, product_id);
    });

    // Записать все продукты в лист Products
    await this.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_NAMES.PRODUCTS}!A2`,
      valueInputOption: 'RAW',
      resource: { values: rows },
    });

    return productMap;
  }

  /**
   * Преобразовать старые inventory items в новый формат
   */
  private migrateInventoryItems(
    legacyItems: LegacyInventoryItem[],
    productMap: Map<string, string>
  ): InventoryItem[] {
    return legacyItems.map(item => {
      const productKey = `${item.name.toLowerCase()}_${item.category}`;
      const product_id = productMap.get(productKey) || crypto.randomUUID();

      return {
        inventory_id: item.id,
        product_id,
        quantity: item.quantity,
        unit: item.unit,
        expiry_date: item.expiryDate,
        added_date: item.addedDate,
        notes: item.notes,
      };
    });
  }

  /**
   * Записать обновленный инвентарь в новый формат
   */
  private async writeNewInventory(
    spreadsheetId: string,
    inventory: InventoryItem[]
  ): Promise<void> {
    const rows = inventory.map(item => [
      item.inventory_id,
      item.product_id,
      item.quantity,
      item.unit,
      item.expiry_date || '',
      item.added_date,
      item.notes || '',
    ]);

    // Очистить старые данные
    await this.sheetsManager.clearSheet(spreadsheetId, SHEET_NAMES.INVENTORY);

    // Записать новые данные
    await this.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_NAMES.INVENTORY}!A2`,
      valueInputOption: 'RAW',
      resource: { values: rows },
    });
  }
}

/**
 * Singleton instance
 */
let migrationServiceInstance: MigrationService | null = null;

export function getMigrationService(): MigrationService {
  if (!migrationServiceInstance) {
    migrationServiceInstance = new MigrationService();
  }
  return migrationServiceInstance;
}
