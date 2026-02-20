'use client';

import { SHEET_NAMES } from './sheetsManager';
import { getProductsSyncService } from './productsSync';
import { logError } from '@/lib/errorLogger';
import { storageService } from '@/lib/storageService';
import type { RecipeIngredient, RecipeIngredientWithProduct } from '@/types/recipe';

/**
 * RecipeProductsSync - Сервис синхронизации ингредиентов рецептов с Google Sheets
 * Управляет CRUD операциями для листа RecipeProducts
 */
class RecipeProductsSync {
  private readonly SHEET_NAME = SHEET_NAMES.RECIPE_PRODUCTS;

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
   * Получить все связи рецептов и продуктов
   */
  async getAllRecipeProducts(spreadsheetId: string): Promise<RecipeIngredient[]> {
    this.checkGapi();
    this.ensureToken();

    try {
      const response = await this.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${this.SHEET_NAME}!A2:H`,
      });

      const rows = response.result.values || [];
      
      return rows.map((row: any[]) => this.rowToRecipeIngredient(row));
    } catch (error) {
      logError('RecipeProductsSync.getAllRecipeProducts', error);
      throw error;
    }
  }

  /**
   * Получить ингредиенты для конкретного рецепта
   */
  async getIngredientsByRecipeId(
    spreadsheetId: string,
    recipeId: string
  ): Promise<RecipeIngredient[]> {
    const allIngredients = await this.getAllRecipeProducts(spreadsheetId);
    return allIngredients.filter(ing => ing.recipe_id === recipeId);
  }

  /**
   * Получить ингредиенты с данными о продуктах (JOIN)
   */
  async getIngredientsWithProducts(
    spreadsheetId: string,
    recipeId: string
  ): Promise<RecipeIngredientWithProduct[]> {
    const ingredients = await this.getIngredientsByRecipeId(spreadsheetId, recipeId);
    const productsService = getProductsSyncService();
    const products = await productsService.getAllProducts(spreadsheetId);

    return ingredients
      .map(ingredient => {
        const product = products.find(p => p.product_id === ingredient.product_id);
        if (!product) {
          console.warn(`Product not found for ingredient: ${ingredient.product_id}`);
          return null;
        }

        return {
          ...ingredient,
          product,
        } as RecipeIngredientWithProduct;
      })
      .filter((item): item is RecipeIngredientWithProduct => item !== null);
  }

  /**
   * Добавить ингредиент к рецепту
   */
  async addIngredient(
    spreadsheetId: string,
    ingredient: Omit<RecipeIngredient, 'recipe_product_id'>
  ): Promise<RecipeIngredient> {
    this.checkGapi();
    this.ensureToken();

    try {
      const newIngredient: RecipeIngredient = {
        ...ingredient,
        recipe_product_id: crypto.randomUUID(),
      };

      const row = this.recipeIngredientToRow(newIngredient);

      await this.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${this.SHEET_NAME}!A2:H`,
        valueInputOption: 'RAW',
        resource: {
          values: [row],
        },
      });

      return newIngredient;
    } catch (error) {
      logError('RecipeProductsSync.addIngredient', error);
      throw error;
    }
  }

  /**
   * Добавить множество ингредиентов (batch)
   */
  async addIngredientsBatch(
    spreadsheetId: string,
    ingredients: Omit<RecipeIngredient, 'recipe_product_id'>[]
  ): Promise<RecipeIngredient[]> {
    this.checkGapi();
    this.ensureToken();

    try {
      const newIngredients: RecipeIngredient[] = ingredients.map(ing => ({
        ...ing,
        recipe_product_id: crypto.randomUUID(),
      }));

      const rows = newIngredients.map(ing => this.recipeIngredientToRow(ing));

      await this.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${this.SHEET_NAME}!A2:H`,
        valueInputOption: 'RAW',
        resource: {
          values: rows,
        },
      });

      return newIngredients;
    } catch (error) {
      logError('RecipeProductsSync.addIngredientsBatch', error);
      throw error;
    }
  }

  /**
   * Обновить ингредиент
   */
  async updateIngredient(
    spreadsheetId: string,
    recipeProductId: string,
    updates: Partial<Omit<RecipeIngredient, 'recipe_product_id'>>
  ): Promise<boolean> {
    this.checkGapi();
    this.ensureToken();

    try {
      const ingredients = await this.getAllRecipeProducts(spreadsheetId);
      const index = ingredients.findIndex(ing => ing.recipe_product_id === recipeProductId);

      if (index === -1) {
        logError('RecipeProductsSync.updateIngredient', `Ingredient not found: ${recipeProductId}`);
        return false;
      }

      const updatedIngredient: RecipeIngredient = {
        ...ingredients[index],
        ...updates,
      };

      const row = this.recipeIngredientToRow(updatedIngredient);
      const rowNumber = index + 2; // +2 для заголовка и индексации с 1

      await this.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${this.SHEET_NAME}!A${rowNumber}:H${rowNumber}`,
        valueInputOption: 'RAW',
        resource: {
          values: [row],
        },
      });

      return true;
    } catch (error) {
      logError('RecipeProductsSync.updateIngredient', error);
      throw error;
    }
  }

  /**
   * Удалить ингредиент
   */
  async deleteIngredient(
    spreadsheetId: string,
    recipeProductId: string
  ): Promise<boolean> {
    this.checkGapi();
    this.ensureToken();

    try {
      const ingredients = await this.getAllRecipeProducts(spreadsheetId);
      const index = ingredients.findIndex(ing => ing.recipe_product_id === recipeProductId);

      if (index === -1) {
        logError('RecipeProductsSync.deleteIngredient', `Ingredient not found: ${recipeProductId}`);
        return false;
      }

      const rowNumber = index + 2; // +2 для заголовка и индексации с 1

      // Получить sheetId для листа RecipeProducts
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
      logError('RecipeProductsSync.deleteIngredient', error);
      throw error;
    }
  }

  /**
   * Удалить все ингредиенты рецепта
   */
  async deleteIngredientsByRecipeId(
    spreadsheetId: string,
    recipeId: string
  ): Promise<boolean> {
    try {
      const ingredients = await this.getIngredientsByRecipeId(spreadsheetId, recipeId);
      
      // Удаляем по одному (можно оптимизировать через batch, но это сложнее)
      for (const ingredient of ingredients) {
        await this.deleteIngredient(spreadsheetId, ingredient.recipe_product_id);
      }

      return true;
    } catch (error) {
      logError('RecipeProductsSync.deleteIngredientsByRecipeId', error);
      throw error;
    }
  }

  /**
   * Заменить все ингредиенты рецепта
   */
  async replaceRecipeIngredients(
    spreadsheetId: string,
    recipeId: string,
    newIngredients: Omit<RecipeIngredient, 'recipe_product_id' | 'recipe_id'>[]
  ): Promise<RecipeIngredient[]> {
    try {
      // Удаляем старые
      await this.deleteIngredientsByRecipeId(spreadsheetId, recipeId);

      // Добавляем новые
      const ingredientsWithRecipeId = newIngredients.map(ing => ({
        ...ing,
        recipe_id: recipeId,
      }));

      return await this.addIngredientsBatch(spreadsheetId, ingredientsWithRecipeId);
    } catch (error) {
      logError('RecipeProductsSync.replaceRecipeIngredients', error);
      throw error;
    }
  }

  /**
   * Преобразовать строку в объект RecipeIngredient
   */
  private rowToRecipeIngredient(row: any[]): RecipeIngredient {
    return {
      recipe_product_id: row[0] || '',
      recipe_id: row[1] || '',
      product_id: row[2] || '',
      quantity: parseFloat(row[3]) || 0,
      unit: row[4] || '',
      optional: row[5] === 'TRUE' || row[5] === true,
      notes: row[6] || undefined,
    };
  }

  /**
   * Преобразовать объект RecipeIngredient в строку для Google Sheets
   */
  private recipeIngredientToRow(ingredient: RecipeIngredient): any[] {
    return [
      ingredient.recipe_product_id,
      ingredient.recipe_id,
      ingredient.product_id,
      ingredient.quantity,
      ingredient.unit,
      ingredient.optional ? 'TRUE' : 'FALSE',
      ingredient.notes || '',
    ];
  }
}

// Экспорт singleton
let recipeProductsSyncInstance: RecipeProductsSync | null = null;

export function getRecipeProductsSyncService(): RecipeProductsSync {
  if (!recipeProductsSyncInstance) {
    recipeProductsSyncInstance = new RecipeProductsSync();
  }
  return recipeProductsSyncInstance;
}
