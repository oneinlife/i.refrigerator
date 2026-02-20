'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRecipes } from './useRecipes';
import { useGoogleApi } from '@/components/GoogleApiProvider';
import { getRecipeMatcherService } from '@/lib/recipeMatcher';
import { getInventorySyncService } from '@/lib/googleSheets/inventorySync';
import { storageService } from '@/lib/storageService';
import type { RecipeMatch } from '@/types/recipe';
import type { InventoryItemWithProduct } from '@/types/inventory';

/**
 * Хук для поиска рецептов по наличию продуктов в холодильнике
 */
export function useRecipeMatching() {
  const { recipes: allRecipes, loading: recipesLoading } = useRecipes();
  const { isAuthenticated, isInitialized } = useGoogleApi();
  const [inventory, setInventory] = useState<InventoryItemWithProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matcherService = useMemo(() => getRecipeMatcherService(), []);
  const inventoryService = useMemo(() => getInventorySyncService(), []);

  /**
   * Загрузить инвентарь с продуктами (JOIN)
   */
  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const spreadsheetId = storageService.getSpreadsheetId();
      if (!spreadsheetId) {
        throw new Error('Spreadsheet ID не настроен');
      }

      console.log('useRecipeMatching - loadInventory: fetching inventory...');
      const items = await inventoryService.getInventoryWithProducts(spreadsheetId);
      console.log('useRecipeMatching - loadInventory: loaded', items.length, 'items');
      setInventory(items);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(errorMessage);
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  }, [inventoryService]);

  /**
   * Сопоставить один конкретный рецепт с инвентарем
   */
  const matchRecipe = useCallback(
    async (recipeId: string): Promise<RecipeMatch | null> => {
      console.log('matchRecipe called:', {
        recipeId,
        allRecipesCount: allRecipes.length,
        inventoryCount: inventory.length,
        recipesLoading
      });
      
      try {
        const spreadsheetId = storageService.getSpreadsheetId();
        if (!spreadsheetId) {
          throw new Error('Spreadsheet ID не настроен');
        }

        // Найти рецепт
        const recipe = allRecipes.find(r => r.recipe_id === recipeId);
        if (!recipe) {
          console.error('Recipe not found in allRecipes:', recipeId, 'Available recipes:', allRecipes.map(r => r.recipe_id));
          return null;
        }
        
        console.log('Recipe found:', recipe.name);

        // Загрузить ингредиенты
        console.log('Loading ingredients for recipe...');
        const recipeProductsService = await import('@/lib/googleSheets/recipeProductsSync');
        const ingredients = await recipeProductsService
          .getRecipeProductsSyncService()
          .getIngredientsWithProducts(spreadsheetId, recipeId);

        console.log('Ingredients loaded:', ingredients.length);

        const recipeWithIngredients = {
          ...recipe,
          ingredients,
        };

        console.log('Calling matcherService.matchRecipe...');
        const result = matcherService.matchRecipe(recipeWithIngredients, inventory);
        console.log('matchRecipe result:', result);
        return result;
      } catch (err) {
        console.error(`Failed to match recipe ${recipeId}:`, err);
        return null;
      }
    },
    [allRecipes, inventory, matcherService, recipesLoading]
  );

  /**
   * Сопоставить все рецепты с текущим инвентарем
   */
  const matchAllRecipes = useCallback(async (): Promise<RecipeMatch[]> => {
    console.log('matchAllRecipes - called with:', {
      recipesCount: allRecipes.length,
      inventoryCount: inventory.length,
      recipesLoading
    });
    
    if (allRecipes.length === 0) {
      console.log('matchAllRecipes - no recipes, returning empty array');
      return [];
    }

    // Загружаем детали всех рецептов с ингредиентами
    const recipesWithIngredients = await Promise.all(
      allRecipes.map(async (recipe) => {
        // Здесь нужно загрузить ингредиенты для каждого рецепта
        // Используем getRecipeWithIngredients из useRecipes
        try {
          const spreadsheetId = storageService.getSpreadsheetId();
          if (!spreadsheetId) return null;

          const recipeProductsService = await import('@/lib/googleSheets/recipeProductsSync');
          const ingredients = await recipeProductsService
            .getRecipeProductsSyncService()
            .getIngredientsWithProducts(spreadsheetId, recipe.recipe_id);

          return {
            ...recipe,
            ingredients,
          };
        } catch (err) {
          console.error(`Failed to load ingredients for recipe ${recipe.recipe_id}:`, err);
          return null;
        }
      })
    );

    const validRecipes = recipesWithIngredients.filter(
      (r): r is NonNullable<typeof r> => r !== null
    );

    return matcherService.matchRecipes(validRecipes, inventory);
  }, [allRecipes, inventory, matcherService, recipesLoading]);

  /**
   * Получить рекомендованные рецепты (>=60% совпадения)
   */
  const getRecommendedRecipes = useCallback(
    async (limit: number = 10): Promise<RecipeMatch[]> => {
      const matches = await matchAllRecipes();
      return matcherService.getRecommendedRecipes(
        matches.map(m => m.recipe),
        inventory,
        limit
      );
    },
    [matchAllRecipes, inventory, matcherService]
  );

  /**
   * Получить рецепты, которые можно приготовить (все обязательные ингредиенты есть)
   */
  const getCookableRecipes = useCallback(async (): Promise<RecipeMatch[]> => {
    const matches = await matchAllRecipes();
    return matcherService.filterCookableRecipes(matches);
  }, [matchAllRecipes, matcherService]);

  /**
   * Найти рецепты по минимальному проценту совпадения
   */
  const findRecipesByMatchPercentage = useCallback(
    async (minPercentage: number): Promise<RecipeMatch[]> => {
      const matches = await matchAllRecipes();
      return matcherService.filterByMatchPercentage(matches, minPercentage);
    },
    [matchAllRecipes, matcherService]
  );

  /**
   * Найти рецепты по категории с учетом инвентаря
   */
  const findRecipesByCategory = useCallback(
    async (category: string): Promise<RecipeMatch[]> => {
      const matches = await matchAllRecipes();
      return matches.filter(match =>
        match.recipe.categories
          .toLowerCase()
          .split(',')
          .some(cat => cat.trim() === category.toLowerCase())
      );
    },
    [matchAllRecipes]
  );

  /**
   * Получить статистику по совпадению
   */
  const getMatchStatistics = useCallback(
    async () => {
      const matches = await matchAllRecipes();
      return matcherService.getMatchStatistics(matches);
    },
    [matchAllRecipes, matcherService]
  );

  /**
   * Сгруппировать рецепты по проценту совпадения
   */
  const groupRecipesByMatch = useCallback(async () => {
    const matches = await matchAllRecipes();
    return matcherService.groupByMatchPercentage(matches);
  }, [matchAllRecipes, matcherService]);

  // Автоматически загружаем инвентарь после инициализации API
  useEffect(() => {
    const spreadsheetId = storageService.getSpreadsheetId();
    console.log('useRecipeMatching - checking load conditions:', {
      spreadsheetId,
      isAuthenticated,
      isInitialized
    });

    if (isAuthenticated && isInitialized && spreadsheetId) {
      console.log('useRecipeMatching - loading inventory...');
      loadInventory();
    }
  }, [isAuthenticated, isInitialized, loadInventory]);

  return {
    inventory,
    loading: loading || recipesLoading,
    error,
    recipesCount: allRecipes.length,
    inventoryCount: inventory.length,
    isDataLoaded: allRecipes.length > 0 || inventory.length > 0,
    loadInventory,
    matchRecipe,
    matchAllRecipes,
    getRecommendedRecipes,
    getCookableRecipes,
    findRecipesByMatchPercentage,
    findRecipesByCategory,
    getMatchStatistics,
    groupRecipesByMatch,
  };
}
