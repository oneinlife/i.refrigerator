'use client';

import { useCallback } from 'react';
import toast from 'react-hot-toast';
import InventoryList from '@/components/InventoryList';
import InventoryModal from '@/components/InventoryModal';
import HomeHeader from '@/components/HomeHeader';
import { InventoryProvider, useInventoryContext } from '@/providers/InventoryProvider';
import { logError } from '@/lib/errorLogger';
import type { InventoryItemWithProduct } from '@/types/inventory';

function HomeContent() {
  const {
    inventory: inventoryWithProducts,
    loading,
    deleteInventoryItem,
    openAddModal,
    openEditModal,
  } = useInventoryContext();

  const handleDeleteItem = useCallback(async (id: string) => {
    if (!confirm('Удалить этот продукт?')) return;

    try {
      const success = await deleteInventoryItem(id);
      if (success) {
        toast.success('Продукт успешно удален');
      } else {
        toast.error('Не удалось удалить продукт');
      }
    } catch (error) {
      logError('HomePage.handleDeleteItem', error);
      toast.error('Ошибка при удалении продукта');
    }
  }, [deleteInventoryItem]);

  const handleEdit = useCallback((item: InventoryItemWithProduct) => {
    const { product, ...inventoryItem } = item;
    openEditModal(inventoryItem);
  }, [openEditModal]);

  return (
    <main className="min-h-screen bg-gray-100 py-4 md:py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <HomeHeader />

        <div className="mb-6 flex justify-between items-center">
          <div className="text-sm md:text-base text-gray-600">
            Всего продуктов: <span className="font-bold">{inventoryWithProducts.length}</span>
          </div>
          <button
            onClick={openAddModal}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-md"
          >
            ➕ Добавить продукт
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Загрузка...</p>
          </div>
        ) : (
          <InventoryList
            items={inventoryWithProducts}
            onDelete={handleDeleteItem}
            onEdit={handleEdit}
            onAddNew={openAddModal}
          />
        )}

        <InventoryModal />
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <InventoryProvider>
      <HomeContent />
    </InventoryProvider>
  );
}
