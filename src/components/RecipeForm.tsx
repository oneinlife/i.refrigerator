'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRecipes } from '@/hooks/useRecipes';
import { useProducts } from '@/hooks/useProducts';
import { useGoogleApi } from '@/components/GoogleApiProvider';
import ProductAutocomplete from '@/components/ProductAutocomplete';
import CategorySelector from '@/components/categories/CategorySelector';
import GoogleApiStatus from '@/components/GoogleApiStatus';
import { logError } from '@/lib/errorLogger';
import { normalizeProductName } from '@/lib/utils/textUtils';
import type { Recipe, RecipeIngredient } from '@/types/recipe';
import type { Product } from '@/types/product';

interface RecipeFormProps {
  recipeId?: string;
}

export default function RecipeFormPage({ recipeId }: RecipeFormProps) {
  const router = useRouter();
  const { isAuthenticated, isInitialized, isInitializing } = useGoogleApi();
  const { addRecipe, updateRecipe, getRecipeWithIngredients } = useRecipes();
  const { products, addProduct } = useProducts();

  const [loading, setLoading] = useState(false);
  const [loadingRecipe, setLoadingRecipe] = useState(!!recipeId);

  // Основные поля рецепта
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState(4);
  const [cookingTime, setCookingTime] = useState(30);
  const [categories, setCategories] = useState<string[]>([]);
  const [instructions, setInstructions] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [tags, setTags] = useState('');

  // Ингредиенты
  const [ingredients, setIngredients] = useState<
    Array<{
      productId: string;
      productName: string;
      quantity: number | '';
      unit: string;
      optional: boolean;
      notes: string;
    }>
  >([]);

  // Поле для добавления нового ингредиента
  const [newIngredientInput, setNewIngredientInput] = useState('');

  // Загрузка существующего рецепта для редактирования
  useEffect(() => {
    if (recipeId) {
      loadRecipe();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeId]);

  const loadRecipe = async () => {
    if (!recipeId) return;

    setLoadingRecipe(true);
    try {
      const recipe = await getRecipeWithIngredients(recipeId);
      if (recipe) {
        setName(recipe.name);
        setDescription(recipe.description || '');
        setServings(recipe.servings);
        setCookingTime(recipe.cooking_time);
        setCategories(recipe.categories.split(',').map(c => c.trim()).filter(Boolean));
        setInstructions(recipe.instructions);
        setImageUrl(recipe.image_url || '');
        setTags(recipe.tags || '');

        setIngredients(
          recipe.ingredients.map(ing => ({
            productId: ing.product_id,
            productName: ing.product.name,
            quantity: ing.quantity,
            unit: ing.unit,
            optional: ing.optional,
            notes: ing.notes || '',
          }))
        );
      }
    } catch (error) {
      logError('RecipeForm.loadRecipe', error);
      alert('Не удалось загрузить рецепт');
    } finally {
      setLoadingRecipe(false);
    }
  };

  const handleAddIngredient = (product: Product) => {
    // Проверяем, не добавлен ли уже этот продукт
    if (ingredients.some(ing => ing.productId === product.product_id)) {
      alert('Этот продукт уже добавлен в список ингредиентов');
      setNewIngredientInput('');
      return;
    }

    setIngredients([
      ...ingredients,
      {
        productId: product.product_id,
        productName: product.name,
        quantity: 1,
        unit: product.default_unit,
        optional: false,
        notes: '',
      },
    ]);
    // Очищаем поле ввода после добавления
    setNewIngredientInput('');
  };

  const handleAddIngredientManually = () => {
    const trimmedInput = newIngredientInput.trim();
    if (!trimmedInput) {
      return;
    }

    // Нормализуем название продукта
    const normalizedName = normalizeProductName(trimmedInput);

    // Ищем точное или частичное совпадение в списке продуктов (регистронезависимо)
    const matchingProduct = products.find(
      p => p.name.toLowerCase() === normalizedName.toLowerCase()
    );

    if (matchingProduct) {
      handleAddIngredient(matchingProduct);
    } else {
      // Создаем временный продукт, который будет создан при сохранении рецепта
      const tempProductId = `temp_${Date.now()}`;
      
      if (ingredients.some(ing => ing.productName.toLowerCase() === normalizedName.toLowerCase())) {
        alert('Этот продукт уже добавлен в список ингредиентов');
        setNewIngredientInput('');
        return;
      }

      setIngredients([
        ...ingredients,
        {
          productId: tempProductId,
          productName: normalizedName,
          quantity: 1,
          unit: 'шт',
          optional: false,
          notes: '',
        },
      ]);
      setNewIngredientInput('');
    }
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleUpdateIngredient = (
    index: number,
    field: keyof (typeof ingredients)[0],
    value: any
  ) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Введите название рецепта');
      return;
    }

    if (categories.length === 0) {
      alert('Добавьте хотя бы одну категорию');
      return;
    }

    if (ingredients.length === 0) {
      alert('Добавьте хотя бы один ингредиент');
      return;
    }

    // Проверяем, что у всех ингредиентов указано количество
    const invalidIngredients = ingredients.filter(ing => ing.quantity === '' || ing.quantity <= 0);
    if (invalidIngredients.length > 0) {
      alert('Укажите корректное количество для всех ингредиентов');
      return;
    }

    if (!instructions.trim()) {
      alert('Введите инструкции приготовления');
      return;
    }

    // Проверяем, что API инициализирован
    if (!isAuthenticated) {
      alert('Необходимо авторизоваться в Google для сохранения рецепта');
      return;
    }

    if (!isInitialized) {
      alert('Google Sheets API еще не загружен. Подождите несколько секунд и попробуйте снова.');
      return;
    }

    // Проверяем наличие новых продуктов
    const hasNewProducts = ingredients.some(ing => ing.productId.startsWith('temp_'));
    
    setLoading(true);

    try {
      // Создаем новые продукты для временных ингредиентов
      const processedIngredients = [...ingredients];
      
      for (let i = 0; i < processedIngredients.length; i++) {
        const ing = processedIngredients[i];
        
        // Если это временный продукт (не существует в базе)
        if (ing.productId.startsWith('temp_')) {
          console.log(`Creating new product: ${ing.productName}`);
          
          try {
            const newProduct = await addProduct({
              name: ing.productName,
              default_unit: ing.unit,
              usage_count: 0,
            });

            if (newProduct) {
              // Заменяем временный ID на реальный
              processedIngredients[i] = {
                ...ing,
                productId: newProduct.product_id,
              };
            } else {
              throw new Error(`Не удалось создать продукт: ${ing.productName}`);
            }
          } catch (productError) {
            const errorMsg = productError instanceof Error ? productError.message : 'Неизвестная ошибка';
            throw new Error(`Не удалось создать продукт "${ing.productName}": ${errorMsg}`);
          }
        }
      }

      const recipeData: Omit<Recipe, 'recipe_id' | 'created_date'> = {
        name: name.trim(),
        description: description.trim() || undefined,
        servings,
        cooking_time: cookingTime,
        categories: categories.join(','),
        instructions: instructions.trim(),
        image_url: imageUrl.trim() || undefined,
        tags: tags.trim() || undefined,
        last_used_date: undefined,
      };

      const ingredientsData = processedIngredients.map(ing => ({
        product_id: ing.productId,
        quantity: typeof ing.quantity === 'number' ? ing.quantity : parseFloat(ing.quantity as string),
        unit: ing.unit,
        optional: ing.optional,
        notes: ing.notes.trim() || undefined,
      }));

      let success;
      if (recipeId) {
        success = await updateRecipe(recipeId, recipeData, ingredientsData);
      } else {
        const newRecipe = await addRecipe(recipeData, ingredientsData);
        success = !!newRecipe;
      }

      if (success) {
        alert(recipeId ? 'Рецепт обновлен' : 'Рецепт добавлен');
        router.push('/recipes');
      } else {
        alert('Не удалось сохранить рецепт');
      }
    } catch (error) {
      logError('RecipeForm.handleSubmit', error);
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      
      // Проверяем, связана ли ошибка с API
      if (errorMessage.includes('не инициализирован') || errorMessage.includes('not initialized')) {
        alert(
          '❌ Google Sheets API не загружен.\n\n' +
          'Попробуйте:\n' +
          '1. Обновить страницу (F5)\n' +
          '2. Проверить интернет-соединение\n' +
          '3. Убедиться, что вы авторизованы в Google\n' +
          '4. Перейти в Настройки и настроить подключение'
        );
      } else if (errorMessage.includes('создать продукт') || errorMessage.includes('добавить продукт')) {
        alert(
          `❌ ${errorMessage}\n\n` +
          'Возможные причины:\n' +
          '• Google Sheets API не готов - попробуйте обновить страницу\n' +
          '• Нет прав на запись в таблицу\n' +
          '• Проблемы с подключением к интернету'
        );
      } else {
        alert(`Ошибка при сохранении рецепта: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingRecipe) {
    return (
      <main className="min-h-screen bg-gray-100 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <p className="text-center text-gray-500">Загрузка рецепта...</p>
        </div>
      </main>
    );
  }

  // Ждем инициализации Google API
  if (isInitializing) {
    return (
      <main className="min-h-screen bg-gray-100 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center">
            <div className="inline-block animate-spin text-4xl mb-4">⏳</div>
            <p className="text-gray-500">Загрузка Google Sheets API...</p>
            <p className="text-xs text-gray-400 mt-2">Это может занять несколько секунд</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 py-4 md:py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <header className="mb-6">
          <Link
            href="/recipes"
            className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block"
          >
            ← Назад к рецептам
          </Link>
          <h1 className="text-2xl md:text-4xl font-bold text-gray-800">
            {recipeId ? '✏️ Редактировать рецепт' : '➕ Новый рецепт'}
          </h1>
        </header>

        <GoogleApiStatus />

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Основная информация */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Основная информация</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Название рецепта *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Например: Борщ с говядиной"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Описание</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                  placeholder="Краткое описание блюда..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Количество порций *
                  </label>
                  <input
                    type="number"
                    value={servings}
                    onChange={(e) => setServings(parseInt(e.target.value) || 1)}
                    min="1"
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Время приготовления (мин) *
                  </label>
                  <input
                    type="number"
                    value={cookingTime}
                    onChange={(e) => setCookingTime(parseInt(e.target.value) || 1)}
                    min="1"
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">URL изображения</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Теги (через запятую)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="быстро, просто, вкусно"
                />
              </div>
            </div>
          </div>

          {/* Категории */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Категории *</h2>
            <CategorySelector
              selectedCategories={categories}
              onChange={setCategories}
              placeholder="Начните вводить или выберите из списка..."
              disabled={loading}
            />
          </div>

          {/* Ингредиенты */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Ингредиенты *</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Добавить ингредиент</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <ProductAutocomplete
                    value={newIngredientInput}
                    onChange={setNewIngredientInput}
                    onProductSelect={handleAddIngredient}
                    onEnter={handleAddIngredientManually}
                    products={products}
                    placeholder="Начните вводить название продукта..."
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddIngredientManually}
                  disabled={!newIngredientInput.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap"
                  title="Добавить продукт в список"
                >
                  ➕ Добавить
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Выберите из списка или введите новый продукт и нажмите &quot;Добавить&quot; или Enter
              </p>
            </div>

            {ingredients.length > 0 && (
              <div className="space-y-3">
                {ingredients.map((ing, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-3 bg-gray-50"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                        <div className="md:col-span-2">
                          <input
                            type="text"
                            value={ing.productName}
                            disabled
                            className="w-full px-2 py-1 text-sm bg-gray-100 border rounded"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            value={ing.quantity}
                            onChange={(e) => {
                              const value = e.target.value;
                              handleUpdateIngredient(
                                index,
                                'quantity',
                                value === '' ? '' : parseFloat(value) || 0
                              );
                            }}
                            step="0.1"
                            min="0"
                            className="w-full px-2 py-1 text-sm border rounded"
                            placeholder="Кол-во"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={ing.unit}
                            onChange={(e) =>
                              handleUpdateIngredient(index, 'unit', e.target.value)
                            }
                            className="w-full px-2 py-1 text-sm border rounded"
                            placeholder="Ед. изм."
                          />
                        </div>
                        <div className="md:col-span-4 flex items-center gap-2">
                          <label className="flex items-center gap-1 text-sm">
                            <input
                              type="checkbox"
                              checked={ing.optional}
                              onChange={(e) =>
                                handleUpdateIngredient(index, 'optional', e.target.checked)
                              }
                            />
                            Опционально
                          </label>
                          <input
                            type="text"
                            value={ing.notes}
                            onChange={(e) =>
                              handleUpdateIngredient(index, 'notes', e.target.value)
                            }
                            className="flex-1 px-2 py-1 text-sm border rounded"
                            placeholder="Примечание"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Инструкции */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Инструкции приготовления *</h2>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full px-3 py-2 border rounded-md font-mono text-sm"
              rows={10}
              placeholder="Введите пошаговые инструкции. Каждый шаг с новой строки или разделяйте двумя символами ||"
              required
            />
            <p className="text-xs text-gray-500 mt-2">
              Совет: Пишите каждый шаг с новой строки или используйте || для разделения
            </p>
          </div>

          {/* Кнопки */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 font-medium"
            >
              {loading ? 'Сохранение...' : recipeId ? 'Сохранить изменения' : 'Создать рецепт'}
            </button>
            <Link
              href="/recipes"
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-center"
            >
              Отмена
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
