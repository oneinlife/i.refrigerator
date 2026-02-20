'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRecipeMatching } from '@/hooks/useRecipeMatching';
import { logError } from '@/lib/errorLogger';
import type { RecipeMatch } from '@/types/recipe';

export default function RecipeSearchPage() {
  const {
    loading,
    error,
    recipesCount,
    inventoryCount,
    isDataLoaded,
    matchAllRecipes,
    getCookableRecipes,
    getMatchStatistics,
    groupRecipesByMatch,
  } = useRecipeMatching();

  const [matches, setMatches] = useState<RecipeMatch[]>([]);
  const [groupedMatches, setGroupedMatches] = useState<{
    perfect: RecipeMatch[];
    high: RecipeMatch[];
    medium: RecipeMatch[];
    low: RecipeMatch[];
  } | null>(null);
  const [statistics, setStatistics] = useState<{
    total: number;
    canCook: number;
    averageMatch: number;
    perfectMatches: number;
  } | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'cookable' | 'perfect' | 'high'>('all');
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const performSearch = useCallback(async () => {
    console.log('RecipeSearchPage - performSearch called');
    setSearchLoading(true);
    setHasSearched(true);
    try {
      console.log('RecipeSearchPage - calling matchAllRecipes...');
      const allMatches = await matchAllRecipes();
      console.log('RecipeSearchPage - matchAllRecipes returned:', allMatches.length, 'matches');
      
      const grouped = await groupRecipesByMatch();
      const stats = await getMatchStatistics();

      setMatches(allMatches);
      setGroupedMatches(grouped);
      setStatistics(stats);
    } catch (err) {
      logError('RecipeSearchPage.performSearch', err);
      console.error('RecipeSearchPage - performSearch error:', err);
    } finally {
      setSearchLoading(false);
    }
  }, [matchAllRecipes, groupRecipesByMatch, getMatchStatistics]);

  // Сбрасываем состояние поиска когда данные обновляются
  useEffect(() => {
    if (recipesCount > 0 || inventoryCount > 0) {
      console.log('RecipeSearchPage - data updated, resetting hasSearched');
      setHasSearched(false);
    }
  }, [recipesCount, inventoryCount]);

  // Автоматический поиск после загрузки данных
  useEffect(() => {
    console.log('RecipeSearchPage - checking if ready to search:', {
      loading,
      hasSearched,
      recipesCount,
      inventoryCount,
      isDataLoaded
    });
    
    // Запускаем поиск если данные загружены и есть рецепты, но еще не искали или hasSearched был сброшен
    if (!loading && !searchLoading && isDataLoaded && recipesCount > 0 && !hasSearched) {
      console.log('RecipeSearchPage - data loaded, performing search...');
      performSearch();
    }
  }, [loading, searchLoading, isDataLoaded, hasSearched, performSearch, recipesCount, inventoryCount]);

  const getFilteredMatches = (): RecipeMatch[] => {
    if (!groupedMatches) return [];

    switch (filterMode) {
      case 'cookable':
        return matches.filter(m => m.can_cook);
      case 'perfect':
        return groupedMatches.perfect;
      case 'high':
        return [...groupedMatches.perfect, ...groupedMatches.high];
      default:
        return matches;
    }
  };

  const filteredMatches = getFilteredMatches();

  const getMatchColor = (percentage: number): string => {
    if (percentage === 100) return 'bg-green-100 text-green-800 border-green-300';
    if (percentage >= 75) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (percentage >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  if (loading || searchLoading) {
    return (
      <main className="min-h-screen bg-gray-100 py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          <p className="text-center text-gray-500 text-lg">
            Поиск рецептов... (Рецептов: {recipesCount}, Товаров: {inventoryCount})
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-100 py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
            <p className="font-bold">Ошибка:</p>
            <p>{error}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 py-4 md:py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Заголовок */}
        <header className="mb-6 md:mb-8">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block"
          >
            ← Назад к инвентарю
          </Link>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold text-gray-800">
                🔍 Что приготовить?
              </h1>
              <p className="text-sm md:text-base text-gray-600 mt-2">
                Поиск рецептов на основе продуктов в холодильнике
              </p>
            </div>
            <button
              onClick={performSearch}
              disabled={searchLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
            >
              🔄 Обновить
            </button>
          </div>
        </header>

        {/* Статистика */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-gray-600 text-sm">Всего рецептов</div>
              <div className="text-3xl font-bold text-gray-800">{statistics.total}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-gray-600 text-sm">Можно приготовить</div>
              <div className="text-3xl font-bold text-green-600">{statistics.canCook}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-gray-600 text-sm">Идеальные (100%)</div>
              <div className="text-3xl font-bold text-blue-600">{statistics.perfectMatches}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-gray-600 text-sm">Среднее совпадение</div>
              <div className="text-3xl font-bold text-purple-600">{statistics.averageMatch}%</div>
            </div>
          </div>
        )}

        {/* Фильтры */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-4 py-2 rounded-lg transition ${
                filterMode === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Все рецепты ({matches.length})
            </button>
            <button
              onClick={() => setFilterMode('cookable')}
              className={`px-4 py-2 rounded-lg transition ${
                filterMode === 'cookable'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ✅ Можно готовить ({statistics?.canCook || 0})
            </button>
            <button
              onClick={() => setFilterMode('perfect')}
              className={`px-4 py-2 rounded-lg transition ${
                filterMode === 'perfect'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              💯 Идеальные ({groupedMatches?.perfect.length || 0})
            </button>
            <button
              onClick={() => setFilterMode('high')}
              className={`px-4 py-2 rounded-lg transition ${
                filterMode === 'high'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ⭐ Высокое совпадение (75%+)
            </button>
          </div>
        </div>

        {/* Список рецептов */}
        {filteredMatches.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg mb-4">
              {filterMode === 'cookable'
                ? 'Нет рецептов, которые можно приготовить прямо сейчас'
                : 'Рецепты не найдены'}
            </p>
            <p className="text-gray-400 text-sm mb-4">
              Рецептов в базе: {recipesCount}, Товаров в инвентаре: {inventoryCount}, Найдено совпадений: {matches.length}
            </p>
            <Link
              href="/recipes/new"
              className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Добавить рецепт
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredMatches.map((match) => (
              <div
                key={match.recipe.recipe_id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden"
              >
                <div className="p-6">
                  {/* Заголовок с процентом */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <Link
                        href={`/recipes/${match.recipe.recipe_id}`}
                        className="text-xl font-bold text-gray-800 hover:text-blue-600"
                      >
                        {match.recipe.name}
                      </Link>
                      {match.recipe.description && (
                        <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                          {match.recipe.description}
                        </p>
                      )}
                    </div>
                    <div className={`ml-4 px-3 py-1 rounded-full border-2 font-bold text-lg ${getMatchColor(match.match_percentage)}`}>
                      {match.match_percentage}%
                    </div>
                  </div>

                  {/* Информация */}
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <span>⏱️ {match.recipe.cooking_time} мин</span>
                    <span>👥 {match.recipe.servings} порц.</span>
                    {match.can_cook && (
                      <span className="text-green-600 font-medium">✅ Можно готовить!</span>
                    )}
                  </div>

                  {/* Категории */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {match.recipe.categories.split(',').slice(0, 3).map((cat, idx) => (
                      <span
                        key={idx}
                        className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
                      >
                        {cat.trim()}
                      </span>
                    ))}
                  </div>

                  {/* Ингредиенты */}
                  <div className="border-t pt-4">
                    <div className="space-y-2">
                      {/* Доступные ингредиенты */}
                      {match.available_ingredients.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-green-700 mb-1">
                            ✅ Есть в наличии ({match.available_ingredients.length}):
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {match.available_ingredients.slice(0, 5).map((ing) => (
                              <span
                                key={ing.recipe_product_id}
                                className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded"
                              >
                                {ing.product.name}
                              </span>
                            ))}
                            {match.available_ingredients.length > 5 && (
                              <span className="text-xs text-gray-500 px-2 py-1">
                                +{match.available_ingredients.length - 5}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Недостающие ингредиенты */}
                      {match.missing_ingredients.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-red-700 mb-1">
                            ❌ Не хватает ({match.missing_ingredients.length}):
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {match.missing_ingredients.slice(0, 5).map((ing) => (
                              <span
                                key={ing.recipe_product_id}
                                className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded"
                              >
                                {ing.product.name}
                                {ing.optional && ' (опц.)'}
                              </span>
                            ))}
                            {match.missing_ingredients.length > 5 && (
                              <span className="text-xs text-gray-500 px-2 py-1">
                                +{match.missing_ingredients.length - 5}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Кнопки действий */}
                  <div className="mt-4 flex gap-2">
                    <Link
                      href={`/recipes/${match.recipe.recipe_id}`}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-center text-sm"
                    >
                      Открыть рецепт
                    </Link>
                    {match.missing_ingredients.length > 0 && (
                      <Link
                        href={`/shopping-list?recipe=${match.recipe.recipe_id}`}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm"
                      >
                        🛒
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 text-center text-sm text-gray-500">
          Показано: {filteredMatches.length} из {matches.length} рецептов
        </div>
      </div>
    </main>
  );
}
