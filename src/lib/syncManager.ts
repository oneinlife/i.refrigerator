'use client';

import { getCacheService } from './cacheService';
import { getProductsSyncService } from './googleSheets/productsSync';
import { getInventorySyncService } from './googleSheets/inventorySync';
import { getRecipesSyncService } from './googleSheets/recipesSync';
import { getShoppingListSyncService } from './googleSheets/shoppingListSync';
import { getCategoriesSyncService } from './googleSheets/categoriesSync';
import { storageService } from './storageService';
import { logError } from './errorLogger';
import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';
import type { InventoryItemWithProduct } from '@/types/inventory';
import type { ShoppingListItemWithDetails } from '@/types/shopping';
import type { Category } from '@/types/category';

/**
 * Результат синхронизации
 */
export interface SyncResult {
  success: boolean;
  timestamp: number;
  errors: string[];
  synced: {
    products?: number;
    recipes?: number;
    inventory?: number;
    shoppingList?: number;
    categories?: number;
  };
}

/**
 * Статус синхронизации
 */
export enum SyncStatus {
  IDLE = 'idle',
  SYNCING = 'syncing',
  SUCCESS = 'success',
  ERROR = 'error',
  OFFLINE = 'offline',
}

/**
 * Менеджер синхронизации данных с Google Sheets
 * Управляет загрузкой, выгрузкой и кэшированием всех данных
 */
export class SyncManager {
  private cacheService = getCacheService();
  private currentStatus: SyncStatus = SyncStatus.IDLE;
  private statusListeners: ((status: SyncStatus) => void)[] = [];

  /**
   * Проверить, онлайн ли приложение
   */
  isOnline(): boolean {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  }

  /**
   * Получить текущий статус синхронизации
   */
  getStatus(): SyncStatus {
    if (!this.isOnline()) return SyncStatus.OFFLINE;
    return this.currentStatus;
  }

  /**
   * Установить статус синхронизации
   */
  private setStatus(status: SyncStatus): void {
    this.currentStatus = status;
    this.notifyStatusListeners(status);
  }

  /**
   * Подписаться на изменения статуса
   */
  onStatusChange(listener: (status: SyncStatus) => void): () => void {
    this.statusListeners.push(listener);
    // Вернуть функцию для отписки
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener);
    };
  }

  /**
   * Уведомить всех подписчиков об изменении статуса
   */
  private notifyStatusListeners(status: SyncStatus): void {
    this.statusListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        logError('SyncManager.notifyStatusListeners', error);
      }
    });
  }

  /**
   * Синхронизировать продукты
   */
  async syncProducts(spreadsheetId: string): Promise<Product[]> {
    const productsService = getProductsSyncService();
    const products = await productsService.getAllProducts(spreadsheetId);
    this.cacheService.cacheProducts(products);
    return products;
  }

  /**
   * Синхронизировать рецепты
   */
  async syncRecipes(spreadsheetId: string): Promise<Recipe[]> {
    const recipesService = getRecipesSyncService();
    const recipes = await recipesService.getAllRecipes(spreadsheetId);
    this.cacheService.cacheRecipes(recipes);
    return recipes;
  }

  /**
   * Синхронизировать инвентарь
   */
  async syncInventory(spreadsheetId: string): Promise<InventoryItemWithProduct[]> {
    const inventoryService = getInventorySyncService();
    const inventory = await inventoryService.getInventoryWithProducts(spreadsheetId);
    
    console.log('syncInventory: loaded', inventory.length, 'items from Google Sheets');
    
    // Сохранить в кэш (с полными данными о продуктах)
    this.cacheService.cacheInventory(inventory);
    
    // Также сохранить в storageService (без данных о продуктах, только ID)
    const inventoryItems = inventory.map(item => {
      const { product, ...inventoryItem } = item;
      return inventoryItem;
    });
    storageService.setInventory(inventoryItems);
    console.log('syncInventory: saved', inventoryItems.length, 'items to localStorage');
    
    return inventory;
  }

  /**
   * Синхронизировать список покупок
   */
  async syncShoppingList(spreadsheetId: string): Promise<ShoppingListItemWithDetails[]> {
    const shoppingListService = getShoppingListSyncService();
    const shoppingList = await shoppingListService.getAllItems(spreadsheetId);
    // Преобразуем в WithDetails для совместимости (пока без JOIN)
    const shoppingListWithDetails = shoppingList as any as ShoppingListItemWithDetails[];
    this.cacheService.cacheShoppingList(shoppingListWithDetails);
    return shoppingListWithDetails;
  }

  /**
   * Синхронизировать категории
   */
  async syncCategories(spreadsheetId: string): Promise<Category[]> {
    const categoriesService = getCategoriesSyncService();
    const categories = await categoriesService.getCategories(spreadsheetId);
    this.cacheService.cacheCategories(categories);
    return categories;
  }

  /**
   * Синхронизировать все данные
   */
  async syncAll(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      timestamp: Date.now(),
      errors: [],
      synced: {},
    };

    // Проверка на онлайн
    if (!this.isOnline()) {
      result.success = false;
      result.errors.push('Отсутствует интернет-соединение');
      this.setStatus(SyncStatus.OFFLINE);
      return result;
    }

    // Проверка Spreadsheet ID
    const spreadsheetId = storageService.getSpreadsheetId();
    if (!spreadsheetId) {
      result.success = false;
      result.errors.push('Spreadsheet ID не настроен');
      this.setStatus(SyncStatus.ERROR);
      return result;
    }

    this.setStatus(SyncStatus.SYNCING);

    try {
      // Синхронизация продуктов
      try {
        const products = await this.syncProducts(spreadsheetId);
        result.synced.products = products.length;
      } catch (error) {
        logError('SyncManager.syncAll.products', error);
        result.errors.push('Ошибка синхронизации продуктов');
      }

      // Синхронизация рецептов
      try {
        const recipes = await this.syncRecipes(spreadsheetId);
        result.synced.recipes = recipes.length;
      } catch (error) {
        logError('SyncManager.syncAll.recipes', error);
        result.errors.push('Ошибка синхронизации рецептов');
      }

      // Синхронизация инвентаря
      try {
        const inventory = await this.syncInventory(spreadsheetId);
        result.synced.inventory = inventory.length;
      } catch (error) {
        logError('SyncManager.syncAll.inventory', error);
        result.errors.push('Ошибка синхронизации инвентаря');
      }

      // Синхронизация списка покупок
      try {
        const shoppingList = await this.syncShoppingList(spreadsheetId);
        result.synced.shoppingList = shoppingList.length;
      } catch (error) {
        logError('SyncManager.syncAll.shoppingList', error);
        result.errors.push('Ошибка синхронизации списка покупок');
      }

      // Синхронизация категорий
      try {
        const categories = await this.syncCategories(spreadsheetId);
        result.synced.categories = categories.length;
      } catch (error) {
        logError('SyncManager.syncAll.categories', error);
        result.errors.push('Ошибка синхронизации категорий');
      }

      // Обновить время последней синхронизации
      this.cacheService.updateLastSyncTime();

      // Определить общий статус
      if (result.errors.length === 0) {
        this.setStatus(SyncStatus.SUCCESS);
      } else if (result.errors.length < 5) {
        // Частичный успех
        this.setStatus(SyncStatus.SUCCESS);
        result.success = true;
      } else {
        // Полная ошибка
        this.setStatus(SyncStatus.ERROR);
        result.success = false;
      }
    } catch (error) {
      logError('SyncManager.syncAll', error);
      result.success = false;
      result.errors.push('Критическая ошибка синхронизации');
      this.setStatus(SyncStatus.ERROR);
    }

    // Сбросить статус через 3 секунды
    setTimeout(() => {
      this.setStatus(SyncStatus.IDLE);
    }, 3000);

    return result;
  }

  /**
   * Кэшировать все данные без повторной загрузки
   */
  async cacheAllData(): Promise<void> {
    const spreadsheetId = storageService.getSpreadsheetId();
    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID не настроен');
    }

    await this.syncAll();
  }

  /**
   * Загрузить данные из кэша
   */
  loadFromCache() {
    return this.cacheService.getAllCachedData();
  }

  /**
   * Очистить кэш
   */
  clearCache(): void {
    this.cacheService.clearCache();
  }

  /**
   * Получить время последней синхронизации
   */
  getLastSyncTime(): number {
    return this.cacheService.getLastSyncTime();
  }

  /**
   * Проверить, истек ли срок действия кэша
   */
  isCacheExpired(): boolean {
    return this.cacheService.isCacheExpired();
  }

  /**
   * Проверить, есть ли кэшированные данные
   */
  hasCachedData(): boolean {
    return this.cacheService.hasCachedData();
  }

  /**
   * Получить размер кэша
   */
  getCacheSize(): string {
    return this.cacheService.getCacheSizeFormatted();
  }

  /**
   * Автоматическая синхронизация при изменении онлайн-статуса
   */
  setupAutoSync(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('App is online, syncing...');
      this.syncAll();
    });

    window.addEventListener('offline', () => {
      console.log('App is offline');
      this.setStatus(SyncStatus.OFFLINE);
    });
  }
}

/**
 * Singleton instance
 */
let syncManager: SyncManager | null = null;

/**
 * Получить экземпляр менеджера синхронизации
 */
export function getSyncManager(): SyncManager {
  if (!syncManager) {
    syncManager = new SyncManager();
    syncManager.setupAutoSync();
  }
  return syncManager;
}
