'use client';

import Link from 'next/link';
import CategoryManager from '@/components/categories/CategoryManager';

export default function CategoriesSettingsPage() {
  return (
    <main className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-6">
          <Link 
            href="/recipes" 
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            ← Назад к рецептам
          </Link>
        </div>

        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🏷️ Управление категориями
          </h1>
          <p className="text-gray-600">
            Создавайте, редактируйте и удаляйте пользовательские категории для рецептов
          </p>
        </header>

        <div className="space-y-6">
          {/* Информационная карточка */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">
              📖 О категориях
            </h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Используйте категории для организации и фильтрации рецептов</li>
              <li>Предустановленные категории нельзя редактировать или удалять</li>
              <li>Пользовательские категории можно изменять и удалять в любое время</li>
              <li>Счетчик использования показывает, в скольких рецептах используется категория</li>
            </ul>
          </div>

          {/* Компонент управления категориями */}
          <CategoryManager />

          {/* Дополнительная информация */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">
              💡 Советы
            </h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>
                <strong>Группировка по типам:</strong> Используйте категории для создания логических групп 
                (например, &quot;Завтрак&quot;, &quot;Обед&quot;, &quot;Ужин&quot;)
              </li>
              <li>
                <strong>Кухни мира:</strong> Добавляйте категории вроде &quot;Итальянская&quot;, &quot;Азия&quot;, &quot;Французская&quot;
              </li>
              <li>
                <strong>Характеристики:</strong> Отмечайте особенности блюд - &quot;Быстро&quot;, &quot;ПП&quot;, &quot;Вегетарианское&quot;
              </li>
              <li>
                <strong>Множественный выбор:</strong> Рецепт может иметь несколько категорий одновременно
              </li>
            </ul>
          </div>

          {/* Ссылка на рецепты */}
          <div className="text-center pt-4">
            <Link
              href="/recipes"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Перейти к рецептам →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
