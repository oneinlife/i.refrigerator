'use client';

import { useState, useRef, useEffect } from 'react';
import { getCategoriesManager } from '@/lib/categoriesManager';
import { useGoogleApi } from '@/components/GoogleApiProvider';

interface CategorySelectorProps {
  /** Выбранные категории (массив строк) */
  selectedCategories: string[];
  
  /** Колбэк при изменении выбранных категорий */
  onChange: (categories: string[]) => void;
  
  /** Плейсхолдер для поля ввода */
  placeholder?: string;
  
  /** Disabled состояние */
  disabled?: boolean;
}

/**
 * Компонент множественного выбора категорий с автодополнением
 * Показывает выбранные категории как чипы
 */
export default function CategorySelector({
  selectedCategories,
  onChange,
  placeholder = 'Добавить категорию...',
  disabled = false,
}: CategorySelectorProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const categoriesManager = getCategoriesManager();
  const { isAuthenticated } = useGoogleApi();

  // Загрузить подсказки при изменении ввода
  useEffect(() => {
    const loadSuggestions = async () => {
      // Не загружаем пока пользователь не авторизован
      if (!isAuthenticated) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }

      try {
        if (inputValue.trim() === '') {
          // Показать популярные категории
          setIsLoading(true);
          const mostUsed = await categoriesManager.getMostUsedCategories(10);
          // Отфильтровать уже выбранные
          const filtered = mostUsed.filter(cat => !selectedCategories.includes(cat));
          setSuggestions(filtered);
          setIsLoading(false);
          setIsOpen(filtered.length > 0);
          return;
        }

        setIsLoading(true);
        const suggested = await categoriesManager.suggestCategories(inputValue, 10);
        // Отфильтровать уже выбранные
        const filtered = suggested.filter(cat => !selectedCategories.includes(cat));
        setSuggestions(filtered);
        setIsLoading(false);
        setIsOpen(filtered.length > 0);
        setHighlightedIndex(-1);
      } catch (error) {
        console.error('Failed to load category suggestions:', error);
        setIsLoading(false);
        // В случае ошибки показать базовые категории
        setSuggestions([]);
        setIsOpen(false);
      }
    };

    const timeoutId = setTimeout(loadSuggestions, 150);
    return () => clearTimeout(timeoutId);
  }, [inputValue, selectedCategories, categoriesManager, isAuthenticated]);

  // Закрытие при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const addCategory = (category: string) => {
    const trimmed = category.trim();
    if (!trimmed) return;
    
    // Проверить, не добавлена ли уже
    if (selectedCategories.includes(trimmed)) {
      setInputValue('');
      setIsOpen(false);
      return;
    }

    onChange([...selectedCategories, trimmed]);
    setInputValue('');
    setIsOpen(false);
  };

  const removeCategory = (category: string) => {
    onChange(selectedCategories.filter(c => c !== category));
  };

  const handleSuggestionClick = (category: string) => {
    addCategory(category);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          addCategory(suggestions[highlightedIndex]);
        } else if (inputValue.trim()) {
          // Добавить как новую категорию
          addCategory(inputValue);
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (isOpen && suggestions.length > 0) {
          setHighlightedIndex(prev =>
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (isOpen && suggestions.length > 0) {
          setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
        }
        break;

      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;

      case 'Backspace':
        // Удалить последнюю категорию, если поле ввода пустое
        if (inputValue === '' && selectedCategories.length > 0) {
          e.preventDefault();
          removeCategory(selectedCategories[selectedCategories.length - 1]);
        }
        break;
    }
  };

  return (
    <div className="w-full">
      {/* Чипы с выбранными категориями */}
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedCategories.map(category => (
            <div
              key={category}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              <span>{category}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeCategory(category)}
                  className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
                  aria-label={`Удалить ${category}`}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Поле ввода */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
        />

        {/* Выпадающий список с подсказками */}
        {isOpen && !disabled && (
          <div
            ref={dropdownRef}
            className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
          >
            {isLoading ? (
              <div className="px-4 py-3 text-center text-gray-500 text-sm">
                Загрузка...
              </div>
            ) : suggestions.length > 0 ? (
              <>
                {inputValue.trim() === '' && (
                  <div className="px-4 py-2 text-xs text-gray-500 font-medium border-b">
                    Популярные категории
                  </div>
                )}
                {suggestions.map((category, index) => (
                  <div
                    key={category}
                    onClick={() => handleSuggestionClick(category)}
                    className={`px-4 py-2 cursor-pointer transition-colors ${
                      index === highlightedIndex
                        ? 'bg-blue-100'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-gray-900">{category}</span>
                  </div>
                ))}
              </>
            ) : inputValue.trim() && (
              <div className="px-4 py-3 text-center text-sm">
                <div className="text-gray-500 mb-1">Категория не найдена</div>
                <button
                  type="button"
                  onClick={() => addCategory(inputValue)}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Создать &quot;{inputValue}&quot;
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Подсказка */}
      <p className="mt-1 text-xs text-gray-500">
        Начните вводить или выберите из списка. Нажмите Enter для добавления.
      </p>
    </div>
  );
}
