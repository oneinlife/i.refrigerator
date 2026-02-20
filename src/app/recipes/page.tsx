'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRecipes } from '@/hooks/useRecipes';
import CategoryFilter from '@/components/categories/CategoryFilter';
import GoogleApiStatus from '@/components/GoogleApiStatus';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function RecipesPage() {
  const {
    recipes,
    loading,
    error,
    deleteRecipe,
    getAllCategories,
    getMostUsedRecipes,
  } = useRecipes();

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'time'>('date');

  // Фильтрация и сортировка
  const filteredRecipes = recipes
    .filter(recipe => {
      // Фильтр по категориям (множественный выбор)
      if (selectedCategories.length > 0) {
        const recipeCategories = recipe.categories.split(',').map(c => c.trim());
        // Проверяем, есть ли хотя бы одна выбранная категория в категориях рецепта
        const hasMatchingCategory = selectedCategories.some(selectedCat =>
          recipeCategories.includes(selectedCat)
        );
        if (!hasMatchingCategory) {
          return false;
        }
      }

      // Фильтр по поиску
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          recipe.name.toLowerCase().includes(query) ||
          recipe.description?.toLowerCase().includes(query) ||
          recipe.categories.toLowerCase().includes(query) ||
          recipe.tags?.toLowerCase().includes(query)
        );
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name, 'ru');
        case 'date':
          return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
        case 'time':
          return a.cooking_time - b.cooking_time;
        default:
          return 0;
      }
    });

  const handleDelete = async (recipeId: string, recipeName: string) => {
    if (!confirm(`Удалить рецепт "${recipeName}"?`)) {
      return;
    }

    const success = await deleteRecipe(recipeId);
    if (success) {
      alert('Рецепт удален');
    } else {
      alert('Не удалось удалить рецепт');
    }
  };

  const mostUsed = getMostUsedRecipes(5);

  // Вычислить количество уникальных категорий
  const uniqueCategories = new Set<string>();
  recipes.forEach(recipe => {
    if (recipe.categories) {
      recipe.categories.split(',').forEach(cat => {
        const trimmed = cat.trim();
        if (trimmed) uniqueCategories.add(trimmed);
      });
    }
  });
  const categoriesCount = uniqueCategories.size;

  return (
    <main className="min-h-screen bg-gray-100 py-4 md:py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Заголовок */}
        <header className="mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <Link
                href="/"
                className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block"
              >
                ← Назад к инвентарю
              </Link>
              <h1 className="text-2xl md:text-4xl font-bold text-gray-800">
                🍳 Рецепты
              </h1>
              <p className="text-sm md:text-base text-gray-600 mt-2">
                Управление рецептами и ингредиентами
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/recipe-search"
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-center font-medium"
              >
                🔍 Что приготовить?
              </Link>
              <Link
                href="/recipes/new"
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-center font-medium"
              >
                + Добавить рецепт
              </Link>
            </div>
          </div>
        </header>

        <GoogleApiStatus />

        {/* Статистика */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-gray-600 text-sm">Всего рецептов</div>
              <div className="text-3xl font-bold text-blue-600">{recipes.length}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-gray-600 text-sm">Категорий</div>
              <div className="text-3xl font-bold text-green-600">{categoriesCount}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-gray-600 text-sm">Среднее время</div>
              <div className="text-3xl font-bold text-purple-600">
                {recipes.length > 0
                  ? Math.round(recipes.reduce((sum, r) => sum + r.cooking_time, 0) / recipes.length)
                  : 0}
                <span className="text-lg"> мин</span>
              </div>
            </div>
          </div>
        )}

        {/* Фильтры и поиск */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Поиск</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Название, описание, теги..."
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Сортировка</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="date">По дате добавления</option>
                <option value="name">По алфавиту</option>
                <option value="time">По времени готовки</option>
              </select>
            </div>
          </div>
        </div>

        {/* Макет с боковой панелью категорий */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Боковая панель с фильтром категорий */}
          <aside className="lg:col-span-1">
            <CategoryFilter
              recipes={recipes}
              selectedCategories={selectedCategories}
              onChange={setSelectedCategories}
            />
          </aside>

          {/* Основной контент с рецептами */}
          <div className="lg:col-span-3">

        {/* Топ используемых */}
        {!loading && mostUsed.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h2 className="text-lg font-bold mb-3">⭐ Часто готовите</h2>
            <div className="flex flex-wrap gap-2">
              {mostUsed.map((recipe, index) => (
                <Link
                  key={recipe.recipe_id}
                  href={`/recipes/${recipe.recipe_id}`}
                  className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm hover:bg-blue-200 transition flex items-center gap-2"
                >
                  <span className="font-bold">#{index + 1}</span>
                  <span>{recipe.name}</span>
                  <span className="text-xs opacity-75">
                    ({recipe.cooking_time} мин)
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Список рецептов */}
        {loading ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg">Загрузка рецептов...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            <p className="font-bold">Ошибка загрузки:</p>
            <p>{error}</p>
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg">Рецепты не найдены</p>
            {(searchQuery || selectedCategories.length > 0) && (
              <p className="text-sm text-gray-400 mt-2">Попробуйте изменить фильтры</p>
            )}
            {recipes.length === 0 && (
              <Link
                href="/recipes/new"
                className="inline-block mt-4 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Добавить первый рецепт
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe) => (
              <div
                key={recipe.recipe_id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden"
              >
                {recipe.image_url && (
                  <Image
                    src={recipe.image_url}
                    alt={recipe.name}
                    width={400}
                    height={200}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    {recipe.name}
                  </h3>
                  {recipe.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {recipe.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {recipe.categories.split(',').map((cat, idx) => (
                      <span
                        key={idx}
                        className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
                      >
                        {cat.trim()}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <span>⏱️ {recipe.cooking_time} мин</span>
                    <span>👥 {recipe.servings} порц.</span>
                  </div>
                  {recipe.last_used_date && (
                    <p className="text-xs text-gray-400 mb-3">
                      Готовили{' '}
                      {formatDistanceToNow(new Date(recipe.last_used_date), {
                        addSuffix: true,
                        locale: ru,
                      })}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Link
                      href={`/recipes/${recipe.recipe_id}`}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-center text-sm"
                    >
                      Открыть
                    </Link>
                    <Link
                      href={`/recipes/${recipe.recipe_id}/edit`}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition text-sm"
                    >
                      ✏️
                    </Link>
                    <button
                      onClick={() => handleDelete(recipe.recipe_id, recipe.name)}
                      className="px-4 py-2 bg-red-200 text-red-700 rounded hover:bg-red-300 transition text-sm"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

            <div className="mt-6 text-center text-sm text-gray-500">
              Показано рецептов: {filteredRecipes.length} из {recipes.length}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
