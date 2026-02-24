'use client';

import type { InventoryItemWithProduct } from '@/types/inventory';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface InventoryListProps {
  items: InventoryItemWithProduct[];
  onDelete: (id: string) => void;
  onEdit: (item: InventoryItemWithProduct) => void;
  onAddNew?: () => void;
}

export default function InventoryList({ items, onDelete, onEdit, onAddNew }: InventoryListProps) {
  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 3 && daysUntilExpiry >= 0;
  };

  const isExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd.MM.yyyy', { locale: ru });
    } catch {
      return dateString;
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-lg shadow-md border-2 border-dashed border-gray-300">
        <div className="max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">🥶</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            Ваш холодильник пуст
          </h3>
          <p className="text-gray-600 mb-6">
            Начните добавлять продукты, чтобы отслеживать их количество и сроки годности
          </p>
          {onAddNew && (
            <button
              onClick={onAddNew}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-md"
            >
              ➕ Добавить первый продукт
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => {
        const expired = isExpired(item.expiry_date);
        const expiringSoon = isExpiringSoon(item.expiry_date);
        
        return (
          <div
            key={item.inventory_id}
            className={`bg-white rounded-lg shadow-md p-4 border-2 transition-all hover:shadow-lg ${
              expired
                ? 'border-red-300 bg-red-50'
                : expiringSoon
                ? 'border-yellow-300 bg-yellow-50'
                : 'border-transparent'
            }`}
          >
            {/* Заголовок карточки */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-800 truncate">
                  {item.product.name}
                </h3>
              </div>
              <div className="text-right ml-2 flex-shrink-0">
                <div className="text-2xl font-bold text-gray-800">
                  {item.quantity}
                </div>
                <div className="text-xs text-gray-600">{item.unit}</div>
              </div>
            </div>

            {/* Срок годности */}
            {item.expiry_date && (
              <div className="mb-3 pb-3 border-b">
                <div className="text-xs text-gray-500 mb-1">Срок годности</div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {formatDate(item.expiry_date)}
                  </span>
                  {expired && (
                    <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded">
                      Просрочен
                    </span>
                  )}
                  {expiringSoon && !expired && (
                    <span className="text-xs font-bold text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                      Скоро истечёт
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Дополнительная информация */}
            <div className="space-y-2 mb-3">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Добавлено:</span>
                <span className="text-gray-700">{formatDate(item.added_date)}</span>
              </div>
              {item.notes && (
                <div className="text-xs">
                  <span className="text-gray-500">Примечания:</span>
                  <p className="text-gray-700 mt-1">{item.notes}</p>
                </div>
              )}
            </div>

            {/* Кнопки действий */}
            <div className="flex gap-2 pt-3 border-t">
              <button
                onClick={() => onEdit(item)}
                className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
              >
                ✏️ Изменить
              </button>
              <button
                onClick={() => {
                  console.log('Delete button clicked for item:', item.inventory_id, 'product:', item.product.name);
                  onDelete(item.inventory_id);
                }}
                className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition"
              >
                🗑️ Удалить
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}