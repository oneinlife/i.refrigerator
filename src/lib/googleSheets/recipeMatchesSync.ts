'use client';

import { SHEET_NAMES } from './sheetsManager';
import { logError } from '@/lib/errorLogger';
import { storageService } from '@/lib/storageService';
import { getProductsSyncService } from './productsSync';
import type { RecipeMatch, RecipeIngredientWithProduct, RecipeWithIngredients } from '@/types/recipe';
import type { Product } from '@/types/product';

/**
 * RecipeMatchesSync - сервис синхронизации результатов подбора рецептов с Google Sheets
 * 
 * Читает данные из листа RecipeMatches, который заполняется Google Apps Script
 * 
 * Структура Google Sheets (RecipeMatches):
 * A: recipe_id
 * B: recipe_name
 * C: recipe_description
 * D: recipe_servings
 * E: recipe_cooking_time
 * F: recipe_categories
 * G: recipe_image_url
 * H: recipe_tags
 * I: match_percentage
 * J: available_ingredients_count
 * K: missing_ingredients_count
 * L: total_ingredients_count
 * M: available_ingredients (JSON)
 * N: missing_ingredients (JSON)
 * O: can_cook
 * P: last_updated
 */
class RecipeMatchesSync {
  private readonly SHEET_NAME = SHEET_NAMES.RECIPE_MATCHES;
  
  // Кэш справочника продуктов (переиспользуется для всех запросов на странице)
  private cachedProducts: Map<string, Product> | null = null;
  private cachedSpreadsheetId: string | null = null;
  
  // Кэш результатов RecipeMatches (чтобы не загружать несколько раз за сессию)
  private cachedMatches: RecipeMatch[] | null = null;
  private matchesCachedForSpreadsheetId: string | null = null;

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
   * Безопасный парсинг JSON
   */
  private parseJsonSafe(jsonString: string): any[] {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.warn('⚠️ Failed to parse JSON:', jsonString);
      return [];
    }
  }

  /**
   * Очищает кэш продуктов (например, при смене таблицы)
   */
  clearProductsCache(): void {
    console.log('🗑️ Clearing products cache');
    this.cachedProducts = null;
    this.cachedSpreadsheetId = null;
  }

  /**
   * Очищает весь кэш (продукты и результаты)
   */
  clearAllCache(): void {
    console.log('🗑️ Clearing all cache');
    this.cachedProducts = null;
    this.cachedSpreadsheetId = null;
    this.cachedMatches = null;
    this.matchesCachedForSpreadsheetId = null;
  }

  /**
   * Получить все результаты подбора рецептов
   * Возвращает полные данные RecipeMatch с информацией о рецептах и ингредиентах
   * @param spreadsheetId ID Google таблицы
   * @param limit Количество записей для загрузки (по умолчанию 20)
   * @param offset Смещение (с какой строки начинать, по умолчанию 0)
   */
  async getAllMatches(spreadsheetId: string, limit: number = 20, offset: number = 0): Promise<RecipeMatch[]> {

    // Мягкая проверка - если API не готов, возвращаем пустой массив
    if (!this.isApiReady()) {
      console.warn('⚠️ Google Sheets API not ready yet');
      return [];
    }

    this.ensureToken();

    try {
      console.log(`📊 Loading recipe matches from Google Sheets (limit: ${limit}, offset: ${offset})...`);
      
      // Вычисляем диапазон строк с учетом заголовка (строка 1)
      const startRow = 2 + offset; // +2 потому что строка 1 - заголовок, и индексы начинаются с 1
      const endRow = startRow + limit - 1;
      
      // Загружаем данные совпадений включая все поля рецептов и ингредиенты
      const response = await this.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${this.SHEET_NAME}!A${startRow}:P${endRow}`,
      });

      const rows = response.result.values || [];
      
      if (rows.length === 0) {
        console.log('⚠️ No more recipe matches');
        return [];
      }

      console.log(`📋 Loaded ${rows.length} recipe matches from sheet`);

      // Загружаем или используем кэшированные продукты
      let productsMap: Map<string, Product>;
      
      if (this.cachedProducts && this.cachedSpreadsheetId === spreadsheetId) {
        console.log('✨ Using cached products');
        productsMap = this.cachedProducts;
      } else {
        console.log('📦 Loading products from Google Sheets...');
        const productsSync = getProductsSyncService();
        const products = await productsSync.getAllProducts(spreadsheetId);
        console.log(`📦 Loaded ${products.length} products`);
        
        productsMap = new Map<string, Product>(
          products.map((p: Product) => [p.product_id, p])
        );
        
        // Кэшируем продукты для переиспользования
        this.cachedProducts = productsMap;
        this.cachedSpreadsheetId = spreadsheetId;
      }

      // Обогащаем базовые данные полной информацией
      const matches: RecipeMatch[] = [];
      
      for (const row of rows) {
        const recipeId = row[0];
        const recipeName = row[1];
        const recipeDescription = row[2] || '';
        const recipeServings = parseInt(row[3]) || 1;
        const recipeCookingTime = parseInt(row[4]) || 0;
        const recipeCategories = row[5] || '';
        const recipeImageUrl = row[6] || '';
        const recipeTags = row[7] || '';
        const matchPercentage = parseInt(row[8]) || 0;
        
        // Парсим JSON из столбцов M и N
        const availableIngredientsRaw = row[12] ? this.parseJsonSafe(row[12]) : [];
        const missingIngredientsRaw = row[13] ? this.parseJsonSafe(row[13]) : [];
        const canCook = row[14] === 'TRUE' || row[14] === true;

        // Обогащаем ингредиенты информацией о продуктах
        const availableIngredients: RecipeIngredientWithProduct[] = availableIngredientsRaw
          .map((ing: any) => {
            const product = productsMap.get(ing.product_id);
            if (!product) return null;
            
            return {
              product_id: ing.product_id,
              quantity: ing.quantity,
              unit: ing.unit,
              optional: ing.optional || false,
              product,
            };
          })
          .filter((ing): ing is RecipeIngredientWithProduct => ing !== null);

        const missingIngredients: RecipeIngredientWithProduct[] = missingIngredientsRaw
          .map((ing: any) => {
            const product = productsMap.get(ing.product_id);
            if (!product) return null;
            
            return {
              product_id: ing.product_id,
              quantity: ing.quantity,
              unit: ing.unit,
              optional: ing.optional || false,
              product,
            };
          })
          .filter((ing): ing is RecipeIngredientWithProduct => ing !== null);

        // Формируем missing_quantities для списка покупок
        const missingQuantities: RecipeMatch['missing_quantities'] = missingIngredientsRaw
          .map((ing: any) => {
            const product = productsMap.get(ing.product_id);
            if (!product) return null;
            
            const missing = Math.max(0, ing.quantity - (ing.available_quantity || 0));
            return {
              product_id: ing.product_id,
              product_name: product.name,
              missing,
              unit: ing.unit,
            };
          })
          .filter((q): q is NonNullable<typeof q> => q !== null);

        // Формируем объект рецепта из данных в RecipeMatches
        const recipe = {
          recipe_id: recipeId,
          name: recipeName,
          description: recipeDescription,
          servings: recipeServings,
          cooking_time: recipeCookingTime,
          categories: recipeCategories,
          instructions: '', // Не хранится в RecipeMatches
          image_url: recipeImageUrl,
          tags: recipeTags,
          created_date: '',
          last_used_date: '',
        };

        // Формируем полный объект рецепта с ингредиентами
        const recipeWithIngredients: RecipeWithIngredients = {
          ...recipe,
          ingredients: [...availableIngredients, ...missingIngredients],
        };

        matches.push({
          recipe: recipeWithIngredients,
          match_percentage: matchPercentage,
          available_ingredients: availableIngredients,
          missing_ingredients: missingIngredients,
          can_cook: canCook,
          missing_quantities: missingQuantities,
        });
      }

      console.log(`✅ Enriched ${matches.length} recipe matches with full data (all from RecipeMatches sheet)`);
      
      return matches;
    } catch (error) {
      logError('RecipeMatchesSync.getAllMatches', error);
      console.error('❌ Failed to load recipe matches:', error);
      return [];
    }
  }

  /**
   * Получить только те рецепты, которые можно приготовить
   */
  async getCookableMatches(spreadsheetId: string): Promise<RecipeMatch[]> {
    const allMatches = await this.getAllMatches(spreadsheetId);
    return allMatches.filter(match => match.can_cook);
  }

  /**
   * Получить статистику по совпадениям
   */
  async getStatistics(spreadsheetId: string): Promise<{
    total: number;
    canCook: number;
    averageMatch: number;
    perfectMatches: number;
  }> {
    const matches = await this.getAllMatches(spreadsheetId);
    
    const total = matches.length;
    const canCook = matches.filter(m => m.can_cook).length;
    const perfectMatches = matches.filter(m => m.match_percentage === 100).length;
    const averageMatch = total > 0 
      ? Math.round(matches.reduce((sum, m) => sum + m.match_percentage, 0) / total)
      : 0;

    return {
      total,
      canCook,
      averageMatch,
      perfectMatches,
    };
  }

  /**
   * Группировать рецепты по проценту совпадения
   */
  async getGroupedMatches(spreadsheetId: string): Promise<{
    perfect: RecipeMatch[];
    high: RecipeMatch[];
    medium: RecipeMatch[];
    low: RecipeMatch[];
  }> {
    const matches = await this.getAllMatches(spreadsheetId);
    
    return {
      perfect: matches.filter(m => m.match_percentage === 100),
      high: matches.filter(m => m.match_percentage >= 75 && m.match_percentage < 100),
      medium: matches.filter(m => m.match_percentage >= 50 && m.match_percentage < 75),
      low: matches.filter(m => m.match_percentage < 50),
    };
  }

  /**
   * Проверить, актуальны ли данные в RecipeMatches
   * Возвращает дату последнего обновления или null, если данных нет
   */
  async getLastUpdateTime(spreadsheetId: string): Promise<Date | null> {
    if (!this.isApiReady()) {
      return null;
    }

    this.ensureToken();

    try {
      const response = await this.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${this.SHEET_NAME}!P2`, // Обновлено на P2 (last_updated)
      });

      const value = response.result.values?.[0]?.[0];
      return value ? new Date(value) : null;
    } catch (error) {
      logError('RecipeMatchesSync.getLastUpdateTime', error);
      return null;
    }
  }
}

// Экспорт singleton
let recipeMatchesSyncInstance: RecipeMatchesSync | null = null;

export function getRecipeMatchesSyncService(): RecipeMatchesSync {
  if (!recipeMatchesSyncInstance) {
    recipeMatchesSyncInstance = new RecipeMatchesSync();
  }
  return recipeMatchesSyncInstance;
}
