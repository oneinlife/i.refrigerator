'use client';

import { useEffect } from 'react';
import { useInventoryContext } from '@/providers/InventoryProvider';
import { useProducts } from '@/hooks/useProducts';
import InventoryForm from './InventoryForm';
import type { CreateInventoryInput, InventoryItem } from '@/types/inventory';
import { logError } from '@/lib/errorLogger';

export default function InventoryModal() {
  const {
    modalState,
    closeModal,
    addInventoryItem,
    updateInventoryItem,
  } = useInventoryContext();
  
  const { incrementUsageCount, loadProducts } = useProducts();

  // Блокировка скролла основного контента при открытой модалке
  useEffect(() => {
    if (modalState.isOpen) {
      // Сохраняем текущую позицию скролла
      const scrollY = window.scrollY;
      
      // Блокируем скролл
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      return () => {
        // Восстанавливаем скролл
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        
        // Восстанавливаем позицию скролла
        window.scrollTo(0, scrollY);
      };
    }
  }, [modalState.isOpen]);

  if (!modalState.isOpen) {
    return null;
  }

  const handleAddItem = async (input: CreateInventoryInput) => {
    try {
      // Увеличить счетчик использования продукта
      await incrementUsageCount(input.product_id);
    } catch (error) {
      logError('InventoryModal.handleAddItem.incrementUsageCount', error);
      // Продолжаем добавление в инвентарь даже если не удалось обновить usage_count
    }

    try {
      await addInventoryItem(input);
      console.log('Inventory item added successfully');
      closeModal();
    } catch (error) {
      logError('InventoryModal.handleAddItem', error);
      alert('Не удалось добавить продукт. Попробуйте еще раз.');
    }
  };

  const handleUpdateItem = async (input: CreateInventoryInput) => {
    if (!modalState.editItem) return;

    const updatedItem: InventoryItem = {
      ...modalState.editItem,
      product_id: input.product_id,
      quantity: input.quantity,
      unit: input.unit,
      expiry_date: input.expiry_date || undefined,
      notes: input.notes || undefined,
    };

    try {
      const success = await updateInventoryItem(updatedItem);
      if (success) {
        console.log('Inventory item updated successfully');
        closeModal();
      } else {
        alert('Не удалось обновить продукт. Попробуйте еще раз.');
      }
    } catch (error) {
      logError('InventoryModal.handleUpdateItem', error);
      alert('Ошибка при обновлении продукта.');
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 md:p-4"
      onClick={(e) => {
        // Закрываем модалку при клике на оверлей (только для десктопа)
        if (e.target === e.currentTarget) {
          closeModal();
        }
      }}
    >
      <div className="bg-white h-full w-full md:h-auto md:max-h-[90vh] md:rounded-lg md:max-w-3xl shadow-xl flex flex-col overflow-hidden">
        {/* Шапка модалки */}
        <div className="sticky top-0 bg-white border-b px-4 md:px-6 py-3 md:py-4 flex justify-between items-center z-10 shadow-sm flex-shrink-0">
          <h2 className="text-xl md:text-2xl font-bold">
            {modalState.editItem ? '✏️ Редактировать продукт' : '➕ Добавить продукт'}
          </h2>
          <button
            onClick={closeModal}
            className="text-gray-500 hover:text-gray-700 text-3xl leading-none w-10 h-10 flex items-center justify-center flex-shrink-0"
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
        
        {/* Контент модалки с прокруткой */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6">
            <InventoryForm
              onSubmit={modalState.editItem ? handleUpdateItem : handleAddItem}
              editItem={modalState.editItem}
              onProductCreated={loadProducts}
              hideTitle
              onCancel={closeModal}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
