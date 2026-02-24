'use client';

import { logError } from '@/lib/errorLogger';

/**
 * SheetsManager - управление листами в Google Spreadsheet
 * Обеспечивает создание и управление всеми необходимыми листами для приложения
 */

export interface SheetInfo {
  /** ID листа */
  sheetId: number;
  
  /** Название листа */
  title: string;
  
  /** Индекс позиции */
  index: number;
  
  /** Количество строк */
  rowCount: number;
  
  /** Количество столбцов */
  columnCount: number;
}

/**
 * Структура всех листов приложения
 */
export const SHEET_NAMES = {
  INVENTORY: 'Inventory',
  PRODUCTS: 'Products',
  RECIPES: 'Recipes',
  RECIPE_PRODUCTS: 'RecipeProducts',
  SHOPPING_LIST: 'ShoppingList',
  CATEGORIES: 'Categories',
  RECIPE_MATCHES: 'RecipeMatches',
} as const;

/**
 * Заголовки колонок для каждого листа
 */
export const SHEET_HEADERS: Record<string, string[]> = {
  [SHEET_NAMES.INVENTORY]: [
    'inventory_id',
    'product_id',
    'quantity',
    'unit',
    'expiry_date',
    'added_date',
    'notes',
  ],
  [SHEET_NAMES.PRODUCTS]: [
    'product_id',
    'name',
    'default_unit',
    'aliases',
    'typical_shelf_life_days',
    'created_date',
    'usage_count',
  ],
  [SHEET_NAMES.RECIPES]: [
    'recipe_id',
    'name',
    'description',
    'servings',
    'cooking_time',
    'categories',
    'instructions',
    'image_url',
    'tags',
    'created_date',
    'last_used_date',
  ],
  [SHEET_NAMES.RECIPE_PRODUCTS]: [
    'recipe_product_id',
    'recipe_id',
    'product_id',
    'quantity',
    'unit',
    'optional',
    'notes',
  ],
  [SHEET_NAMES.SHOPPING_LIST]: [
    'shopping_item_id',
    'product_id',
    'recipe_id',
    'quantity_needed',
    'quantity_available',
    'quantity_to_buy',
    'unit',
    'checked',
    'added_date',
    'purchased_date',
  ],
  [SHEET_NAMES.CATEGORIES]: [
    'category_id',
    'name',
    'type',
    'usage_count',
    'created_date',
  ],
  [SHEET_NAMES.RECIPE_MATCHES]: [
    'recipe_id',
    'recipe_name',
    'recipe_description',
    'recipe_servings',
    'recipe_cooking_time',
    'recipe_categories',
    'recipe_image_url',
    'recipe_tags',
    'match_percentage',
    'available_ingredients_count',
    'missing_ingredients_count',
    'total_ingredients_count',
    'available_ingredients',
    'missing_ingredients',
    'can_cook',
    'last_updated',
  ],
};

export class SheetsManager {
  private gapi: any;

  constructor() {
    if (typeof window !== 'undefined') {
      this.gapi = (window as any).gapi;
    }
  }

  /**
   * Проверяет, что API инициализирован
   */
  private checkGapi(): void {
    if (!this.gapi?.client?.sheets) {
      throw new Error('Google Sheets API not initialized');
    }
  }

  /**
   * Получить информацию о всех листах в таблице
   */
  async getAllSheets(spreadsheetId: string): Promise<SheetInfo[]> {
    this.checkGapi();

    try {
      const response = await this.gapi.client.sheets.spreadsheets.get({
        spreadsheetId,
      });

      const sheets = response.result.sheets || [];
      return sheets.map((sheet: any) => ({
        sheetId: sheet.properties.sheetId,
        title: sheet.properties.title,
        index: sheet.properties.index,
        rowCount: sheet.properties.gridProperties.rowCount,
        columnCount: sheet.properties.gridProperties.columnCount,
      }));
    } catch (error) {
      logError('SheetsManager.getSheets', error);
      throw new Error('Failed to get sheets information');
    }
  }

  /**
   * Получить ID конкретного листа по имени
   */
  async getSheetId(spreadsheetId: string, sheetName: string): Promise<number | null> {
    const sheets = await this.getAllSheets(spreadsheetId);
    const sheet = sheets.find(s => s.title === sheetName);
    return sheet?.sheetId ?? null;
  }

  /**
   * Проверить, существует ли лист с заданным именем
   */
  async sheetExists(spreadsheetId: string, sheetName: string): Promise<boolean> {
    const sheetId = await this.getSheetId(spreadsheetId, sheetName);
    return sheetId !== null;
  }

  /**
   * Создать новый лист в таблице
   */
  async createSheet(
    spreadsheetId: string,
    sheetName: string,
    rowCount: number = 1000,
    columnCount: number = 26
  ): Promise<number> {
    this.checkGapi();

    try {
      const response = await this.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                  gridProperties: {
                    rowCount,
                    columnCount,
                  },
                },
              },
            },
          ],
        },
      });

      const sheetId = response.result.replies[0].addSheet.properties.sheetId;
      console.log(`Created sheet "${sheetName}" with ID ${sheetId}`);
      return sheetId;
    } catch (error) {
      logError(`SheetsManager.createSheet(${sheetName})`, error);
      throw new Error(`Failed to create sheet "${sheetName}"`);
    }
  }

  /**
   * Создать лист, если он не существует
   */
  async getOrCreateSheet(
    spreadsheetId: string,
    sheetName: string,
    headers?: string[]
  ): Promise<number> {
    const existingSheetId = await this.getSheetId(spreadsheetId, sheetName);
    
    if (existingSheetId !== null) {
      console.log(`Sheet "${sheetName}" already exists with ID ${existingSheetId}`);
      return existingSheetId;
    }

    const sheetId = await this.createSheet(spreadsheetId, sheetName);

    // Если указаны заголовки, записываем их
    if (headers && headers.length > 0) {
      await this.writeHeaders(spreadsheetId, sheetName, headers);
    }

    return sheetId;
  }

  /**
   * Записать заголовки в лист
   */
  async writeHeaders(
    spreadsheetId: string,
    sheetName: string,
    headers: string[]
  ): Promise<void> {
    this.checkGapi();

    try {
      await this.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        resource: {
          values: [headers],
        },
      });

      // Форматирование заголовков (жирный шрифт, заморозка строки)
      const sheetId = await this.getSheetId(spreadsheetId, sheetName);
      if (sheetId !== null) {
        await this.formatHeaders(spreadsheetId, sheetId);
      }

      console.log(`Headers written to "${sheetName}"`);
    } catch (error) {
      logError(`SheetsManager.writeHeaders(${sheetName})`, error);
      throw new Error(`Failed to write headers to "${sheetName}"`);
    }
  }

  /**
   * Форматировать заголовки (жирный шрифт, заморозка строки)
   */
  private async formatHeaders(spreadsheetId: string, sheetId: number): Promise<void> {
    this.checkGapi();

    try {
      await this.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            // Жирный шрифт для первой строки
            {
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: 0,
                  endRowIndex: 1,
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: {
                      bold: true,
                    },
                    backgroundColor: {
                      red: 0.9,
                      green: 0.9,
                      blue: 0.9,
                    },
                  },
                },
                fields: 'userEnteredFormat(textFormat,backgroundColor)',
              },
            },
            // Заморозка первой строки
            {
              updateSheetProperties: {
                properties: {
                  sheetId,
                  gridProperties: {
                    frozenRowCount: 1,
                  },
                },
                fields: 'gridProperties.frozenRowCount',
              },
            },
          ],
        },
      });
    } catch (error) {
      logError('SheetsManager.formatHeaders', error);
    }
  }

  /**
   * Создать все необходимые листы для приложения
   */
  async ensureAllSheetsExist(spreadsheetId: string): Promise<void> {
    console.log('Ensuring all sheets exist...');

    const sheets = Object.entries(SHEET_NAMES);
    
    for (const [key, sheetName] of sheets) {
      const headers = SHEET_HEADERS[sheetName as keyof typeof SHEET_HEADERS];
      await this.getOrCreateSheet(spreadsheetId, sheetName, headers);
    }

    console.log('All sheets are ready!');
  }

  /**
   * Удалить лист
   */
  async deleteSheet(spreadsheetId: string, sheetName: string): Promise<void> {
    this.checkGapi();

    const sheetId = await this.getSheetId(spreadsheetId, sheetName);
    if (sheetId === null) {
      console.log(`Sheet "${sheetName}" does not exist`);
      return;
    }

    try {
      await this.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            {
              deleteSheet: {
                sheetId,
              },
            },
          ],
        },
      });

      console.log(`Deleted sheet "${sheetName}"`);
    } catch (error) {
      logError(`SheetsManager.deleteSheet(${sheetName})`, error);
      throw new Error(`Failed to delete sheet "${sheetName}"`);
    }
  }

  /**
   * Очистить содержимое листа (оставить заголовки)
   */
  async clearSheet(spreadsheetId: string, sheetName: string): Promise<void> {
    this.checkGapi();

    try {
      await this.gapi.client.sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${sheetName}!A2:ZZ`,
      });

      console.log(`Cleared sheet "${sheetName}"`);
    } catch (error) {
      logError(`SheetsManager.clearSheet(${sheetName})`, error);
      throw new Error(`Failed to clear sheet "${sheetName}"`);
    }
  }
}

/**
 * Singleton instance
 */
let sheetsManagerInstance: SheetsManager | null = null;

export function getSheetsManager(): SheetsManager {
  if (!sheetsManagerInstance) {
    sheetsManagerInstance = new SheetsManager();
  }
  return sheetsManagerInstance;
}
