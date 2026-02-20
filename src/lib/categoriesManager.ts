'use client';

import { getAllSuggestedCategories, isPredefinedCategory } from '@/types/category';
import type { Category, CreateCategoryInput } from '@/types/category';
import { getCategoriesSyncService } from './googleSheets/categoriesSync';
import { storageService } from './storageService';

/**
 * Менеджер категорий рецептов
 * Обеспечивает работу с категориями, подсказки и управление
 */
export class CategoriesManager {
  private syncService = getCategoriesSyncService();
  private cachedCategories: Category[] = [];
  private lastFetch: number = 0;
  private CACHE_DURATION = 5 * 60 * 1000; // 5 минут

  /**
   * Получить все категории (предустановленные + пользовательские)
   */
  async getAllCategories(): Promise<string[]> {
    const spreadsheetId = storageService.getSpreadsheetId();
    if (!spreadsheetId) {
      return getAllSuggestedCategories();
    }

    try {
      // Обновить кеш при необходимости
      if (Date.now() - this.lastFetch > this.CACHE_DURATION) {
        this.cachedCategories = await this.syncService.getCategories(spreadsheetId);
        this.lastFetch = Date.now();
      }

      // Объединить предустановленные и пользовательские категории
      const predefined = getAllSuggestedCategories();
      const custom = this.cachedCategories
        .filter(c => c.type === 'custom')
        .map(c => c.name);

      return [...predefined, ...custom];
    } catch (error) {
      console.error('Failed to get categories:', error);
      return getAllSuggestedCategories();
    }
  }

  /**
   * Получить категории с детальной информацией
   */
  async getCategoriesWithDetails(): Promise<Category[]> {
    const spreadsheetId = storageService.getSpreadsheetId();
    if (!spreadsheetId) {
      return [];
    }

    try {
      if (Date.now() - this.lastFetch > this.CACHE_DURATION) {
        this.cachedCategories = await this.syncService.getCategories(spreadsheetId);
        this.lastFetch = Date.now();
      }

      return this.cachedCategories;
    } catch (error) {
      console.error('Failed to get categories with details:', error);
      return [];
    }
  }

  /**
   * Подсказать категории на основе поискового запроса
   */
  async suggestCategories(query: string, limit: number = 10): Promise<string[]> {
    const allCategories = await this.getAllCategories();
    
    if (!query || query.trim() === '') {
      // Если нет запроса, вернуть самые популярные
      return this.getMostUsedCategories(limit);
    }

    const lowerQuery = query.toLowerCase();
    
    // Фильтр по совпадению с началом или содержанием
    const filtered = allCategories.filter(cat =>
      cat.toLowerCase().includes(lowerQuery)
    );

    // Сортировка: сначала те, что начинаются с запроса
    filtered.sort((a, b) => {
      const aStarts = a.toLowerCase().startsWith(lowerQuery);
      const bStarts = b.toLowerCase().startsWith(lowerQuery);
      
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      return a.localeCompare(b, 'ru');
    });

    return filtered.slice(0, limit);
  }

  /**
   * Получить наиболее используемые категории
   */
  async getMostUsedCategories(limit: number = 10): Promise<string[]> {
    const spreadsheetId = storageService.getSpreadsheetId();
    if (!spreadsheetId) {
      // Вернуть первые N предустановленных категорий
      return getAllSuggestedCategories().slice(0, limit);
    }

    try {
      const mostUsed = await this.syncService.getMostUsedCategories(spreadsheetId, limit);
      return mostUsed.map(c => c.name);
    } catch (error) {
      console.error('Failed to get most used categories:', error);
      return getAllSuggestedCategories().slice(0, limit);
    }
  }

  /**
   * Добавить новую пользовательскую категорию
   */
  async addCustomCategory(name: string): Promise<Category | null> {
    const spreadsheetId = storageService.getSpreadsheetId();
    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID не настроен');
    }

    // Проверка, не является ли уже предустановленной
    if (isPredefinedCategory(name)) {
      console.log('Category is predefined:', name);
      // Не создаем дубликат, но можем вернуть как успешный результат
      return null;
    }

    try {
      const input: CreateCategoryInput = {
        name: name.trim(),
        type: 'custom',
      };

      const category = await this.syncService.addCategory(spreadsheetId, input);
      
      // Сбросить кеш
      this.lastFetch = 0;
      
      return category;
    } catch (error) {
      console.error('Failed to add custom category:', error);
      return null;
    }
  }

  /**
   * Удалить пользовательскую категорию
   */
  async deleteCategory(categoryId: string): Promise<boolean> {
    const spreadsheetId = storageService.getSpreadsheetId();
    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID не настроен');
    }

    try {
      const success = await this.syncService.deleteCategory(spreadsheetId, categoryId);
      
      if (success) {
        // Сбросить кеш
        this.lastFetch = 0;
      }
      
      return success;
    } catch (error) {
      console.error('Failed to delete category:', error);
      return false;
    }
  }

  /**
   * Переименовать категорию
   */
  async renameCategory(categoryId: string, newName: string): Promise<boolean> {
    const spreadsheetId = storageService.getSpreadsheetId();
    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID не настроен');
    }

    try {
      const success = await this.syncService.renameCategory(
        spreadsheetId,
        categoryId,
        newName.trim()
      );
      
      if (success) {
        // Сбросить кеш
        this.lastFetch = 0;
      }
      
      return success;
    } catch (error) {
      console.error('Failed to rename category:', error);
      return false;
    }
  }

  /**
   * Обновить счетчики использования для категорий рецепта
   */
  async updateUsageCounts(categories: string[]): Promise<void> {
    const spreadsheetId = storageService.getSpreadsheetId();
    if (!spreadsheetId) {
      return;
    }

    try {
      // Инкрементировать счетчики для всех категорий
      await Promise.all(
        categories.map(cat =>
          this.syncService.incrementUsageCount(spreadsheetId, cat)
        )
      );
      
      // Сбросить кеш
      this.lastFetch = 0;
    } catch (error) {
      console.error('Failed to update usage counts:', error);
    }
  }

  /**
   * Сбросить кеш категорий
   */
  clearCache(): void {
    this.lastFetch = 0;
    this.cachedCategories = [];
  }
}

/**
 * Singleton instance
 */
let categoriesManager: CategoriesManager | null = null;

/**
 * Получить экземпляр менеджера категорий
 */
export function getCategoriesManager(): CategoriesManager {
  if (!categoriesManager) {
    categoriesManager = new CategoriesManager();
  }
  return categoriesManager;
}
