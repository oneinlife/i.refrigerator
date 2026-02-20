'use client';

import { useState, useEffect, useCallback } from 'react';
import { getRecipesSyncService } from '@/lib/googleSheets/recipesSync';
import { getRecipeProductsSyncService } from '@/lib/googleSheets/recipeProductsSync';
import { storageService } from '@/lib/storageService';
import { useGoogleApi } from '@/components/GoogleApiProvider';
import type { Recipe, RecipeWithIngredients, RecipeIngredient } from '@/types/recipe';

/**
 * Хук для работы с рецептами
 */
export function useRecipes() {
  const { isAuthenticated, isInitialized } = useGoogleApi();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recipesService = getRecipesSyncService();
  const recipeProductsService = getRecipeProductsSyncService();
  
  /**
   * Автозагрузка при монтировании и изменении авторизации
   */
  useEffect(() => {
    const spreadsheetId = storageService.getSpreadsheetId();
    console.log('useRecipes - checking load conditions:', {
      spreadsheetId: !!spreadsheetId,
      isAuthenticated,
      isInitialized,
    });
    
    // Загружаем только если API инициализирован, пользователь авторизован и есть spreadsheetId
    if (spreadsheetId && isAuthenticated && isInitialized) {
      console.log('useRecipes - loading recipes...');
      loadRecipes();
    } else {
      console.warn('useRecipes - NOT loading recipes. Missing:', {
        spreadsheetId: !spreadsheetId,
        notAuthenticated: !isAuthenticated,
        notInitialized: !isInitialized,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isInitialized]);

  /**
   * Загрузить все рецепты
   */
  const loadRecipes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const spreadsheetId = storageService.getSpreadsheetId();

      if (!spreadsheetId) {
        throw new Error('Spreadsheet ID не настроен');
      }

      console.log('useRecipes - loadRecipes: fetching recipes from spreadsheet...');
      const loadedRecipes = await recipesService.getAllRecipes(spreadsheetId);
      console.log('useRecipes - loadRecipes: loaded', loadedRecipes.length, 'recipes');
      setRecipes(loadedRecipes);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(errorMessage);
      console.error('Failed to load recipes:', err);
    } finally {
      setLoading(false);
    }
  }, [recipesService]);

  /**
   * Получить рецепт с ингредиентами (JOIN)
   */
  const getRecipeWithIngredients = useCallback(
    async (recipeId: string): Promise<RecipeWithIngredients | null> => {
      try {
        const spreadsheetId = storageService.getSpreadsheetId();

        if (!spreadsheetId) {
          throw new Error('Spreadsheet ID не настроен');
        }

        const recipe = await recipesService.getRecipeById(spreadsheetId, recipeId);
        if (!recipe) {
          return null;
        }

        const ingredients = await recipeProductsService.getIngredientsWithProducts(
          spreadsheetId,
          recipeId
        );

        return {
          ...recipe,
          ingredients,
        };
      } catch (err) {
        console.error('Failed to get recipe with ingredients:', err);
        return null;
      }
    },
    [recipesService, recipeProductsService]
  );

  /**
   * Добавить новый рецепт
   */
  const addRecipe = useCallback(
    async (
      recipe: Omit<Recipe, 'recipe_id' | 'created_date'>,
      ingredients: Omit<RecipeIngredient, 'recipe_product_id' | 'recipe_id'>[]
    ): Promise<Recipe | null> => {
      try {
        const spreadsheetId = storageService.getSpreadsheetId();

        if (!spreadsheetId) {
          throw new Error('Spreadsheet ID не настроен');
        }

        // Добавить рецепт
        const newRecipe = await recipesService.addRecipe(spreadsheetId, recipe);

        // Добавить ингредиенты
        if (ingredients.length > 0) {
          const ingredientsWithRecipeId = ingredients.map(ing => ({
            ...ing,
            recipe_id: newRecipe.recipe_id,
          }));

          await recipeProductsService.addIngredientsBatch(
            spreadsheetId,
            ingredientsWithRecipeId
          );
        }

        // Обновить список
        await loadRecipes();

        return newRecipe;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
        setError(errorMessage);
        console.error('Failed to add recipe:', err);
        return null;
      }
    },
    [recipesService, recipeProductsService, loadRecipes]
  );

  /**
   * Обновить рецепт
   */
  const updateRecipe = useCallback(
    async (
      recipeId: string,
      updates: Partial<Omit<Recipe, 'recipe_id' | 'created_date'>>,
      ingredientsUpdate?: Omit<RecipeIngredient, 'recipe_product_id' | 'recipe_id'>[]
    ): Promise<boolean> => {
      try {
        const spreadsheetId = storageService.getSpreadsheetId();

        if (!spreadsheetId) {
          throw new Error('Spreadsheet ID не настроен');
        }

        // Обновить основные данные рецепта
        const success = await recipesService.updateRecipe(spreadsheetId, recipeId, updates);

        if (!success) {
          return false;
        }

        // Если переданы новые ингредиенты - заменить их
        if (ingredientsUpdate) {
          await recipeProductsService.replaceRecipeIngredients(
            spreadsheetId,
            recipeId,
            ingredientsUpdate
          );
        }

        // Обновить список
        await loadRecipes();

        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
        setError(errorMessage);
        console.error('Failed to update recipe:', err);
        return false;
      }
    },
    [recipesService, recipeProductsService, loadRecipes]
  );

  /**
   * Удалить рецепт
   */
  const deleteRecipe = useCallback(
    async (recipeId: string): Promise<boolean> => {
      try {
        const spreadsheetId = storageService.getSpreadsheetId();

        if (!spreadsheetId) {
          throw new Error('Spreadsheet ID не настроен');
        }

        // Удалить все ингредиенты рецепта
        await recipeProductsService.deleteIngredientsByRecipeId(spreadsheetId, recipeId);

        // Удалить рецепт
        const success = await recipesService.deleteRecipe(spreadsheetId, recipeId);

        if (!success) {
          return false;
        }

        // Обновить список
        await loadRecipes();

        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
        setError(errorMessage);
        console.error('Failed to delete recipe:', err);
        return false;
      }
    },
    [recipesService, recipeProductsService, loadRecipes]
  );

  /**
   * Поиск рецептов
   */
  const searchRecipes = useCallback(
    async (query: string): Promise<Recipe[]> => {
      try {
        const spreadsheetId = storageService.getSpreadsheetId();

        if (!spreadsheetId) {
          throw new Error('Spreadsheet ID не настроен');
        }

        return await recipesService.searchRecipes(spreadsheetId, query);
      } catch (err) {
        console.error('Failed to search recipes:', err);
        return [];
      }
    },
    [recipesService]
  );

  /**
   * Получить рецепты по категории
   */
  const getRecipesByCategory = useCallback(
    async (category: string): Promise<Recipe[]> => {
      try {
        const spreadsheetId = storageService.getSpreadsheetId();

        if (!spreadsheetId) {
          throw new Error('Spreadsheet ID не настроен');
        }

        return await recipesService.getRecipesByCategory(spreadsheetId, category);
      } catch (err) {
        console.error('Failed to get recipes by category:', err);
        return [];
      }
    },
    [recipesService]
  );

  /**
   * Обновить дату последнего использования
   */
  const markRecipeAsUsed = useCallback(
    async (recipeId: string): Promise<boolean> => {
      try {
        const spreadsheetId = storageService.getSpreadsheetId();

        if (!spreadsheetId) {
          throw new Error('Spreadsheet ID не настроен');
        }

        const success = await recipesService.updateLastUsedDate(spreadsheetId, recipeId);
        
        if (success) {
          await loadRecipes();
        }

        return success;
      } catch (err) {
        console.error('Failed to mark recipe as used:', err);
        return false;
      }
    },
    [recipesService, loadRecipes]
  );

  /**
   * Получить уникальные категории из всех рецептов
   */
  const getAllCategories = useCallback((): string[] => {
    const categoriesSet = new Set<string>();

    recipes.forEach(recipe => {
      const cats = recipe.categories.split(',').map(c => c.trim());
      cats.forEach(cat => {
        if (cat) {
          categoriesSet.add(cat);
        }
      });
    });

    return Array.from(categoriesSet).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [recipes]);

  /**
   * Получить топ рецептов по использованию
   */
  const getMostUsedRecipes = useCallback(
    (limit: number = 5): Recipe[] => {
      return recipes
        .filter(r => r.last_used_date)
        .sort((a, b) => {
          const dateA = a.last_used_date ? new Date(a.last_used_date).getTime() : 0;
          const dateB = b.last_used_date ? new Date(b.last_used_date).getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, limit);
    },
    [recipes]
  );

  // Загрузить рецепты при монтировании
  useEffect(() => {
    if (isAuthenticated) {
      loadRecipes();
    }
  }, [loadRecipes, isAuthenticated]);

  return {
    recipes,
    loading,
    error,
    loadRecipes,
    getRecipeWithIngredients,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    searchRecipes,
    getRecipesByCategory,
    markRecipeAsUsed,
    getAllCategories,
    getMostUsedRecipes,
  };
}
