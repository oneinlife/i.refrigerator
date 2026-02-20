'use client';

import { useState, useEffect, useCallback } from 'react';
import InventoryForm from '@/components/InventoryForm';
import InventoryList from '@/components/InventoryList';
import SyncButtons from '@/components/SyncButtons';
import GoogleAuth from '@/components/GoogleAuth';
import { useAutoSync } from '@/hooks/useAutoSync';
import { useProducts } from '@/hooks/useProducts';
import { useGoogleApi } from '@/components/GoogleApiProvider';
import { storageService } from '@/lib/storageService';
import { getInventorySyncService } from '@/lib/googleSheets/inventorySync';
import { logError } from '@/lib/errorLogger';
import type { InventoryItem, InventoryItemWithProduct, CreateInventoryInput } from '@/types/inventory';
import Link from 'next/link';

export default function Home() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryWithProducts, setInventoryWithProducts] = useState<InventoryItemWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  
  const { isAuthenticated, isInitialized } = useGoogleApi();
  const { products, getProductById, incrementUsageCount, loadProducts } = useProducts();

  useEffect(() => {
    loadInventory();
  }, []);

  // Синхронизация инвентаря при загрузке Google Sheets API
  useEffect(() => {
    const spreadsheetId = storageService.getSpreadsheetId();
    
    if (isInitialized && isAuthenticated && spreadsheetId) {
      console.log('🔄 Syncing inventory from Google Sheets...');
      syncInventoryFromSheets();
    }
  }, [isInitialized, isAuthenticated]);

  const syncInventoryFromSheets = async () => {
    const spreadsheetId = storageService.getSpreadsheetId();
    if (!spreadsheetId) return;

    try {
      const inventoryService = getInventorySyncService();
      const items = await inventoryService.getInventory(spreadsheetId);
      console.log(`✅ Synced ${items.length} inventory items from Google Sheets`);
      
      // Сохраняем в localStorage
      storageService.setInventory(items);
      
      // Обновляем состояние
      setInventory(items);
    } catch (error) {
      console.error('❌ Failed to sync inventory from Google Sheets:', error);
      logError('HomePage.syncInventoryFromSheets', error);
    }
  };

  const loadInventory = () => {
    setLoading(true);
    try {
      const items = storageService.getInventory();
      setInventory(items);
    } catch (error) {
      logError('HomePage.loadInventory', error);
    } finally {
      setLoading(false);
    }
  };

  const joinInventoryWithProducts = useCallback(() => {
    const joined: InventoryItemWithProduct[] = inventory
      .map(item => {
        const product = getProductById(item.product_id);
        if (!product) {
          console.warn(`⚠️ Product not found for inventory item ${item.inventory_id}`);
          return null;
        }
        return {
          ...item,
          product,
        };
      })
      .filter((item): item is InventoryItemWithProduct => item !== null);
    
    setInventoryWithProducts(joined);
  }, [inventory, getProductById]);

  // Объединить Inventory с данными Products
  useEffect(() => {
    if (products.length > 0) {
      joinInventoryWithProducts();
    }
  }, [inventory, products, joinInventoryWithProducts]);

  const handleAddItem = async (input: CreateInventoryInput) => {
    const newItem: InventoryItem = {
      inventory_id: crypto.randomUUID(),
      product_id: input.product_id,
      quantity: input.quantity,
      unit: input.unit,
      expiry_date: input.expiry_date || undefined,
      added_date: new Date().toISOString(),
      notes: input.notes || undefined,
    };
    
    // Увеличить счетчик использования продукта
    if (isAuthenticated) {
      try {
        await incrementUsageCount(input.product_id);
      } catch (error) {
        logError('HomePage.handleAddItem.incrementUsageCount', error);
        // Продолжаем добавление в инвентарь даже если не удалось обновить usage_count
      }
    }
    
    // Сохранить в localStorage
    storageService.addItem(newItem);
    
    // Синхронизировать с Google Sheets, если авторизован
    if (isAuthenticated) {
      const spreadsheetId = storageService.getSpreadsheetId();
      if (spreadsheetId) {
        try {
          const inventoryService = getInventorySyncService();
          await inventoryService.addInventoryItem(spreadsheetId, input);
          console.log('Inventory item synced to Google Sheets');
        } catch (error) {
          logError('HomePage.handleAddItem.syncToSheets', error);
          // Продолжаем, даже если синхронизация не удалась - данные сохранены в localStorage
          alert('Продукт добавлен локально, но не удалось синхронизировать с Google Sheets. Попробуйте синхронизировать позже.');
        }
      }
    }
    
    loadInventory();
  };

  const handleUpdateItem = async (input: CreateInventoryInput) => {
    if (!editItem) return;

    const updatedItem: InventoryItem = {
      ...editItem,
      product_id: input.product_id,
      quantity: input.quantity,
      unit: input.unit,
      expiry_date: input.expiry_date || undefined,
      notes: input.notes || undefined,
    };

    const success = storageService.updateItem(updatedItem);
    if (success) {
      // Синхронизируем с Google Sheets
      const spreadsheetId = storageService.getSpreadsheetId();
      if (spreadsheetId && isAuthenticated) {
        try {
          const inventoryService = getInventorySyncService();
          const updated = await inventoryService.updateInventoryItem(spreadsheetId, updatedItem);
          if (updated) {
            console.log('Inventory item updated in Google Sheets');
          } else {
            console.warn('Failed to update item in Google Sheets, but updated locally');
          }
        } catch (error) {
          logError('HomePage.handleUpdateItem.syncToSheets', error);
          alert('Продукт обновлен локально, но не удалось обновить в Google Sheets. Попробуйте синхронизировать позже.');
        }
      }
      
      loadInventory();
      setEditItem(null);
    }
  };

  const handleDeleteItem = async (id: string) => {
    console.log('handleDeleteItem called with id:', id);
    if (!confirm('Удалить этот продукт?')) return;

    console.log('Deleting item from localStorage...');
    const success = storageService.deleteItem(id);
    console.log('deleteItem result:', success);
    
    if (success) {
      // Синхронизируем с Google Sheets
      const spreadsheetId = storageService.getSpreadsheetId();
      if (spreadsheetId && isAuthenticated) {
        try {
          console.log('Deleting from Google Sheets...');
          const inventoryService = getInventorySyncService();
          const deleted = await inventoryService.deleteInventoryItem(spreadsheetId, id);
          if (deleted) {
            console.log('Inventory item deleted from Google Sheets');
          } else {
            console.warn('Failed to delete item from Google Sheets, but deleted locally');
          }
        } catch (error) {
          logError('HomePage.handleDeleteItem.syncToSheets', error);
          console.error('Error deleting from Google Sheets:', error);
          alert('Продукт удален локально, но не удалось удалить из Google Sheets. Попробуйте синхронизировать позже.');
        }
      }
      
      console.log('Reloading inventory...');
      loadInventory();
    } else {
      console.error('Failed to delete item from localStorage');
    }
  };

  const handleEdit = (item: InventoryItemWithProduct) => {
    // Преобразуем InventoryItemWithProduct обратно в InventoryItem для редактирования
    const { product, ...inventoryItem } = item;
    setEditItem(inventoryItem);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditItem(null);
  };

  const handleSyncComplete = (items: InventoryItem[]) => {
    console.log('handleSyncComplete called with', items.length, 'items');
    // Сохраняем в localStorage через storageService
    storageService.setInventory(items);
    console.log('Saved to localStorage');
    // Перезагружаем из localStorage для синхронизации состояния
    loadInventory();
  };

  // Автоматическая синхронизация
  const handleAutoSync = useCallback(() => {
    loadInventory();
  }, []);

  useAutoSync({
    enabled: storageService.getAutoSync() && isAuthenticated,
    interval: storageService.getSyncInterval(),
    onSync: handleAutoSync,
  });

  return (
    <main className="min-h-screen bg-gray-100 py-4 md:py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <header className="mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-2xl md:text-4xl font-bold text-gray-800 mb-2">
                ❄️ i.refrigerator
              </h1>
              <p className="text-sm md:text-base text-gray-600">
                Управление инвентарем холодильника с синхронизацией в Google Sheets
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <GoogleAuth />
              <Link
                href="/recipe-search"
                className="px-4 py-2 bg-purple-200 text-purple-800 rounded hover:bg-purple-300 transition text-center whitespace-nowrap font-medium"
              >
                🔍 Что приготовить?
              </Link>
              <Link
                href="/shopping-list"
                className="px-4 py-2 bg-orange-200 text-orange-800 rounded hover:bg-orange-300 transition text-center whitespace-nowrap"
              >
                🛒 Список покупок
              </Link>
              <Link
                href="/recipes"
                className="px-4 py-2 bg-green-200 text-green-800 rounded hover:bg-green-300 transition text-center whitespace-nowrap"
              >
                🍳 Рецепты
              </Link>
              <Link
                href="/products"
                className="px-4 py-2 bg-blue-200 text-blue-800 rounded hover:bg-blue-300 transition text-center whitespace-nowrap"
              >
                📦 Справочник
              </Link>
              <Link
                href="/settings"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition text-center whitespace-nowrap"
              >
                ⚙️ Настройки
              </Link>
            </div>
          </div>
        </header>

        <SyncButtons
          onSync={handleSyncComplete}
          items={inventory}
          isAuthenticated={isAuthenticated}
        />

        <InventoryForm 
          onSubmit={editItem ? handleUpdateItem : handleAddItem}
          editItem={editItem}
          onProductCreated={loadProducts}
        />

        {editItem && (
          <button
            onClick={handleCancelEdit}
            className="mb-4 w-full sm:w-auto px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
          >
            ❌ Отменить редактирование
          </button>
        )}

        <div className="mb-4 text-sm md:text-base text-gray-600">
          Всего продуктов: <span className="font-bold">{inventoryWithProducts.length}</span>
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
          />
        )}
      </div>
    </main>
  );
}
