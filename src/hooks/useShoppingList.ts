'use client';

import { useState, useEffect, useCallback } from 'react';
import { getShoppingListSyncService } from '@/lib/googleSheets/shoppingListSync';
import { getInventorySyncService } from '@/lib/googleSheets/inventorySync';
import { getProductsSyncService } from '@/lib/googleSheets/productsSync';
import { storageService } from '@/lib/storageService';
import { convertToBaseUnit } from '@/lib/unitConverter';
import type { 
  ShoppingListItem, 
  ShoppingListItemWithDetails, 
  CreateShoppingItemInput,
  GroupedShoppingList 
} from '@/types/shopping';
import type { RecipeMatch } from '@/types/recipe';
import type { Product } from '@/types/product';

interface UseShoppingListResult {
  items: ShoppingListItemWithDetails[];
  loading: boolean;
  error: string | null;
  
  loadShoppingList: () => Promise<void>;
  addItem: (input: CreateShoppingItemInput) => Promise<void>;
  createFromRecipe: (recipeMatch: RecipeMatch, recipeId: string, recipeName: string) => Promise<void>;
  markAsChecked: (shoppingItemId: string) => Promise<void>;
  unmarkChecked: (shoppingItemId: string) => Promise<void>;
  deleteItem: (shoppingItemId: string) => Promise<void>;
  clearChecked: () => Promise<void>;
  addCheckedToInventory: () => Promise<void>;
  
  // Утилиты
  getUnchecked: () => ShoppingListItemWithDetails[];
  getChecked: () => ShoppingListItemWithDetails[];
  getGroupedList: () => GroupedShoppingList[];
  
  // Статистика
  stats: {
    total: number;
    checked: number;
    unchecked: number;
  };
}

export function useShoppingList(): UseShoppingListResult {
  const [items, setItems] = useState<ShoppingListItemWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);

  // Инициализация spreadsheetId
  useEffect(() => {
    const id = storageService.getSpreadsheetId();
    console.log('useShoppingList - spreadsheetId initialized:', id);
    setSpreadsheetId(id);
  }, []);

  /**
   * Загрузить список покупок с деталями о продуктах
   */
  const loadShoppingList = useCallback(async () => {
    if (!spreadsheetId) {
      setError('Spreadsheet ID not found');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const shoppingListSync = getShoppingListSyncService();
      const productsSync = getProductsSyncService();
      
      const [shoppingItems, products] = await Promise.all([
        shoppingListSync.getAllItems(spreadsheetId),
        productsSync.getAllProducts(spreadsheetId),
      ]);
      
      // Сохраняем в localStorage
      storageService.setShoppingList(shoppingItems);
      
      const productMap = new Map(products.map(p => [p.product_id, p]));
      
      const itemsWithDetails: ShoppingListItemWithDetails[] = shoppingItems.map(item => ({
        ...item,
        product: productMap.get(item.product_id) || {
          product_id: item.product_id,
          name: 'Unknown Product',
          category: 'Другое',
          default_unit: item.unit,
          created_date: new Date().toISOString(),
          usage_count: 0,
        },
      }));
      
      setItems(itemsWithDetails);
    } catch (err) {
      console.error('Failed to load shopping list from Google Sheets:', err);
      console.log('Loading from localStorage (offline mode)...');
      
      // В случае ошибки загружаем из localStorage (офлайн режим)
      const cachedItems = storageService.getShoppingList();
      if (cachedItems.length > 0) {
        // Пытаемся загрузить продукты для отображения деталей
        const productMap = new Map<string, Product>();
        const itemsWithDetails: ShoppingListItemWithDetails[] = cachedItems.map(item => ({
          ...item,
          product: productMap.get(item.product_id) || {
            product_id: item.product_id,
            name: 'Unknown Product',
            category: 'Другое',
            default_unit: item.unit,
            created_date: new Date().toISOString(),
            usage_count: 0,
          },
        }));
        setItems(itemsWithDetails);
        setError('Работа в офлайн режиме');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load shopping list');
      }
    } finally {
      setLoading(false);
    }
  }, [spreadsheetId]);

  /**
   * Добавить элемент в список покупок
   */
  const addItem = useCallback(async (input: CreateShoppingItemInput) => {
    if (!spreadsheetId) {
      setError('Spreadsheet ID not found');
      return;
    }
    
    setLoading(true);
    setError(null);

    // Конвертируем единицы измерения в базовые
    const converted = convertToBaseUnit(input.quantity_to_buy, input.unit);
    const normalizedInput: CreateShoppingItemInput = {
      ...input,
      quantity_needed: convertToBaseUnit(input.quantity_needed, input.unit).quantity,
      quantity_available: input.quantity_available 
        ? convertToBaseUnit(input.quantity_available, input.unit).quantity 
        : 0,
      quantity_to_buy: converted.quantity,
      unit: converted.unit,
    };

    console.log('🔄 Unit conversion in shopping list:', {
      original: `${input.quantity_to_buy} ${input.unit}`,
      converted: `${converted.quantity} ${converted.unit}`
    });

    // Создаем новый элемент и сохраняем локально сразу
    const newItem: ShoppingListItem = {
      shopping_item_id: crypto.randomUUID(),
      product_id: normalizedInput.product_id,
      recipe_id: normalizedInput.recipe_id,
      quantity_needed: normalizedInput.quantity_needed,
      quantity_available: normalizedInput.quantity_available,
      quantity_to_buy: normalizedInput.quantity_to_buy,
      unit: normalizedInput.unit,
      checked: false,
      added_date: new Date().toISOString(),
    };
    storageService.addShoppingItem(newItem);

    try {
      const shoppingListSync = getShoppingListSyncService();
      await shoppingListSync.addItem(spreadsheetId, normalizedInput);
      await loadShoppingList();
    } catch (err) {
      console.error('Failed to add item to Google Sheets:', err);
      console.log('Item added locally (offline mode)');
      // Оставляем локальное изменение, просто обновляем отображение
      await loadShoppingList();
    } finally {
      setLoading(false);
    }
  }, [spreadsheetId, loadShoppingList]);

  /**
   * Создать список покупок из недостающих продуктов рецепта
   */
  const createFromRecipe = useCallback(async (
    recipeMatch: RecipeMatch, 
    recipeId: string, 
    recipeName: string
  ) => {
    console.log('useShoppingList.createFromRecipe called:', {
      recipeId,
      recipeName,
      missing_quantities_count: recipeMatch.missing_quantities.length,
      missing_quantities: recipeMatch.missing_quantities,
      spreadsheetId
    });
    
    if (!spreadsheetId) {
      setError('Spreadsheet ID not found');
      console.error('createFromRecipe: Spreadsheet ID not found');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const shoppingListSync = getShoppingListSyncService();
      const inventorySync = getInventorySyncService();
      
      console.log('Fetching current shopping items and inventory...');
      // Получить текущий список покупок и инвентарь
      const [currentShoppingItems, inventoryItems] = await Promise.all([
        shoppingListSync.getAllItems(spreadsheetId),
        inventorySync.getInventory(spreadsheetId),
      ]);
      
      console.log('Current shopping items:', currentShoppingItems.length);
      console.log('Inventory items:', inventoryItems.length);
      
      const inventoryMap = new Map(
        inventoryItems.map(item => [item.product_id, item.quantity])
      );
      
      console.log('Creating new shopping items from missing quantities...');
      // Создать список покупок из недостающих продуктов
      // Примечание: missing_quantities уже содержат количество в базовых единицах (из recipeMatcher)
      const newItems: CreateShoppingItemInput[] = recipeMatch.missing_quantities.map(missing => {
        const quantityAvailable = inventoryMap.get(missing.product_id) || 0;
        
        const item = {
          product_id: missing.product_id,
          recipe_id: recipeId,
          quantity_needed: missing.missing + quantityAvailable,
          quantity_available: quantityAvailable,
          quantity_to_buy: missing.missing,
          unit: missing.unit, // Уже в базовой единице
          checked: false,
        };
        
        console.log('New shopping item created:', item);
        return item;
      });
      
      console.log('Total new items created:', newItems.length);
      
      // Фильтровать элементы, которые уже есть в списке покупок для этого рецепта
      const existingProductIds = new Set(
        currentShoppingItems
          .filter(item => item.recipe_id === recipeId)
          .map(item => item.product_id)
      );
      
      console.log('Existing product IDs for this recipe:', Array.from(existingProductIds));
      
      const itemsToAdd = newItems.filter(item => !existingProductIds.has(item.product_id));
      
      console.log('Items to add after filtering:', itemsToAdd.length, itemsToAdd);
      
      if (itemsToAdd.length > 0) {
        console.log('Adding items to shopping list...');
        await shoppingListSync.addItemsBatch(spreadsheetId, itemsToAdd);
        console.log('Items added successfully');
      } else {
        console.log('No new items to add (all already exist in shopping list)');
      }
      
      console.log('Reloading shopping list...');
      await loadShoppingList();
    } catch (err) {
      console.error('Failed to create shopping list from recipe:', err);
      setError(err instanceof Error ? err.message : 'Failed to create shopping list');
    } finally {
      setLoading(false);
    }
  }, [spreadsheetId, loadShoppingList]);

  /**
   * Отметить элемент как купленный
   */
  const markAsChecked = useCallback(async (shoppingItemId: string) => {
    if (!spreadsheetId) return;
    
    setLoading(true);
    setError(null);

    // Обновляем локально сразу для быстрого отклика
    const cachedItems = storageService.getShoppingList();
    const itemIndex = cachedItems.findIndex(item => item.shopping_item_id === shoppingItemId);
    if (itemIndex !== -1) {
      cachedItems[itemIndex].checked = true;
      cachedItems[itemIndex].purchased_date = new Date().toISOString();
      storageService.setShoppingList(cachedItems);
    }

    try {
      const shoppingListSync = getShoppingListSyncService();
      await shoppingListSync.markAsChecked(spreadsheetId, shoppingItemId);
      await loadShoppingList();
    } catch (err) {
      console.error('Failed to mark as checked in Google Sheets:', err);
      console.log('Item marked locally (offline mode)');
      // Оставляем локальное изменение, просто обновляем отображение
      await loadShoppingList();
    } finally {
      setLoading(false);
    }
  }, [spreadsheetId, loadShoppingList]);

  /**
   * Снять отметку с элемента
   */
  const unmarkChecked = useCallback(async (shoppingItemId: string) => {
    if (!spreadsheetId) return;
    
    setLoading(true);
    setError(null);

    // Обновляем локально сразу для быстрого отклика
    const cachedItems = storageService.getShoppingList();
    const itemIndex = cachedItems.findIndex(item => item.shopping_item_id === shoppingItemId);
    if (itemIndex !== -1) {
      cachedItems[itemIndex].checked = false;
      cachedItems[itemIndex].purchased_date = undefined;
      storageService.setShoppingList(cachedItems);
    }

    try {
      const shoppingListSync = getShoppingListSyncService();
      await shoppingListSync.unmarkChecked(spreadsheetId, shoppingItemId);
      await loadShoppingList();
    } catch (err) {
      console.error('Failed to unmark checked in Google Sheets:', err);
      console.log('Item unmarked locally (offline mode)');
      // Оставляем локальное изменение, просто обновляем отображение
      await loadShoppingList();
    } finally {
      setLoading(false);
    }
  }, [spreadsheetId, loadShoppingList]);

  /**
   * Удалить элемент из списка покупок
   */
  const deleteItem = useCallback(async (shoppingItemId: string) => {
    if (!spreadsheetId) return;
    
    setLoading(true);
    setError(null);

    // Удаляем локально сразу для быстрого отклика
    storageService.deleteShoppingItem(shoppingItemId);

    try {
      const shoppingListSync = getShoppingListSyncService();
      await shoppingListSync.deleteItem(spreadsheetId, shoppingItemId);
      await loadShoppingList();
    } catch (err) {
      console.error('Failed to delete item in Google Sheets:', err);
      console.log('Item deleted locally (offline mode)');
      // Оставляем локальное изменение, просто обновляем отображение
      await loadShoppingList();
    } finally {
      setLoading(false);
    }
  }, [spreadsheetId, loadShoppingList]);

  /**
   * Очистить купленные элементы (удалить отмеченные)
   */
  const clearChecked = useCallback(async () => {
    if (!spreadsheetId) return;
    
    setLoading(true);
    setError(null);

    // Очищаем локально сразу для быстрого отклика
    const cachedItems = storageService.getShoppingList();
    const uncheckedItems = cachedItems.filter(item => !item.checked);
    storageService.setShoppingList(uncheckedItems);

    try {
      const shoppingListSync = getShoppingListSyncService();
      const count = await shoppingListSync.clearChecked(spreadsheetId);
      console.log(`Cleared ${count} checked items`);
      await loadShoppingList();
    } catch (err) {
      console.error('Failed to clear checked items in Google Sheets:', err);
      console.log('Items cleared locally (offline mode)');
      // Оставляем локальное изменение, просто обновляем отображение
      await loadShoppingList();
    } finally {
      setLoading(false);
    }
  }, [spreadsheetId, loadShoppingList]);

  /**
   * Добавить купленные элементы в инвентарь
   */
  const addCheckedToInventory = useCallback(async () => {
    if (!spreadsheetId) return;

    setLoading(true);
    setError(null);

    try {
      const inventorySync = getInventorySyncService();
      const checkedItems = items.filter(item => item.checked);
      
      // Элементы уже в базовых единицах, можно добавлять напрямую
      for (const item of checkedItems) {
        await inventorySync.addInventoryItem(
          spreadsheetId,
          {
            product_id: item.product_id,
            quantity: item.quantity_to_buy, // Уже в базовой единице
            unit: item.unit, // Уже базовая единица
            expiry_date: undefined,
            notes: `Добавлено из списка покупок`,
          }
        );
      }
      
      await loadShoppingList();
    } catch (err) {
      console.error('Failed to add checked items to inventory:', err);
      setError(err instanceof Error ? err.message : 'Failed to add to inventory');
    } finally {
      setLoading(false);
    }
  }, [spreadsheetId, items, loadShoppingList]);

  /**
   * Получить непокупленные элементы
   */
  const getUnchecked = useCallback(() => {
    return items.filter(item => !item.checked);
  }, [items]);

  /**
   * Получить покупленные элементы
   */
  const getChecked = useCallback(() => {
    return items.filter(item => item.checked);
  }, [items]);

  /**
   * Получить сгруппированный список по категориям (рецептам)
   */
  const getGroupedList = useCallback((): GroupedShoppingList[] => {
    const groups = new Map<string, ShoppingListItemWithDetails[]>();
    
    items.forEach(item => {
      // Группируем по recipe_id или 'Другое' для элементов без рецепта
      const groupKey = item.recipe_id || 'Другое';
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(item);
    });
    
    return Array.from(groups.entries()).map(([group_name, items]) => ({
      group_name,
      items,
      total_items: items.length,
      checked_items: items.filter(i => i.checked).length,
    }));
  }, [items]);

  /**
   * Статистика
   */
  const stats = {
    total: items.length,
    checked: items.filter(item => item.checked).length,
    unchecked: items.filter(item => !item.checked).length,
  };

  // Загрузить список покупок при монтировании
  useEffect(() => {
    if (spreadsheetId) {
      loadShoppingList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spreadsheetId]); // Не включаем loadShoppingList в зависимости, чтобы избежать бесконечного цикла

  return {
    items,
    loading,
    error,
    
    loadShoppingList,
    addItem,
    createFromRecipe,
    markAsChecked,
    unmarkChecked,
    deleteItem,
    clearChecked,
    addCheckedToInventory,
    
    getUnchecked,
    getChecked,
    getGroupedList,
    
    stats,
  };
}
