'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useProducts } from '@/hooks/useProducts';
import type { Product } from '@/types/product';

export default function ProductsPage() {
  const {
    products,
    loading,
    error,
    deleteProduct,
    getMostUsed,
  } = useProducts();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'usage' | 'date'>('usage');

  // Фильтрация и сортировка
  const filteredProducts = products
    .filter(product => {
      // Фильтр по поиску
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          product.name.toLowerCase().includes(query) ||
          product.aliases?.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name, 'ru');
        case 'usage':
          return b.usage_count - a.usage_count;
        case 'date':
          return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
        default:
          return 0;
      }
    });

  const handleDelete = async (productId: string, productName: string) => {
    if (!confirm(`Удалить продукт "${productName}" из справочника?`)) {
      return;
    }

    const success = await deleteProduct(productId);
    if (success) {
      alert('Продукт удален');
    } else {
      alert('Не удалось удалить продукт');
    }
  };

  const mostUsed = getMostUsed(5);

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
                📦 Справочник продуктов
              </h1>
              <p className="text-sm md:text-base text-gray-600 mt-2">
                Управление базой продуктов для автодополнения
              </p>
            </div>
          </div>
        </header>

        {/* Статистика */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-gray-600 text-sm">Всего продуктов</div>
              <div className="text-3xl font-bold text-blue-600">{products.length}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-gray-600 text-sm">Самый используемый</div>
              <div className="text-lg font-bold text-purple-600 truncate">
                {mostUsed[0]?.name || '—'}
              </div>
              {mostUsed[0] && (
                <div className="text-xs text-gray-500">
                  использован {mostUsed[0].usage_count}x
                </div>
              )}
            </div>
          </div>
        )}

        {/* Фильтры и поиск */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Поиск</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Название или алиас..."
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
                <option value="usage">По использованию</option>
                <option value="name">По алфавиту</option>
                <option value="date">По дате добавления</option>
              </select>
            </div>
          </div>
        </div>

        {/* Топ используемых */}
        {!loading && mostUsed.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h2 className="text-lg font-bold mb-3">⭐ Топ используемых продуктов</h2>
            <div className="flex flex-wrap gap-2">
              {mostUsed.map((product, index) => (
                <div
                  key={product.product_id}
                  className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                >
                  <span className="font-bold">#{index + 1}</span>
                  <span>{product.name}</span>
                  <span className="text-xs opacity-75">({product.usage_count}x)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Список продуктов */}
        {loading ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg">Загрузка продуктов...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            <p className="font-bold">Ошибка загрузки:</p>
            <p>{error}</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg">Продукты не найдены</p>
            {searchQuery && (
              <p className="text-sm text-gray-400 mt-2">Попробуйте изменить фильтр поиска</p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Название
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Категория
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Ед. изм.
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Использовано
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Срок хранения
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredProducts.map((product) => (
                  <tr key={product.product_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{product.name}</div>
                      {product.aliases && (
                        <div className="text-xs text-gray-500">
                          Алиасы: {product.aliases}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {product.default_unit}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {product.usage_count}x
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {product.typical_shelf_life_days
                        ? `${product.typical_shelf_life_days} дней`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(product.product_id, product.name)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 text-center text-sm text-gray-500">
          Показано продуктов: {filteredProducts.length} из {products.length}
        </div>
      </div>
    </main>
  );
}
