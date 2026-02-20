'use client';

import { useState, useEffect } from 'react';
import { getCategoriesManager } from '@/lib/categoriesManager';
import { useGoogleApi } from '@/components/GoogleApiProvider';
import { logError } from '@/lib/errorLogger';
import type { Category } from '@/types/category';

interface CategoryManagerProps {
  /** Класс для стилизации */
  className?: string;
  
  /** Колбэк при изменении списка категорий */
  onUpdate?: () => void;
}

/**
 * Компонент управления пользовательскими категориями
 * Позволяет создавать, удалять и переименовывать категории
 */
export default function CategoryManager({
  className = '',
  onUpdate,
}: CategoryManagerProps) {
  const { isAuthenticated } = useGoogleApi();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const categoriesManager = getCategoriesManager();

  // Загрузить категории
  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const allCategories = await categoriesManager.getCategoriesWithDetails();
      setCategories(allCategories);
    } catch (err) {
      setError('Не удалось загрузить категории');
      logError('CategoryManager.loadCategories', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadCategories();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Добавить новую категорию
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await categoriesManager.addCustomCategory(newCategoryName);
      setNewCategoryName('');
      await loadCategories();
      onUpdate?.();
    } catch (err) {
      setError('Не удалось создать категорию');
      logError('CategoryManager.handleAddCategory', err);
    } finally {
      setLoading(false);
    }
  };

  // Удалить категорию
  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Удалить категорию "${categoryName}"?`)) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await categoriesManager.deleteCategory(categoryId);
      await loadCategories();
      onUpdate?.();
    } catch (err) {
      setError('Не удалось удалить категорию');
      logError('CategoryManager.handleDeleteCategory', err);
    } finally {
      setLoading(false);
    }
  };

  // Начать редактирование
  const startEditing = (category: Category) => {
    setEditingId(category.category_id);
    setEditingName(category.name);
  };

  // Отменить редактирование
  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  // Сохранить переименование
  const saveEditing = async () => {
    if (!editingId || !editingName.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await categoriesManager.renameCategory(editingId, editingName);
      await loadCategories();
      setEditingId(null);
      setEditingName('');
      onUpdate?.();
    } catch (err) {
      setError('Не удалось переименовать категорию');
      logError('CategoryManager.saveEditing', err);
    } finally {
      setLoading(false);
    }
  };

  // Фильтр по типу
  const customCategories = categories.filter(c => c.type === 'custom');
  const predefinedCategories = categories.filter(c => c.type === 'predefined');

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Управление категориями
      </h3>

      {/* Добавление новой категории */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Добавить категорию
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            placeholder="Название категории..."
            className="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          />
          <button
            type="button"
            onClick={handleAddCategory}
            disabled={loading || !newCategoryName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Создать
          </button>
        </div>
      </div>

      {/* Ошибки */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Список категорий */}
      <div className="space-y-6">
        {/* Пользовательские категории */}
        {customCategories.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Пользовательские категории ({customCategories.length})
            </h4>
            <div className="space-y-2">
              {customCategories.map(category => (
                <div
                  key={category.category_id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                >
                  {editingId === category.category_id ? (
                    // Режим редактирования
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditing();
                          if (e.key === 'Escape') cancelEditing();
                        }}
                        className="flex-1 px-2 py-1 border rounded text-sm"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={saveEditing}
                        className="px-2 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        disabled={loading}
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="px-2 py-1 bg-gray-400 text-white rounded text-sm hover:bg-gray-500"
                        disabled={loading}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    // Обычное отображение
                    <>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {category.name}
                        </span>
                        {category.usage_count > 0 && (
                          <span className="text-xs text-gray-500">
                            использовано {category.usage_count}x
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startEditing(category)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                          disabled={loading}
                        >
                          Изменить
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(category.category_id, category.name)}
                          className="text-sm text-red-600 hover:text-red-800"
                          disabled={loading}
                        >
                          Удалить
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Предустановленные категории */}
        {predefinedCategories.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Предустановленные категории ({predefinedCategories.length})
            </h4>
            <div className="space-y-2">
              {predefinedCategories.map(category => (
                <div
                  key={category.category_id}
                  className="flex items-center justify-between p-3 bg-blue-50 rounded-md"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900">
                      {category.name}
                    </span>
                    {category.usage_count > 0 && (
                      <span className="text-xs text-gray-500">
                        использовано {category.usage_count}x
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-blue-600 font-medium">
                    Системная
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Пустое состояние */}
        {loading && categories.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Загрузка категорий...
          </div>
        )}
        
        {!loading && categories.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Категории отсутствуют. Создайте первую категорию выше.
          </div>
        )}
      </div>
    </div>
  );
}
