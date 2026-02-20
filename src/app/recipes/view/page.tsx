'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useRecipes } from '@/hooks/useRecipes';
import { logError } from '@/lib/errorLogger';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { RecipeWithIngredients } from '@/types/recipe';

function RecipeDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const router = useRouter();
  const { getRecipeWithIngredients, deleteRecipe, markRecipeAsUsed } = useRecipes();
  const [recipe, setRecipe] = useState<RecipeWithIngredients | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadRecipe();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadRecipe = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const data = await getRecipeWithIngredients(id);
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

  if (!id) {
    return (
      <main className="min-h-screen bg-gray-100 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 text-lg mb-4">ID рецепта не указан</p>
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
        <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <Link
              href="/recipes"
              className="text-blue-600 hover:text-blue-800 flex items-center"
            >
              ← Назад к рецептам
            </Link>
            <div className="flex gap-2 w-full md:w-auto">
              <Link
                href={`/recipes/edit?id=${recipe.recipe_id}`}
                className="flex-1 md:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center"
              >
                Редактировать
              </Link>
              <button
                onClick={handleMarkAsUsed}
                className="flex-1 md:flex-none px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Приготовлено
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 md:flex-none px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Удалить
              </button>
            </div>
          </div>

          {recipe.image_url && (
            <div className="relative w-full h-48 md:h-64 mb-4 rounded-lg overflow-hidden">
              <Image
                src={recipe.image_url}
                alt={recipe.name}
                fill
                className="object-cover"
              />
            </div>
          )}

          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            {recipe.name}
          </h1>

          {recipe.description && (
            <p className="text-gray-600 mb-4">{recipe.description}</p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            {recipe.servings && (
              <div className="flex items-center gap-1">
                <span className="font-semibold">Порций:</span>
                <span>{recipe.servings}</span>
              </div>
            )}
            {recipe.cooking_time && (
              <div className="flex items-center gap-1">
                <span className="font-semibold">Время:</span>
                <span>{recipe.cooking_time} мин</span>
              </div>
            )}
            {recipe.last_used_date && (
              <div className="flex items-center gap-1">
                <span className="font-semibold">Последнее приготовление:</span>
                <span>
                  {format(new Date(recipe.last_used_date), 'd MMMM yyyy', { locale: ru })}
                </span>
              </div>
            )}
          </div>

          {recipe.categories && recipe.categories.trim().length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {recipe.categories.split(',').map((category, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {category.trim()}
                </span>
              ))}
            </div>
          )}

          {recipe.tags && recipe.tags.trim().length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {recipe.tags.split(',').map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                >
                  #{tag.trim()}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Ингредиенты */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Ингредиенты</h2>
          
          {requiredIngredients.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700 mb-2">Основные</h3>
              <ul className="space-y-2">
                {requiredIngredients.map((ingredient) => (
                  <li
                    key={ingredient.recipe_product_id}
                    className="flex justify-between items-center"
                  >
                    <span className="text-gray-800">{ingredient.product.name}</span>
                    <span className="text-gray-600 text-sm">
                      {ingredient.quantity} {ingredient.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {optionalIngredients.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">
                Опциональные
              </h3>
              <ul className="space-y-2">
                {optionalIngredients.map((ingredient) => (
                  <li
                    key={ingredient.recipe_product_id}
                    className="flex justify-between items-center text-gray-600"
                  >
                    <span>{ingredient.product.name}</span>
                    <span className="text-sm">
                      {ingredient.quantity} {ingredient.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Инструкции */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Приготовление</h2>
          <ol className="space-y-3">
            {instructions.map((instruction, idx) => (
              <li key={idx} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  {idx + 1}
                </span>
                <p className="text-gray-700 flex-1">{instruction}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Список покупок */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <Link
            href={`/shopping-list?recipe=${recipe.recipe_id}`}
            className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Создать список покупок
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function RecipeDetailPage() {
  return (
    <Suspense fallback={<div className="p-8">Загрузка...</div>}>
      <RecipeDetailContent />
    </Suspense>
  );
}
