'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useShoppingList } from '@/hooks/useShoppingList';
import { useRecipeMatching } from '@/hooks/useRecipeMatching';
import { logError } from '@/lib/errorLogger';
import type { ShoppingListItemWithDetails } from '@/types/shopping';

type ViewMode = 'list' | 'grouped';

function ShoppingListContent() {
  const searchParams = useSearchParams();
  const recipeIdFromQuery = searchParams?.get('recipe');

  const {
    items,
    loading,
    error,
    loadShoppingList,
    markAsChecked,
    unmarkChecked,
    deleteItem,
    clearChecked,
    addCheckedToInventory,
    getUnchecked,
    getChecked,
    getGroupedList,
    stats,
    createFromRecipe,
  } = useShoppingList();

  const { matchRecipe, loading: matchingLoading, recipesCount, inventoryCount } = useRecipeMatching();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showChecked, setShowChecked] = useState(true);
  const [pendingRecipeId, setPendingRecipeId] = useState<string | null>(null);

  /**
   * Создать список покупок из рецепта
   */
  const handleCreateFromRecipe = useCallback(async (recipeId: string) => {
    console.log('handleCreateFromRecipe called with recipeId:', recipeId);
    try {
      console.log('Calling matchRecipe...');
      const match = await matchRecipe(recipeId);
      console.log('matchRecipe result:', {
        match_percentage: match?.match_percentage,
        missing_ingredients_count: match?.missing_ingredients.length,
        missing_quantities_count: match?.missing_quantities.length,
        missing_quantities: match?.missing_quantities
      });
      
      if (match && match.missing_ingredients.length > 0) {
        console.log('Creating shopping list from recipe...');
        await createFromRecipe(match, recipeId, match.recipe.name);
        console.log('Shopping list created successfully');
      } else {
        console.warn('No missing ingredients found for recipe:', recipeId);
        if (match) {
          alert('Все ингредиенты для этого рецепта уже есть в холодильнике!');
        } else {
          alert('Не удалось найти рецепт');
        }
      }
    } catch (err) {
      logError('ShoppingListPage.handleCreateFromRecipe', err);
      console.error('Error creating shopping list from recipe:', err);
    }
  }, [matchRecipe, createFromRecipe]);

  /**
   * Обработать создание списка покупок из рецепта (query параметр)
   */
  useEffect(() => {
    if (recipeIdFromQuery) {
      console.log('Recipe ID from query:', recipeIdFromQuery, 'Loading:', matchingLoading);
      setPendingRecipeId(recipeIdFromQuery);
    }
  }, [recipeIdFromQuery, matchingLoading]);

  /**
   * Ожидаем загрузки данных перед созданием списка покупок
   */
  useEffect(() => {
    if (pendingRecipeId && !matchingLoading && recipesCount > 0 && inventoryCount >= 0) {
      console.log('Data loaded, creating shopping list for pending recipe:', pendingRecipeId);
      handleCreateFromRecipe(pendingRecipeId);
      setPendingRecipeId(null);
    }
  }, [pendingRecipeId, matchingLoading, recipesCount, inventoryCount, handleCreateFromRecipe]);

  /**
   * Обработать изменение checkbox
   */
  const handleCheckToggle = async (item: ShoppingListItemWithDetails) => {
    if (item.checked) {
      await unmarkChecked(item.shopping_item_id);
    } else {
      await markAsChecked(item.shopping_item_id);
    }
  };

  /**
   * Удалить элемент
   */
  const handleDelete = async (shoppingItemId: string) => {
    if (confirm('Удалить этот элемент из списка покупок?')) {
      await deleteItem(shoppingItemId);
    }
  };

  /**
   * Очистить купленные
   */
  const handleClearChecked = async () => {
    if (confirm('Удалить все отмеченные элементы?')) {
      await clearChecked();
    }
  };

  /**
   * Добавить купленные в инвентарь и удалить из списка
   */
  const handleAddToInventory = async () => {
    if (confirm('Добавить все отмеченные продукты в холодильник и удалить из списка?')) {
      await addCheckedToInventory();
      await clearChecked();
    }
  };

  /**
   * Получить отфильтрованный список
   */
  const getFilteredItems = () => {
    if (showChecked) {
      return items;
    }
    return getUnchecked();
  };

  /**
   * Рендер элемента списка покупок
   */
  const renderShoppingItem = (item: ShoppingListItemWithDetails) => (
    <div
      key={item.shopping_item_id}
      className={`flex items-center gap-4 p-4 border rounded-lg ${
        item.checked ? 'bg-green-50 border-green-300' : 'bg-white border-gray-300'
      }`}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={item.checked}
        onChange={() => handleCheckToggle(item)}
        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />

      {/* Информация о продукте */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className={`font-medium ${item.checked ? 'line-through text-gray-500' : ''}`}>
            {item.product.name}
          </h3>
        </div>

        <div className="text-sm text-gray-600 mt-1">
          Нужно: {item.quantity_needed} {item.unit}
          {item.quantity_available > 0 && (
            <> • Есть: {item.quantity_available} {item.unit}</>
          )}
          <> • <span className="font-medium text-blue-600">Купить: {item.quantity_to_buy} {item.unit}</span></>
        </div>

        {item.recipe_id && (
          <Link
            href={`/recipes/${item.recipe_id}`}
            className="text-xs text-blue-600 hover:underline mt-1 inline-block"
          >
            Для рецепта
          </Link>
        )}

        {item.purchased_date && (
          <div className="text-xs text-gray-500 mt-1">
            Куплено: {new Date(item.purchased_date).toLocaleDateString('ru-RU')}
          </div>
        )}
      </div>

      {/* Кнопка удаления */}
      <button
        onClick={() => handleDelete(item.shopping_item_id)}
        className="text-red-600 hover:text-red-800 p-2"
        title="Удалить"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );

  /**
   * Рендер сгруппированного списка
   */
  const renderGroupedList = () => {
    const grouped = getGroupedList();

    return (
      <div className="space-y-6">
        {grouped.map(group => (
          <div key={group.group_name} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">{group.group_name}</h2>
              <span className="text-sm text-gray-600">
                {group.checked_items} / {group.total_items}
              </span>
            </div>
            <div className="space-y-2">
              {group.items.map(item => renderShoppingItem(item))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  /**
   * Рендер обычного списка
   */
  const renderList = () => {
    const filteredItems = getFilteredItems();

    if (filteredItems.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          {showChecked ? 'Список покупок пуст' : 'Нет непомеченных элементов'}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {filteredItems.map(item => renderShoppingItem(item))}
      </div>
    );
  };

  if (loading && items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Загрузка списка покупок...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Список покупок</h1>
          <p className="text-gray-600 mt-1">
            Отмечайте купленные продукты и добавляйте их в холодильник
          </p>
        </div>
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-800"
        >
          ← На главную
        </Link>
      </div>

      {/* Ошибка */}
      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Статистика */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-gray-600">Всего элементов</div>
        </div>
        <div className="bg-orange-50 border border-orange-300 rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-600">{stats.unchecked}</div>
          <div className="text-sm text-gray-600">К покупке</div>
        </div>
        <div className="bg-green-50 border border-green-300 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{stats.checked}</div>
          <div className="text-sm text-gray-600">Куплено</div>
        </div>
      </div>

      {/* Панель управления */}
      <div className="bg-gray-50 border rounded-lg p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Переключатель режима просмотра */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Список
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              className={`px-4 py-2 rounded ${
                viewMode === 'grouped'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              По категориям
            </button>
          </div>

          {/* Checkbox для показа купленных */}
          {viewMode === 'list' && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showChecked}
                onChange={(e) => setShowChecked(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Показать купленные</span>
            </label>
          )}

          {/* Кнопки действий */}
          <div className="flex gap-2 ml-auto">
            {stats.checked > 0 && (
              <>
                <button
                  onClick={handleAddToInventory}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                >
                  Добавить в холодильник
                </button>
                <button
                  onClick={handleClearChecked}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
                >
                  Очистить купленные
                </button>
              </>
            )}

            <button
              onClick={loadShoppingList}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              Обновить
            </button>
          </div>
        </div>
      </div>

      {/* Список покупок */}
      {viewMode === 'list' ? renderList() : renderGroupedList()}

      {/* Ссылки */}
      <div className="mt-8 text-center space-x-4">
        <Link
          href="/recipe-search"
          className="text-blue-600 hover:underline"
        >
          Поиск рецептов
        </Link>
        <span className="text-gray-400">•</span>
        <Link
          href="/recipes"
          className="text-blue-600 hover:underline"
        >
          Все рецепты
        </Link>
        <span className="text-gray-400">•</span>
        <Link
          href="/products"
          className="text-blue-600 hover:underline"
        >
          Продукты
        </Link>
      </div>
    </div>
  );
}

export default function ShoppingListPage() {
  return (
    <Suspense fallback={<div className="p-8">Загрузка...</div>}>
      <ShoppingListContent />
    </Suspense>
  );
}
