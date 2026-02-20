'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { InventoryItem, InventoryItemWithProduct, CreateInventoryInput } from '@/types/inventory';
import { getInventorySyncService } from '@/lib/googleSheets/inventorySync';
import { storageService } from '@/lib/storageService';
import { useGoogleApi } from '@/components/GoogleApiProvider';

/**
 * Хук для работы с инвентарем холодильника
 */
export function useInventory() {
  const { isAuthenticated } = useGoogleApi();
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load inventory';
      setError(message);
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  }, [spreadsheetId, inventoryService]);

  /**
   * Автозагрузка при монтировании
   */
  useEffect(() => {
    if (spreadsheetId && isAuthenticated) {
      loadInventory();
    }
  }, [spreadsheetId, loadInventory, isAuthenticated]);

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
      const newItem = await inventoryService.addInventoryItem(spreadsheetId, input);
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
      const success = await inventoryService.updateInventoryItem(spreadsheetId, item);
      if (success) {
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
