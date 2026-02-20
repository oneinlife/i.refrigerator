'use client';

import { useState, useEffect } from 'react';
import type { Recipe } from '@/types/recipe';

interface CategoryFilterProps {
  /** Все рецепты для анализа */
  recipes: Recipe[];
  
  /** Выбранные категории для фильтрации */
  selectedCategories: string[];
  
  /** Колбэк при изменении выбранных категорий */
  onChange: (categories: string[]) => void;
  
  /** Класс для стилизации */
  className?: string;
}

interface CategoryCount {
  name: string;
  count: number;
}

/**
 * Компонент фильтрации рецептов по категориям
 * Показывает список категорий с количеством рецептов
 */
export default function CategoryFilter({
  recipes,
  selectedCategories,
  onChange,
  className = '',
}: CategoryFilterProps) {
  const [categoryCounts, setCategoryCounts] = useState<CategoryCount[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);

  // Подсчитать количество рецептов по категориям
  useEffect(() => {
    const counts = new Map<string, number>();

    recipes.forEach(recipe => {
      if (!recipe.categories) return;

      const categories = recipe.categories
        .split(',')
        .map(c => c.trim())
        .filter(Boolean);

      categories.forEach(category => {
        counts.set(category, (counts.get(category) || 0) + 1);
      });
    });

    // Преобразовать в массив и отсортировать по количеству
    const sorted = Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    setCategoryCounts(sorted);
  }, [recipes]);

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      onChange(selectedCategories.filter(c => c !== category));
    } else {
      onChange([...selectedCategories, category]);
    }
  };

  const clearFilters = () => {
    onChange([]);
  };

  if (categoryCounts.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-lg font-semibold text-gray-900 hover:text-gray-700"
        >
          <span>{isExpanded ? '▼' : '▶'}</span>
          <span>Категории</span>
        </button>
        
        {selectedCategories.length > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Сбросить ({selectedCategories.length})
          </button>
        )}
      </div>

      {/* Список категорий */}
      {isExpanded && (
        <div className="space-y-2">
          {categoryCounts.map(({ name, count }) => {
            const isSelected = selectedCategories.includes(name);
            
            return (
              <label
                key={name}
                className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-blue-50 hover:bg-blue-100'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleCategory(name)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span
                    className={`text-sm truncate ${
                      isSelected ? 'font-medium text-blue-900' : 'text-gray-700'
                    }`}
                    title={name}
                  >
                    {name}
                  </span>
                </div>
                
                <span
                  className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-blue-200 text-blue-800'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {count}
                </span>
              </label>
            );
          })}
        </div>
      )}

      {/* Описание активных фильтров */}
      {isExpanded && selectedCategories.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <div className="text-xs text-gray-600 mb-1">Выбрано:</div>
          <div className="flex flex-wrap gap-1">
            {selectedCategories.map(category => (
              <span
                key={category}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs"
              >
                {category}
                <button
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className="text-blue-600 hover:text-blue-800 ml-0.5"
                  aria-label={`Убрать ${category}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
