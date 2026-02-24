'use client';

import { useState, useRef, useEffect } from 'react';
import type { Product } from '@/types/product';

interface ProductAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onProductSelect?: (product: Product) => void;
  onEnter?: () => void;
  products: Product[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

/**
 * Компонент автодополнения для выбора продукта
 */
export default function ProductAutocomplete({
  value,
  onChange,
  onProductSelect,
  onEnter,
  products,
  placeholder = 'Начните вводить название...',
  required = false,
  disabled = false,
}: ProductAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [userInteracted, setUserInteracted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Фильтрация продуктов при изменении значения
  useEffect(() => {
    if (!value.trim()) {
      setFilteredProducts([]);
      setIsOpen(false);
      return;
    }

    const lowerQuery = value.toLowerCase().trim();
    const filtered = products.filter(product => {
      // Поиск по имени
      if (product.name.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      
      // Поиск по алиасам
      if (product.aliases) {
        const aliases = product.aliases.toLowerCase().split(',');
        return aliases.some(alias => alias.trim().includes(lowerQuery));
      }
      
      return false;
    });

    // Сортировка: точные совпадения первыми, затем по usage_count
    filtered.sort((a, b) => {
      const aExact = a.name.toLowerCase() === lowerQuery;
      const bExact = b.name.toLowerCase() === lowerQuery;
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      return b.usage_count - a.usage_count;
    });

    setFilteredProducts(filtered.slice(0, 10)); // Показываем до 10 результатов
    // Открываем dropdown только если пользователь взаимодействовал с полем
    if (userInteracted) {
      setIsOpen(true);
    }
    setHighlightedIndex(-1);
    
    console.log('ProductAutocomplete - filtered:', filtered.length, 'isOpen:', userInteracted);
  }, [value, products, userInteracted]);

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
    setUserInteracted(true);
    onChange(e.target.value);
  };

  const handleProductClick = (product: Product) => {
    onChange(product.name);
    setIsOpen(false);
    setUserInteracted(false);
    onProductSelect?.(product);
  };

  const handleFocus = () => {
    setUserInteracted(true);
    if (value && filteredProducts.length > 0) {
      setIsOpen(true);
    }
  };

  const handleBlur = () => {
    // Сбрасываем флаг взаимодействия при потере фокуса
    // Небольшая задержка, чтобы клик по элементу dropdown успел сработать
    setTimeout(() => {
      setUserInteracted(false);
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filteredProducts.length === 0) {
      // Если выпадающий список закрыт или пуст, обрабатываем Enter отдельно
      if (e.key === 'Enter' && value.trim()) {
        e.preventDefault();
        onEnter?.();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredProducts.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        if (highlightedIndex >= 0 && highlightedIndex < filteredProducts.length) {
          e.preventDefault();
          handleProductClick(filteredProducts[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete="off"
      />

      {isOpen && filteredProducts.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {filteredProducts.map((product, index) => (
            <div
              key={product.product_id}
              onClick={() => handleProductClick(product)}
              className={`px-4 py-2 cursor-pointer transition-colors ${
                index === highlightedIndex
                  ? 'bg-blue-100'
                  : 'hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{product.name}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <span>{product.default_unit}</span>
                    {product.usage_count > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-blue-600">
                          использовано {product.usage_count}x
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {value && filteredProducts.length === 0 && isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4 text-center text-gray-500 text-sm"
        >
          Продукт не найден. Будет создан новый.
        </div>
      )}
    </div>
  );
}
