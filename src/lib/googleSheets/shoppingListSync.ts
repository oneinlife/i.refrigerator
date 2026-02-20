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
 */
class ShoppingListSync {
  private readonly SHEET_NAME = SHEET_NAMES.SHOPPING_LIST;

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
   * Устанавливает токен авторизации для API
   */
  private ensureToken(): void {
    const token = storageService.getGoogleToken();
    if (token && this.gapi?.client) {
      this.gapi.client.setToken({ access_token: token });
    }
  }

  /**
   * Получить все элементы списка покупок
   */
  async getAllItems(spreadsheetId: string): Promise<ShoppingListItem[]> {
    this.checkGapi();
    this.ensureToken();

    try {
      const response = await this.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${this.SHEET_NAME}!A2:J`,
      });

      const rows = response.result.values || [];
      
      return rows.map((row: any[]) => this.rowToShoppingListItem(row));
    } catch (error) {
      logError('ShoppingListSync.getAllItems', error);
      throw error;
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
        range: `${this.SHEET_NAME}!A2:J`,
        valueInputOption: 'RAW',
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
        range: `${this.SHEET_NAME}!A2:J`,
        valueInputOption: 'RAW',
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
        range: `${this.SHEET_NAME}!A${rowNumber}:J${rowNumber}`,
        valueInputOption: 'RAW',
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
        range: `${this.SHEET_NAME}!A${rowNumber}:J${rowNumber}`,
        valueInputOption: 'RAW',
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

      // Получить sheetId
      const spreadsheet = await this.gapi.client.sheets.spreadsheets.get({
        spreadsheetId,
      });

      const sheet = spreadsheet.result.sheets?.find(
        (s: any) => s.properties?.title === this.SHEET_NAME
      );

      if (!sheet || !sheet.properties?.sheetId) {
        throw new Error('Sheet not found');
      }

      await this.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: sheet.properties.sheetId,
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
   * Удалить все элементы по recipe_id
   */
  async deleteItemsByRecipeId(
    spreadsheetId: string,
    recipeId: string
  ): Promise<boolean> {
    try {
      const items = await this.getItemsByRecipeId(spreadsheetId, recipeId);
      
      for (const item of items) {
        await this.deleteItem(spreadsheetId, item.shopping_item_id);
      }

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

      for (const item of items) {
        await this.deleteItem(spreadsheetId, item.shopping_item_id);
      }

      return items.length;
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
