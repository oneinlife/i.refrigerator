'use client';

import { SHEET_NAMES } from './sheetsManager';
import { logError } from '@/lib/errorLogger';
import { storageService } from '@/lib/storageService';
import type { ShoppingListItem, ShoppingListItemWithDetails, CreateShoppingItemInput } from '@/types/shopping';
import type { Product } from '@/types/product';

/**
 * ShoppingListSync - сервис синхронизации списка покупок с Google Sheets
 * 
 * Структура Google Sheets (ShoppingList):
 * A: shopping_item_id
 * B: product_id (FK → Products)
 * C: recipe_id (optional, FK → Recipes)
 * D: quantity_needed
 * E: quantity_available
 * F: quantity_to_buy
 * G: unit
 * H: checked (boolean)
 * I: added_date
 * J: purchased_date (optional)
 * K: product_name (формула: =IFERROR(INDEX(Products!B:B, MATCH(B2, Products!A:A, 0)), "Unknown Product"))
 */
class ShoppingListSync {
  private readonly SHEET_NAME = SHEET_NAMES.SHOPPING_LIST;
  private sheetIdCache: number | null = null; // Кэш для sheetId

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
      throw new Error('Google Sheets API not initialized');
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
   * Получить sheetId листа (с кэшированием)
   */
  private async getSheetId(spreadsheetId: string): Promise<number> {
    // Возвращаем из кэша, если уже загружали
    if (this.sheetIdCache !== null) {
      return this.sheetIdCache;
    }

    // Загружаем метаданные таблицы
    const spreadsheet = await this.gapi.client.sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheet = spreadsheet.result.sheets?.find(
      (s: any) => s.properties?.title === this.SHEET_NAME
    );

    if (!sheet || sheet.properties?.sheetId === undefined) {
      throw new Error(`Sheet "${this.SHEET_NAME}" not found`);
    }

    // Сохраняем в кэш и возвращаем
    const sheetId = sheet.properties.sheetId as number;
    this.sheetIdCache = sheetId;
    return sheetId;
  }

  /**
   * Получить все элементы списка покупок
   */
  async getAllItems(spreadsheetId: string): Promise<ShoppingListItem[]> {
    // Мягкая проверка - если API не готов, возвращаем пустой массив
    if (!this.isApiReady()) {
      console.warn('⚠️ Google Sheets API not ready yet');
      return [];
    }

    this.ensureToken();

    try {
      const response = await this.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${this.SHEET_NAME}!A2:K`,
      });

      const rows = response.result.values || [];
      
      return rows.map((row: any[]) => this.rowToShoppingListItem(row));
    } catch (error) {
      logError('ShoppingListSync.getAllItems', error);
      console.error('❌ Failed to load shopping list:', error);
      return [];
    }
  }

  /**
   * Получить элементы списка покупок по recipe_id
   */
  async getItemsByRecipeId(
    spreadsheetId: string,
    recipeId: string
  ): Promise<ShoppingListItem[]> {
    const allItems = await this.getAllItems(spreadsheetId);
    return allItems.filter(item => item.recipe_id === recipeId);
  }

  /**
   * Получить непокупленные (непомеченные) элементы
   */
  async getUncheckedItems(spreadsheetId: string): Promise<ShoppingListItem[]> {
    const allItems = await this.getAllItems(spreadsheetId);
    return allItems.filter(item => !item.checked);
  }

  /**
   * Получить покупленные (помеченные) элементы
   */
  async getCheckedItems(spreadsheetId: string): Promise<ShoppingListItem[]> {
    const allItems = await this.getAllItems(spreadsheetId);
    return allItems.filter(item => item.checked);
  }

  /**
   * Добавить элемент в список покупок
   */
  async addItem(
    spreadsheetId: string,
    input: CreateShoppingItemInput
  ): Promise<ShoppingListItem> {
    this.checkGapi();
    this.ensureToken();

    try {
      const newItem: ShoppingListItem = {
        shopping_item_id: crypto.randomUUID(),
        ...input,
        checked: input.checked ?? false,
        added_date: new Date().toISOString(),
        purchased_date: undefined,
      };

      const row = this.shoppingListItemToRow(newItem);

      await this.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${this.SHEET_NAME}!A2:K`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [row],
        },
      });

      return newItem;
    } catch (error) {
      logError('ShoppingListSync.addItem', error);
      throw error;
    }
  }

  /**
   * Добавить несколько элементов (batch)
   */
  async addItemsBatch(
    spreadsheetId: string,
    inputs: CreateShoppingItemInput[]
  ): Promise<ShoppingListItem[]> {
    this.checkGapi();
    this.ensureToken();

    try {
      const newItems: ShoppingListItem[] = inputs.map(input => ({
        shopping_item_id: crypto.randomUUID(),
        ...input,
        checked: input.checked ?? false,
        added_date: new Date().toISOString(),
        purchased_date: undefined,
      }));

      const rows = newItems.map(item => this.shoppingListItemToRow(item));

      await this.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${this.SHEET_NAME}!A2:K`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: rows,
        },
      });

      return newItems;
    } catch (error) {
      logError('ShoppingListSync.addItemsBatch', error);
      throw error;
    }
  }

  /**
   * Отметить элемент как купленный
   */
  async markAsChecked(
    spreadsheetId: string,
    shoppingItemId: string
  ): Promise<boolean> {
    this.checkGapi();
    this.ensureToken();

    try {
      const items = await this.getAllItems(spreadsheetId);
      const index = items.findIndex(item => item.shopping_item_id === shoppingItemId);

      if (index === -1) {
        logError('ShoppingListSync.markAsChecked', `Shopping list item not found: ${shoppingItemId}`);
        return false;
      }

      const updatedItem: ShoppingListItem = {
        ...items[index],
        checked: true,
        purchased_date: new Date().toISOString(),
      };

      const row = this.shoppingListItemToRow(updatedItem);
      const rowNumber = index + 2; // +2 для заголовка и индексации с 1

      await this.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${this.SHEET_NAME}!A${rowNumber}:K${rowNumber}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [row],
        },
      });

      return true;
    } catch (error) {
      logError('ShoppingListSync.markAsChecked', error);
      throw error;
    }
  }

  /**
   * Снять отметку с покупки
   */
  async unmarkChecked(
    spreadsheetId: string,
    shoppingItemId: string
  ): Promise<boolean> {
    this.checkGapi();
    this.ensureToken();

    try {
      const items = await this.getAllItems(spreadsheetId);
      const index = items.findIndex(item => item.shopping_item_id === shoppingItemId);

      if (index === -1) {
        logError('ShoppingListSync.unmarkChecked', `Shopping list item not found: ${shoppingItemId}`);
        return false;
      }

      const updatedItem: ShoppingListItem = {
        ...items[index],
        checked: false,
        purchased_date: undefined,
      };

      const row = this.shoppingListItemToRow(updatedItem);
      const rowNumber = index + 2;

      await this.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${this.SHEET_NAME}!A${rowNumber}:K${rowNumber}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [row],
        },
      });

      return true;
    } catch (error) {
      logError('ShoppingListSync.unmarkChecked', error);
      throw error;
    }
  }

  /**
   * Удалить элемент из списка покупок
   */
  async deleteItem(
    spreadsheetId: string,
    shoppingItemId: string
  ): Promise<boolean> {
    this.checkGapi();
    this.ensureToken();

    try {
      const items = await this.getAllItems(spreadsheetId);
      const index = items.findIndex(item => item.shopping_item_id === shoppingItemId);

      if (index === -1) {
        logError('ShoppingListSync.deleteItem', `Shopping list item not found: ${shoppingItemId}`);
        return false;
      }

      const rowNumber = index + 2;

      // Получить sheetId (с кэшированием)
      const sheetId = await this.getSheetId(spreadsheetId);

      await this.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: sheetId,
                  dimension: 'ROWS',
                  startIndex: rowNumber - 1,
                  endIndex: rowNumber,
                },
              },
            },
          ],
        },
      });

      return true;
    } catch (error) {
      logError('ShoppingListSync.deleteItem', error);
      throw error;
    }
  }

  /**
   * Удалить несколько элементов одним запросом (batch)
   */
  async deleteItemsBatch(
    spreadsheetId: string,
    shoppingItemIds: string[]
  ): Promise<number> {
    if (shoppingItemIds.length === 0) {
      return 0;
    }

    this.checkGapi();
    this.ensureToken();

    try {
      const items = await this.getAllItems(spreadsheetId);
      
      // Находим индексы всех элементов для удаления
      const rowsToDelete: number[] = [];
      for (const id of shoppingItemIds) {
        const index = items.findIndex(item => item.shopping_item_id === id);
        if (index !== -1) {
          rowsToDelete.push(index + 2); // +2 для заголовка и индексации с 1
        }
      }

      if (rowsToDelete.length === 0) {
        return 0;
      }

      // Сортируем в обратном порядке, чтобы удалять снизу вверх
      // Это важно, чтобы индексы не смещались при удалении
      rowsToDelete.sort((a, b) => b - a);

      // Получить sheetId (с кэшированием)
      const sheetId = await this.getSheetId(spreadsheetId);

      // Создаем запросы на удаление для каждой строки
      const requests = rowsToDelete.map(rowNumber => ({
        deleteDimension: {
          range: {
            sheetId: sheetId,
            dimension: 'ROWS',
            startIndex: rowNumber - 1,
            endIndex: rowNumber,
          },
        },
      }));

      // Отправляем один batch запрос со всеми удалениями
      await this.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests,
        },
      });

      return rowsToDelete.length;
    } catch (error) {
      logError('ShoppingListSync.deleteItemsBatch', error);
      throw error;
    }
  }

  /**
   * Удалить все элементы по recipe_id
   */
  async deleteItemsByRecipeId(
    spreadsheetId: string,
    recipeId: string
  ): Promise<boolean> {
    try {
      const items = await this.getItemsByRecipeId(spreadsheetId, recipeId);
      
      if (items.length === 0) {
        return true;
      }

      // Используем batch удаление для производительности
      const itemIds = items.map(item => item.shopping_item_id);
      await this.deleteItemsBatch(spreadsheetId, itemIds);

      return true;
    } catch (error) {
      logError('ShoppingListSync.deleteItemsByRecipeId', error);
      throw error;
    }
  }

  /**
   * Очистить купленные элементы (удалить отмеченные)
   */
  async clearChecked(spreadsheetId: string): Promise<number> {
    try {
      const items = await this.getCheckedItems(spreadsheetId);

      if (items.length === 0) {
        return 0;
      }

      // Используем batch удаление для производительности
      const itemIds = items.map(item => item.shopping_item_id);
      const deletedCount = await this.deleteItemsBatch(spreadsheetId, itemIds);

      return deletedCount;
    } catch (error) {
      logError('ShoppingListSync.clearChecked', error);
      throw error;
    }
  }

  /**
   * Преобразовать строку в ShoppingListItem
   */
  private rowToShoppingListItem(row: any[]): ShoppingListItem {
    return {
      shopping_item_id: row[0] || '',
      product_id: row[1] || '',
      product_name: row[10] || undefined,
      recipe_id: row[2] || undefined,
      quantity_needed: parseFloat(row[3]) || 0,
      quantity_available: parseFloat(row[4]) || 0,
      quantity_to_buy: parseFloat(row[5]) || 0,
      unit: row[6] || '',
      checked: row[7] === 'TRUE' || row[7] === true,
      added_date: row[8] || new Date().toISOString(),
      purchased_date: row[9] || undefined,
    };
  }

  /**
   * Преобразовать ShoppingListItem в строку для Google Sheets
   */
  private shoppingListItemToRow(item: ShoppingListItem): any[] {
    return [
      item.shopping_item_id,
      item.product_id,
      item.recipe_id || '',
      item.quantity_needed,
      item.quantity_available,
      item.quantity_to_buy,
      item.unit,
      item.checked ? 'TRUE' : 'FALSE',
      item.added_date,
      item.purchased_date || '',
      // Формула для автоматического заполнения названия продукта из таблицы Products
      // INDIRECT("B"&ROW()) получает значение product_id из столбца B текущей строки
      // Используем точку с запятой как разделитель аргументов (для русской локали Google Sheets)
      '=IFERROR(INDEX(Products!$B:$B; MATCH(INDIRECT("B"&ROW()); Products!$A:$A; 0)); "Unknown Product")',
    ];
  }
}

// Экспорт singleton
let shoppingListSyncInstance: ShoppingListSync | null = null;

export function getShoppingListSyncService(): ShoppingListSync {
  if (!shoppingListSyncInstance) {
    shoppingListSyncInstance = new ShoppingListSync();
  }
  return shoppingListSyncInstance;
}
