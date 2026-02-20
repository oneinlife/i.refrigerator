'use client';

import { SHEET_NAMES } from './sheetsManager';
import type { Recipe } from '@/types/recipe';
import { logError } from '@/lib/errorLogger';
import { storageService } from '@/lib/storageService';

/**
 * RecipesSync - Сервис синхронизации рецептов с Google Sheets
 * Управляет CRUD операциями для листа Recipes
 */
class RecipesSync {
  private readonly SHEET_NAME = SHEET_NAMES.RECIPES;

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
   * Получить все рецепты
   */
  async getAllRecipes(spreadsheetId: string): Promise<Recipe[]> {
    // Мягкая проверка - если API не готов, возвращаем пустой массив
    if (!this.isApiReady()) {
      console.warn('Google Sheets API not ready yet');
      return [];
    }

    this.ensureToken();

    try {
      const response = await this.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${this.SHEET_NAME}!A2:L`,
      });

      const rows = response.result.values || [];
      
      return rows.map((row: any[]) => this.rowToRecipe(row));
    } catch (error) {
      logError('RecipesSync.getAllRecipes', error);
      throw error;
    }
  }

  /**
   * Получить рецепт по ID
   */
  async getRecipeById(
    spreadsheetId: string,
    recipeId: string
  ): Promise<Recipe | null> {
    const recipes = await this.getAllRecipes(spreadsheetId);
    return recipes.find(r => r.recipe_id === recipeId) || null;
  }

  /**
   * Добавить новый рецепт
   */
  async addRecipe(
    spreadsheetId: string,
    recipe: Omit<Recipe, 'recipe_id' | 'created_date'>
  ): Promise<Recipe> {
    this.checkGapi();
    this.ensureToken();

    try {
      const newRecipe: Recipe = {
        ...recipe,
        recipe_id: crypto.randomUUID(),
        created_date: new Date().toISOString(),
      };

      const row = this.recipeToRow(newRecipe);

      await this.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${this.SHEET_NAME}!A2:L`,
        valueInputOption: 'RAW',
        resource: {
          values: [row],
        },
      });

      return newRecipe;
    } catch (error) {
      logError('RecipesSync.addRecipe', error);
      throw error;
    }
  }

  /**
   * Обновить рецепт
   */
  async updateRecipe(
    spreadsheetId: string,
    recipeId: string,
    updates: Partial<Omit<Recipe, 'recipe_id' | 'created_date'>>
  ): Promise<boolean> {
    this.checkGapi();
    this.ensureToken();

    try {
      const recipes = await this.getAllRecipes(spreadsheetId);
      const index = recipes.findIndex(r => r.recipe_id === recipeId);

      if (index === -1) {
        logError('RecipesSync.updateRecipe', `Recipe not found: ${recipeId}`);
        return false;
      }

      const updatedRecipe: Recipe = {
        ...recipes[index],
        ...updates,
      };

      const row = this.recipeToRow(updatedRecipe);
      const rowNumber = index + 2; // +2 для заголовка и индексации с 1

      await this.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${this.SHEET_NAME}!A${rowNumber}:L${rowNumber}`,
        valueInputOption: 'RAW',
        resource: {
          values: [row],
        },
      });

      return true;
    } catch (error) {
      logError('RecipesSync.updateRecipe', error);
      throw error;
    }
  }

  /**
   * Удалить рецепт
   */
  async deleteRecipe(
    spreadsheetId: string,
    recipeId: string
  ): Promise<boolean> {
    this.checkGapi();
    this.ensureToken();

    try {
      const recipes = await this.getAllRecipes(spreadsheetId);
      const index = recipes.findIndex(r => r.recipe_id === recipeId);

      if (index === -1) {
        logError('RecipesSync.deleteRecipe', `Recipe not found: ${recipeId}`);
        return false;
      }

      const rowNumber = index + 2; // +2 для заголовка и индексации с 1

      // Получить sheetId для листа Recipes
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
      logError('RecipesSync.deleteRecipe', error);
      throw error;
    }
  }

  /**
   * Поиск рецептов по названию или категориям
   */
  async searchRecipes(
    spreadsheetId: string,
    query: string
  ): Promise<Recipe[]> {
    const recipes = await this.getAllRecipes(spreadsheetId);
    const lowerQuery = query.toLowerCase();

    return recipes.filter(recipe => {
      return (
        recipe.name.toLowerCase().includes(lowerQuery) ||
        recipe.description?.toLowerCase().includes(lowerQuery) ||
        recipe.categories.toLowerCase().includes(lowerQuery) ||
        recipe.tags?.toLowerCase().includes(lowerQuery)
      );
    });
  }

  /**
   * Получить рецепты по категории
   */
  async getRecipesByCategory(
    spreadsheetId: string,
    category: string
  ): Promise<Recipe[]> {
    const recipes = await this.getAllRecipes(spreadsheetId);
    const lowerCategory = category.toLowerCase();

    return recipes.filter(recipe =>
      recipe.categories.toLowerCase().split(',').some(cat => cat.trim() === lowerCategory)
    );
  }

  /**
   * Обновить дату последнего использования рецепта
   */
  async updateLastUsedDate(
    spreadsheetId: string,
    recipeId: string
  ): Promise<boolean> {
    return this.updateRecipe(spreadsheetId, recipeId, {
      last_used_date: new Date().toISOString(),
    });
  }

  /**
   * Получить топ рецептов по последнему использованию
   */
  async getMostUsedRecipes(
    spreadsheetId: string,
    limit: number = 5
  ): Promise<Recipe[]> {
    const recipes = await this.getAllRecipes(spreadsheetId);
    
    return recipes
      .filter(r => r.last_used_date)
      .sort((a, b) => {
        const dateA = a.last_used_date ? new Date(a.last_used_date).getTime() : 0;
        const dateB = b.last_used_date ? new Date(b.last_used_date).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, limit);
  }

  /**
   * Преобразовать строку в объект Recipe
   */
  private rowToRecipe(row: any[]): Recipe {
    return {
      recipe_id: row[0] || '',
      name: row[1] || '',
      description: row[2] || undefined,
      servings: parseInt(row[3]) || 1,
      cooking_time: parseInt(row[4]) || 0,
      categories: row[5] || '',
      instructions: row[6] || '',
      image_url: row[7] || undefined,
      tags: row[8] || undefined,
      created_date: row[9] || new Date().toISOString(),
      last_used_date: row[10] || undefined,
    };
  }

  /**
   * Преобразовать объект Recipe в строку для Google Sheets
   */
  private recipeToRow(recipe: Recipe): any[] {
    return [
      recipe.recipe_id,
      recipe.name,
      recipe.description || '',
      recipe.servings,
      recipe.cooking_time,
      recipe.categories,
      recipe.instructions,
      recipe.image_url || '',
      recipe.tags || '',
      recipe.created_date,
      recipe.last_used_date || '',
    ];
  }
}

// Экспорт singleton
let recipesSyncInstance: RecipesSync | null = null;

export function getRecipesSyncService(): RecipesSync {
  if (!recipesSyncInstance) {
    recipesSyncInstance = new RecipesSync();
  }
  return recipesSyncInstance;
}
