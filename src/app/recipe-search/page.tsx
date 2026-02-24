'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGoogleApi } from '@/components/GoogleApiProvider';
import { useRecipeMatching } from '@/hooks/useRecipeMatching';
import { useShoppingList } from '@/hooks/useShoppingList';
import { logError } from '@/lib/errorLogger';
import { storageService } from '@/lib/storageService';
import type { RecipeMatch } from '@/types/recipe';

const ITEMS_PER_PAGE = 20;

export default function RecipeSearchPage() {
  const router = useRouter();
  const {
    error,
    loadMatches,
    matchAllRecipes,
  } = useRecipeMatching();
  
  const { isAuthenticated, isInitialized } = useGoogleApi();
  
  const { createFromRecipe } = useShoppingList();

  const [matches, setMatches] = useState<RecipeMatch[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [creatingShoppingList, setCreatingShoppingList] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);

  const performSearch = useCallback(async (forceRefresh: boolean = false) => {
    console.log('RecipeSearchPage - performSearch called', { forceRefresh });
    setSearchLoading(true);
    setHasSearched(true);
    setCurrentPage(1);
    try {
      // Если требуется принудительное обновление, очищаем локальное состояние
      if (forceRefresh) {
        console.log('🔄 Force refresh - reloading from Google Sheets');
        await loadMatches(true, ITEMS_PER_PAGE, 0); // Передаем true для очистки кэша
        setMatches([]); // Очищаем текущие результаты
      }
      
      console.log('RecipeSearchPage - calling matchAllRecipes...');
      const allMatches = await matchAllRecipes(ITEMS_PER_PAGE, 0);
      console.log('RecipeSearchPage - matchAllRecipes returned:', allMatches.length, 'matches');

      setMatches(allMatches);
      setHasMorePages(allMatches.length === ITEMS_PER_PAGE);
    } catch (err) {
      logError('RecipeSearchPage.performSearch', err);
      console.error('RecipeSearchPage - performSearch error:', err);
    } finally {
      setSearchLoading(false);
    }
  }, [matchAllRecipes, loadMatches]);

  /**
   * Создать список покупок из рецепта и перейти на страницу списка покупок
   */
  const handleCreateShoppingList = useCallback(async (match: RecipeMatch) => {
    console.log('handleCreateShoppingList called for recipe:', match.recipe.recipe_id);
    
    if (match.missing_ingredients.length === 0) {
      alert('Все ингредиенты для этого рецепта уже есть в холодильнике!');
      return;
    }

    setCreatingShoppingList(match.recipe.recipe_id);
    try {
      console.log('Creating shopping list from recipe...');
      await createFromRecipe(match, match.recipe.recipe_id, match.recipe.name);
      console.log('Shopping list created successfully, redirecting...');
      
      // Переходим на страницу списка покупок
      router.push('/shopping-list');
    } catch (err) {
      logError('RecipeSearchPage.handleCreateShoppingList', err);
      console.error('Error creating shopping list from recipe:', err);
      alert('Ошибка при создании списка покупок');
    } finally {
      setCreatingShoppingList(null);
    }
  }, [createFromRecipe, router]);

  // Загрузить следующую страницу
  const loadNextPage = useCallback(async () => {
    if (loadingMore || !hasMorePages) return;
    
    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const offset = (nextPage - 1) * ITEMS_PER_PAGE;
      console.log('Loading page:', nextPage, 'offset:', offset);
      
      const newMatches = await matchAllRecipes(ITEMS_PER_PAGE, offset);
      
      setMatches(prev => [...prev, ...newMatches]);
      setCurrentPage(nextPage);
      setHasMorePages(newMatches.length === ITEMS_PER_PAGE);
    } catch (err) {
      logError('RecipeSearchPage.loadNextPage', err);
    } finally {
      setLoadingMore(false);
    }
  }, [currentPage, hasMorePages, loadingMore, matchAllRecipes]);

  // Автоматический поиск после загрузки данных
  useEffect(() => {
    const spreadsheetId = storageService.getSpreadsheetId();
    
    console.log('RecipeSearchPage - checking if ready to search:', {
      hasSearched,
      isAuthenticated,
      isInitialized,
      hasSpreadsheetId: !!spreadsheetId,
      searchLoading
    });
    
    // Запускаем поиск если API готов и еще не искали
    if (!searchLoading && !hasSearched && isAuthenticated && isInitialized && spreadsheetId) {
      console.log('RecipeSearchPage - performing initial search...');
      performSearch();
    }
  }, [searchLoading, hasSearched, isAuthenticated, isInitialized, performSearch]);

  const getMatchColor = (percentage: number): string => {
    if (percentage === 100) return 'bg-green-100 text-green-800 border-green-300';
    if (percentage >= 75) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (percentage >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  // Показываем лоадер только при первой загрузке (не используем loading из хука, так как он срабатывает при каждой подгрузке)
  const isInitialLoading = (searchLoading && !hasSearched) || (!hasSearched && isInitialized && isAuthenticated);
  
  if (isInitialLoading) {
    return (
      <main className="min-h-screen bg-gray-100 py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          <p className="text-center text-gray-500 text-lg">
            Поиск рецептов...
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
              onClick={() => performSearch(true)}
              disabled={searchLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
            >
              🔄 Обновить
            </button>
          </div>
        </header>

        {/* Список рецептов */}
        {matches.length === 0 && hasSearched ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg mb-4">
              Рецепты не найдены
            </p>
            <Link
              href="/recipes/new"
              className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Добавить рецепт
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {matches.map((match) => (
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
                      <button
                        onClick={() => handleCreateShoppingList(match)}
                        disabled={creatingShoppingList === match.recipe.recipe_id}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                        title="Добавить в список покупок"
                      >
                        {creatingShoppingList === match.recipe.recipe_id ? '...' : '🛒'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Кнопка "Загрузить еще" */}
          {hasMorePages && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={loadNextPage}
                disabled={loadingMore}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed text-lg font-medium"
              >
                {loadingMore ? 'Загрузка...' : 'Загрузить еще'}
              </button>
            </div>
          )}

          {/* Информация */}
          <div className="mt-6 text-center text-sm text-gray-500">
            Показано рецептов: {matches.length}
          </div>
          </>
        )}
      </div>
    </main>
  );
}
