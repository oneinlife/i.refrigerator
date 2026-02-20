'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useRecipes } from '@/hooks/useRecipes';
import { logError } from '@/lib/errorLogger';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { RecipeWithIngredients } from '@/types/recipe';

export default function RecipeDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { getRecipeWithIngredients, deleteRecipe, markRecipeAsUsed } = useRecipes();
  const [recipe, setRecipe] = useState<RecipeWithIngredients | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecipe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const loadRecipe = async () => {
    setLoading(true);
    try {
      const data = await getRecipeWithIngredients(params.id);
      setRecipe(data);
    } catch (error) {
      logError('RecipeDetailPage.loadRecipe', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!recipe) return;

    if (!confirm(`Удалить рецепт "${recipe.name}"?`)) {
      return;
    }

    const success = await deleteRecipe(recipe.recipe_id);
    if (success) {
      alert('Рецепт удален');
      router.push('/recipes');
    } else {
      alert('Не удалось удалить рецепт');
    }
  };

  const handleMarkAsUsed = async () => {
    if (!recipe) return;

    const success = await markRecipeAsUsed(recipe.recipe_id);
    if (success) {
      await loadRecipe();
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <p className="text-center text-gray-500">Загрузка рецепта...</p>
        </div>
      </main>
    );
  }

  if (!recipe) {
    return (
      <main className="min-h-screen bg-gray-100 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 text-lg mb-4">Рецепт не найден</p>
            <Link
              href="/recipes"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              ← К списку рецептов
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const instructions = recipe.instructions.includes('||')
    ? recipe.instructions.split('||').map(s => s.trim())
    : recipe.instructions.split('\n').filter(s => s.trim());

  const requiredIngredients = recipe.ingredients.filter(ing => !ing.optional);
  const optionalIngredients = recipe.ingredients.filter(ing => ing.optional);

  return (
    <main className="min-h-screen bg-gray-100 py-4 md:py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Заголовок */}
        <header className="mb-6">
          <Link
            href="/recipes"
            className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block"
          >
            ← Назад к рецептам
          </Link>
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold text-gray-800 mb-2">
                {recipe.name}
              </h1>
              {recipe.description && (
                <p className="text-gray-600">{recipe.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Link
                href={`/recipes/${recipe.recipe_id}/edit`}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
              >
                ✏️ Редактировать
              </Link>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
              >
                🗑️ Удалить
              </button>
            </div>
          </div>
        </header>

        {/* Изображение */}
        {recipe.image_url && (
          <div className="mb-6 rounded-lg overflow-hidden shadow-lg">
            <Image
              src={recipe.image_url}
              alt={recipe.name}
              width={800}
              height={400}
              className="w-full h-64 md:h-96 object-cover"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Основная информация */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4">Информация</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⏱️</span>
                  <div>
                    <div className="font-medium">{recipe.cooking_time} минут</div>
                    <div className="text-gray-500 text-xs">Время приготовления</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👥</span>
                  <div>
                    <div className="font-medium">{recipe.servings} порций</div>
                    <div className="text-gray-500 text-xs">Количество</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📅</span>
                  <div>
                    <div className="font-medium">
                      {format(new Date(recipe.created_date), 'd MMMM yyyy', { locale: ru })}
                    </div>
                    <div className="text-gray-500 text-xs">Добавлен</div>
                  </div>
                </div>
                {recipe.last_used_date && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🍽️</span>
                    <div>
                      <div className="font-medium">
                        {format(new Date(recipe.last_used_date), 'd MMMM yyyy', { locale: ru })}
                      </div>
                      <div className="text-gray-500 text-xs">Последний раз готовили</div>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={handleMarkAsUsed}
                className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm"
              >
                ✅ Отметить как приготовленное
              </button>
            </div>

            {/* Категории */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-3">Категории</h2>
              <div className="flex flex-wrap gap-2">
                {recipe.categories.split(',').map((cat, idx) => (
                  <span
                    key={idx}
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                  >
                    {cat.trim()}
                  </span>
                ))}
              </div>
            </div>

            {/* Теги */}
            {recipe.tags && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-bold mb-3">Теги</h2>
                <div className="flex flex-wrap gap-2">
                  {recipe.tags.split(',').map((tag, idx) => (
                    <span
                      key={idx}
                      className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
                    >
                      #{tag.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ингредиенты */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Ингредиенты</h2>

              {requiredIngredients.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-medium text-gray-700 mb-2">Основные:</h3>
                  <ul className="space-y-2">
                    {requiredIngredients.map((ing) => (
                      <li key={ing.recipe_product_id} className="flex items-start gap-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <div className="flex-1">
                          <span className="font-medium">{ing.product.name}</span>
                          <span className="text-gray-600">
                            {' '}
                            — {ing.quantity} {ing.unit}
                          </span>
                          {ing.notes && (
                            <span className="text-gray-500 text-sm block">
                              {ing.notes}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {optionalIngredients.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Опциональные:</h3>
                  <ul className="space-y-2">
                    {optionalIngredients.map((ing) => (
                      <li key={ing.recipe_product_id} className="flex items-start gap-2">
                        <span className="text-gray-400 mt-1">○</span>
                        <div className="flex-1">
                          <span className="font-medium text-gray-600">{ing.product.name}</span>
                          <span className="text-gray-500">
                            {' '}
                            — {ing.quantity} {ing.unit}
                          </span>
                          {ing.notes && (
                            <span className="text-gray-400 text-sm block">
                              {ing.notes}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Инструкции */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Инструкции приготовления</h2>
              <ol className="space-y-4">
                {instructions.map((step, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {idx + 1}
                    </span>
                    <p className="flex-1 text-gray-700 pt-1">{step}</p>
                  </li>
                ))}
              </ol>
            </div>

            {/* Кнопки действий */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4">Действия</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Link
                  href={`/shopping-list?recipe=${recipe.recipe_id}`}
                  className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-center"
                >
                  🛒 Создать список покупок
                </Link>
                <button
                  onClick={handleMarkAsUsed}
                  className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  ✅ Приготовил(-а)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
