'use client';

import type { Category, CreateCategoryInput } from '@/types/category';
import { SHEET_NAMES } from './sheetsManager';
import { logError } from '@/lib/errorLogger';
import { storageService } from '@/lib/storageService';

/**
 * Сервис синхронизации категорий рецептов с Google Sheets
 */
export class CategoriesSyncService {
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
   * Преобразовать строку из Google Sheets в Category
   */
  private rowToCategory(row: any[]): Category {
    return {
      category_id: row[0] || '',
      name: row[1] || '',
      type: (row[2] as 'predefined' | 'custom') || 'custom',
      usage_count: Number(row[3]) || 0,
      created_date: row[4] || new Date().toISOString(),
    };
  }

  /**
   * Преобразовать Category в строку для Google Sheets
   */
  private categoryToRow(category: Category): any[] {
    return [
      category.category_id,
      category.name,
      category.type,
      category.usage_count,
      category.created_date,
    ];
  }

  /**
   * Получить все категории
   */
  async getCategories(spreadsheetId: string): Promise<Category[]> {
    // Мягкая проверка - если API не готов, возвращаем пустой массив
    if (!this.isApiReady()) {
      console.warn('Google Sheets API not ready yet');
      return [];
    }

    this.ensureToken();

    try {
      const response = await this.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_NAMES.CATEGORIES}!A2:E`,
      });

      const rows = response.result.values || [];
      
      return rows.map((row: any[]) => this.rowToCategory(row));
    } catch (error) {
      logError('CategoriesSync.getCategories', error);
      return [];
    }
  }

  /**
   * Получить категорию по ID
   */
  async getCategoryById(
    spreadsheetId: string,
    categoryId: string
  ): Promise<Category | null> {
    const categories = await this.getCategories(spreadsheetId);
    return categories.find(c => c.category_id === categoryId) || null;
  }

  /**
   * Получить категорию по имени
   */
  async getCategoryByName(
    spreadsheetId: string,
    name: string
  ): Promise<Category | null> {
    const categories = await this.getCategories(spreadsheetId);
    return categories.find(c => c.name.toLowerCase() === name.toLowerCase()) || null;
  }

  /**
   * Добавить новую категорию
   */
  async addCategory(
    spreadsheetId: string,
    input: CreateCategoryInput
  ): Promise<Category> {
    this.checkGapi();
    this.ensureToken();

    // Проверим, не существует ли уже такая категория
    const existing = await this.getCategoryByName(spreadsheetId, input.name);
    if (existing) {
      console.log('Category already exists:', input.name);
      return existing;
    }

    const category: Category = {
      category_id: crypto.randomUUID(),
      ...input,
      usage_count: 0,
      created_date: new Date().toISOString(),
    };

    const row = this.categoryToRow(category);

    try {
      await this.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${SHEET_NAMES.CATEGORIES}!A2`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [row],
        },
      });

      console.log('Category added:', category.category_id, category.name);
      return category;
    } catch (error) {
      logError('CategoriesSync.addCategory', error);
      throw new Error('Failed to add category');
    }
  }

  /**
   * Удалить категорию
   */
  async deleteCategory(
    spreadsheetId: string,
    categoryId: string
  ): Promise<boolean> {
    this.checkGapi();
    this.ensureToken();

    try {
      const categories = await this.getCategories(spreadsheetId);
      const index = categories.findIndex(c => c.category_id === categoryId);

      if (index === -1) {
        logError('CategoriesSync.deleteCategory', `Category not found: ${categoryId}`);
        return false;
      }

      // Удаление строки через API
      const sheetIdResponse = await this.gapi.client.sheets.spreadsheets.get({
        spreadsheetId,
        ranges: [SHEET_NAMES.CATEGORIES],
      });

      const categorySheetId = sheetIdResponse.result.sheets[0].properties.sheetId;

      await this.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: categorySheetId,
                  dimension: 'ROWS',
                  startIndex: index + 1, // +1 для заголовка
                  endIndex: index + 2,
                },
              },
            },
          ],
        },
      });

      console.log('Category deleted:', categoryId);
      return true;
    } catch (error) {
      logError('CategoriesSync.deleteCategory', error);
      return false;
    }
  }

  /**
   * Переименовать категорию
   */
  async renameCategory(
    spreadsheetId: string,
    categoryId: string,
    newName: string
  ): Promise<boolean> {
    this.checkGapi();
    this.ensureToken();

    try {
      const categories = await this.getCategories(spreadsheetId);
      const index = categories.findIndex(c => c.category_id === categoryId);

      if (index === -1) {
        logError('CategoriesSync.renameCategory', `Category not found: ${categoryId}`);
        return false;
      }

      // Проверим, не существует ли уже категория с таким именем
      const existingByName = categories.find(c => 
        c.name.toLowerCase() === newName.toLowerCase() && c.category_id !== categoryId
      );
      
      if (existingByName) {
        logError('CategoriesSync.renameCategory', `Category with this name already exists: ${newName}`);
        return false;
      }

      const updatedCategory: Category = {
        ...categories[index],
        name: newName,
      };

      const row = this.categoryToRow(updatedCategory);
      const rowNumber = index + 2; // +2 для заголовка и индексации с 1

      await this.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_NAMES.CATEGORIES}!A${rowNumber}:E${rowNumber}`,
        valueInputOption: 'RAW',
        resource: {
          values: [row],
        },
      });

      console.log('Category renamed:', categoryId, newName);
      return true;
    } catch (error) {
      logError('CategoriesSync.renameCategory', error);
      return false;
    }
  }

  /**
   * Увеличить счетчик использования категории
   */
  async incrementUsageCount(
    spreadsheetId: string,
    categoryName: string
  ): Promise<void> {
    this.checkGapi();

    try {
      const categories = await this.getCategories(spreadsheetId);
      const index = categories.findIndex(c => 
        c.name.toLowerCase() === categoryName.toLowerCase()
      );

      if (index === -1) {
        console.log('Category not found for increment:', categoryName);
        return;
      }

      const updatedCategory: Category = {
        ...categories[index],
        usage_count: categories[index].usage_count + 1,
      };

      const row = this.categoryToRow(updatedCategory);
      const rowNumber = index + 2;

      await this.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_NAMES.CATEGORIES}!A${rowNumber}:E${rowNumber}`,
        valueInputOption: 'RAW',
        resource: {
          values: [row],
        },
      });

      console.log('Category usage count incremented:', categoryName);
    } catch (error) {
      logError('CategoriesSync.incrementUsageCount', error);
    }
  }

  /**
   * Получить наиболее используемые категории
   */
  async getMostUsedCategories(
    spreadsheetId: string,
    limit: number = 10
  ): Promise<Category[]> {
    const categories = await this.getCategories(spreadsheetId);
    
    return categories
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, limit);
  }
}

/**
 * Singleton instance
 */
let categoriesSyncService: CategoriesSyncService | null = null;

/**
 * Получить экземпляр сервиса синхронизации категорий
 */
export function getCategoriesSyncService(): CategoriesSyncService {
  if (!categoriesSyncService) {
    categoriesSyncService = new CategoriesSyncService();
  }
  return categoriesSyncService;
}
