'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useGoogleApi } from '@/components/GoogleApiProvider';
import { getRecipeMatchesSyncService } from '@/lib/googleSheets/recipeMatchesSync';
import { storageService } from '@/lib/storageService';
import type { RecipeMatch } from '@/types/recipe';

/**
 * Хук для получения результатов подбора рецептов из Google Sheets
 * Данные рассчитываются автоматически Google Apps Script
 */
export function useRecipeMatching() {
  const { isAuthenticated, isInitialized } = useGoogleApi();
  const [matches, setMatches] = useState<RecipeMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const matchesService = useMemo(() => getRecipeMatchesSyncService(), []);

  /**
   * Загрузить все результаты подбора рецептов из Google Sheets
   * @param forceRefresh Принудительное обновление
   * @param limit Количество записей для загрузки
   * @param offset Смещение
   */
  const loadMatches = useCallback(async (forceRefresh: boolean = false, limit: number = 20, offset: number = 0) => {
    setLoading(true);
    setError(null);

    try {
      const spreadsheetId = storageService.getSpreadsheetId();
      if (!spreadsheetId) {
        throw new Error('Spreadsheet ID не настроен');
      }

      // Если требуется принудительное обновление, очищаем кэш
      if (forceRefresh) {
        console.log('🔄 Force refresh - clearing cache');
        matchesService.clearAllCache();
      }

      console.log(`📊 Loading recipe matches from Google Sheets (limit: ${limit}, offset: ${offset})...`);
      const [allMatches, updateTime] = await Promise.all([
        matchesService.getAllMatches(spreadsheetId, limit, offset),
        matchesService.getLastUpdateTime(spreadsheetId),
      ]);
      
      console.log(`✅ Loaded ${allMatches.length} recipe matches`);
      setMatches(allMatches);
      setLastUpdate(updateTime);
      
      return allMatches;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(errorMessage);
      console.error('Failed to load recipe matches:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [matchesService]);

  /**
   * Сопоставить один конкретный рецепт с инвентарем
   */
  const matchRecipe = useCallback(
    async (recipeId: string): Promise<RecipeMatch | null> => {
      console.log('matchRecipe called:', { recipeId });
      
      // Сначала пытаемся найти в уже загруженных данных
      const existing = matches.find(m => m.recipe.recipe_id === recipeId);
      if (existing) {
        return existing;
      }

      // Если нет в загруженных, загружаем все и ищем
      await loadMatches();
      return matches.find(m => m.recipe.recipe_id === recipeId) || null;
    },
    [matches, loadMatches]
  );

  /**
   * Получить все результаты подбора рецептов
   * @param limit Количество записей для загрузки
   * @param offset Смещение
   */
  const matchAllRecipes = useCallback(async (limit: number = 20, offset: number = 0): Promise<RecipeMatch[]> => {
    // Загружаем с указанными параметрами пагинации
    return await loadMatches(false, limit, offset);
  }, [loadMatches]);

  /**
   * Получить рекомендованные рецепты (>=60% совпадения)
   */
  const getRecommendedRecipes = useCallback(
    async (limit: number = 10): Promise<RecipeMatch[]> => {
      const allMatches = await matchAllRecipes();
      return allMatches
        .filter(m => m.match_percentage >= 60)
        .slice(0, limit);
    },
    [matchAllRecipes]
  );

  /**
   * Получить рецепты, которые можно приготовить (все обязательные ингредиенты есть)
   */
  const getCookableRecipes = useCallback(async (): Promise<RecipeMatch[]> => {
    const spreadsheetId = storageService.getSpreadsheetId();
    if (!spreadsheetId) return [];
    
    return matchesService.getCookableMatches(spreadsheetId);
  }, [matchesService]);

  /**
   * Найти рецепты по минимальному проценту совпадения
   */
  const findRecipesByMatchPercentage = useCallback(
    async (minPercentage: number): Promise<RecipeMatch[]> => {
      const allMatches = await matchAllRecipes();
      return allMatches.filter(m => m.match_percentage >= minPercentage);
    },
    [matchAllRecipes]
  );

  /**
   * Найти рецепты по категории с учетом инвентаря
   */
  const findRecipesByCategory = useCallback(
    async (category: string): Promise<RecipeMatch[]> => {
      const allMatches = await matchAllRecipes();
      return allMatches.filter(match =>
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
      const spreadsheetId = storageService.getSpreadsheetId();
      if (!spreadsheetId) {
        return { total: 0, canCook: 0, averageMatch: 0, perfectMatches: 0 };
      }
      
      return matchesService.getStatistics(spreadsheetId);
    },
    [matchesService]
  );

  /**
   * Сгруппировать рецепты по проценту совпадения
   */
  const groupRecipesByMatch = useCallback(async () => {
    const spreadsheetId = storageService.getSpreadsheetId();
    if (!spreadsheetId) {
      return { perfect: [], high: [], medium: [], low: [] };
    }
    
    return matchesService.getGroupedMatches(spreadsheetId);
  }, [matchesService]);

  return {
    matches,
    loading,
    error,
    lastUpdate,
    loadMatches,
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
