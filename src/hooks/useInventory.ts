'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { InventoryItem, InventoryItemWithProduct, CreateInventoryInput } from '@/types/inventory';
import { getInventorySyncService } from '@/lib/googleSheets/inventorySync';
import { storageService } from '@/lib/storageService';
import { useGoogleApi } from '@/components/GoogleApiProvider';
import { convertToBaseUnit } from '@/lib/unitConverter';

/**
 * Хук для работы с инвентарем холодильника
 */
export function useInventory() {
  const { isAuthenticated, isInitialized } = useGoogleApi();
  const [inventory, setInventory] = useState<InventoryItemWithProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const inventoryService = useMemo(() => getInventorySyncService(), []);
  const spreadsheetId = storageService.getSpreadsheetId();

  /**
   * Загрузить весь инвентарь
   */
  const loadInventory = useCallback(async () => {
    if (!spreadsheetId) {
      setError('Spreadsheet not configured');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await inventoryService.getInventoryWithProducts(spreadsheetId);
      setInventory(data);
      
      // Сохраняем в localStorage (без product, только InventoryItem)
      const inventoryItems = data.map(({ product, ...item }) => item);
      storageService.setInventory(inventoryItems);
      console.log(`✅ Synced ${inventoryItems.length} inventory items to localStorage`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load inventory';
      console.error('❌ Failed to load inventory from Google Sheets:', err);
      console.log('📦 Loading from localStorage (offline mode)...');
      
      // В случае ошибки загружаем из localStorage (офлайн режим)
      const cachedItems = storageService.getInventory();
      if (cachedItems.length > 0) {
        // Загружаем без product details - они будут "Unknown Product"
        // Для полноценной работы нужны данные из Google Sheets
        const itemsWithPlaceholders: InventoryItemWithProduct[] = cachedItems.map(item => ({
          ...item,
          product: {
            product_id: item.product_id,
            name: 'Unknown Product (offline)',
            default_unit: item.unit,
            created_date: new Date().toISOString(),
            usage_count: 0,
          },
        }));
        setInventory(itemsWithPlaceholders);
        console.log(`📦 Loaded ${cachedItems.length} items from localStorage`);
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [spreadsheetId, inventoryService]);

  /**
   * Автозагрузка при монтировании и авторизации
   */
  useEffect(() => {
    if (spreadsheetId && isAuthenticated && isInitialized) {
      console.log('🔄 Syncing inventory from Google Sheets...');
      loadInventory();
    }
  }, [spreadsheetId, loadInventory, isAuthenticated, isInitialized]);

  /**
   * Добавить новый продукт в инвентарь
   */
  const addInventoryItem = useCallback(async (input: CreateInventoryInput): Promise<InventoryItem | null> => {
    if (!spreadsheetId) {
      setError('Spreadsheet not configured');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Конвертируем единицы измерения в базовые перед сохранением
      const converted = convertToBaseUnit(input.quantity, input.unit);
      const normalizedInput: CreateInventoryInput = {
        ...input,
        quantity: converted.quantity,
        unit: converted.unit,
      };

      console.log('🔄 Unit conversion:', {
        original: `${input.quantity} ${input.unit}`,
        converted: `${converted.quantity} ${converted.unit}`
      });

      const newItem = await inventoryService.addInventoryItem(spreadsheetId, normalizedInput);
      
      // Сохраняем в localStorage
      storageService.addItem(newItem);
      console.log('✅ Item saved to localStorage');
      
      await loadInventory(); // Reload to get with product details
      return newItem;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add inventory item';
      setError(message);
      console.error('Failed to add inventory item:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [spreadsheetId, inventoryService, loadInventory]);

  /**
   * Обновить продукт в инвентаре
   */
  const updateInventoryItem = useCallback(async (item: InventoryItem): Promise<boolean> => {
    if (!spreadsheetId) {
      setError('Spreadsheet not configured');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Конвертируем единицы измерения в базовые перед сохранением
      const converted = convertToBaseUnit(item.quantity, item.unit);
      const normalizedItem: InventoryItem = {
        ...item,
        quantity: converted.quantity,
        unit: converted.unit,
      };

      console.log('🔄 Unit conversion on update:', {
        original: `${item.quantity} ${item.unit}`,
        converted: `${converted.quantity} ${converted.unit}`
      });

      const success = await inventoryService.updateInventoryItem(spreadsheetId, normalizedItem);
      if (success) {
        // Сохраняем в localStorage
        storageService.updateItem(normalizedItem);
        console.log('✅ Item updated in localStorage');
        
        await loadInventory(); // Reload to get updated data
      }
      return success;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update inventory item';
      setError(message);
      console.error('Failed to update inventory item:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [spreadsheetId, inventoryService, loadInventory]);

  /**
   * Удалить продукт из инвентаря
   */
  const deleteInventoryItem = useCallback(async (inventoryId: string): Promise<boolean> => {
    if (!spreadsheetId) {
      setError('Spreadsheet not configured');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const success = await inventoryService.deleteInventoryItem(spreadsheetId, inventoryId);
      if (success) {
        // Удаляем из localStorage
        storageService.deleteItem(inventoryId);
        console.log('✅ Item deleted from localStorage');
        
        setInventory(prev => prev.filter(item => item.inventory_id !== inventoryId));
      }
      return success;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete inventory item';
      setError(message);
      console.error('Failed to delete inventory item:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [spreadsheetId, inventoryService]);

  /**
   * Получить продукт по ID
   */
  const getInventoryItem = useCallback((inventoryId: string): InventoryItemWithProduct | null => {
    return inventory.find(item => item.inventory_id === inventoryId) || null;
  }, [inventory]);

  /**
   * Поиск продуктов по запросу
   */
  const searchInventory = useCallback((query: string): InventoryItemWithProduct[] => {
    const lowerQuery = query.toLowerCase();
    return inventory.filter(item =>
      item.product.name.toLowerCase().includes(lowerQuery) ||
      item.notes?.toLowerCase().includes(lowerQuery)
    );
  }, [inventory]);

  /**
   * Фильтрация по категории
   * @deprecated Категории больше не поддерживаются в новой структуре
   */
  const filterByCategory = useCallback((category: string): InventoryItemWithProduct[] => {
    return [];
  }, []);

  /**
   * Получить просроченные продукты
   */
  const getExpiredItems = useCallback((): InventoryItemWithProduct[] => {
    const now = new Date();
    return inventory.filter(item => {
      if (!item.expiry_date) return false;
      return new Date(item.expiry_date) < now;
    });
  }, [inventory]);

  /**
   * Получить скоро истекающие продукты (в течение N дней)
   */
  const getExpiringItems = useCallback((days: number = 7): InventoryItemWithProduct[] => {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    return inventory.filter(item => {
      if (!item.expiry_date) return false;
      const expiryDate = new Date(item.expiry_date);
      return expiryDate >= now && expiryDate <= futureDate;
    });
  }, [inventory]);

  return {
    inventory,
    loading,
    error,
    loadInventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    getInventoryItem,
    searchInventory,
    filterByCategory,
    getExpiredItems,
    getExpiringItems,
  };
}
