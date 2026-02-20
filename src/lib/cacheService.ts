'use client';

import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';
import type { InventoryItemWithProduct } from '@/types/inventory';
import type { ShoppingListItemWithDetails } from '@/types/shopping';
import type { Category } from '@/types/category';

/**
 * Структура кэшированных данных
 */
export interface CachedData {
  products?: Product[];
  recipes?: Recipe[];
  inventory?: InventoryItemWithProduct[];
  shoppingList?: ShoppingListItemWithDetails[];
  categories?: Category[];
  timestamp: number;
}

/**
 * Метаданные кэша
 */
export interface CacheMetadata {
  lastSync: number;
  version: string;
  dataKeys: string[];
}

const CACHE_KEYS = {
  PRODUCTS: 'cache_products',
  RECIPES: 'cache_recipes',
  INVENTORY: 'cache_inventory',
  SHOPPING_LIST: 'cache_shopping_list',
  CATEGORIES: 'cache_categories',
  METADATA: 'cache_metadata',
} as const;

const CACHE_VERSION = '1.0.0';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 часа

/**
 * Сервис кэширования данных в localStorage
 * Обеспечивает работу приложения в оффлайн-режиме
 */
export class CacheService {
  /**
   * Проверка доступности localStorage
   */
  private isAvailable(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  /**
   * Получить метаданные кэша
   */
  private getMetadata(): CacheMetadata {
    if (!this.isAvailable()) {
      return { lastSync: 0, version: CACHE_VERSION, dataKeys: [] };
    }

    const data = localStorage.getItem(CACHE_KEYS.METADATA);
    if (!data) {
      return { lastSync: 0, version: CACHE_VERSION, dataKeys: [] };
    }

    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to parse cache metadata:', error);
      return { lastSync: 0, version: CACHE_VERSION, dataKeys: [] };
    }
  }

  /**
   * Сохранить метаданные кэша
   */
  private setMetadata(metadata: CacheMetadata): void {
    if (!this.isAvailable()) return;
    localStorage.setItem(CACHE_KEYS.METADATA, JSON.stringify(metadata));
  }

  /**
   * Обновить время последней синхронизации
   */
  updateLastSyncTime(): void {
    const metadata = this.getMetadata();
    metadata.lastSync = Date.now();
    this.setMetadata(metadata);
  }

  /**
   * Получить время последней синхронизации
   */
  getLastSyncTime(): number {
    return this.getMetadata().lastSync;
  }

  /**
   * Проверить, истек ли срок действия кэша
   */
  isCacheExpired(): boolean {
    const lastSync = this.getLastSyncTime();
    if (lastSync === 0) return true;
    return Date.now() - lastSync > CACHE_EXPIRY_MS;
  }

  /**
   * Сохранить продукты в кэш
   */
  cacheProducts(products: Product[]): void {
    if (!this.isAvailable()) return;
    
    try {
      localStorage.setItem(CACHE_KEYS.PRODUCTS, JSON.stringify(products));
      this.updateDataKey('products');
      console.log(`Cached ${products.length} products`);
    } catch (error) {
      console.error('Failed to cache products:', error);
    }
  }

  /**
   * Получить продукты из кэша
   */
  getCachedProducts(): Product[] | null {
    if (!this.isAvailable()) return null;

    try {
      const data = localStorage.getItem(CACHE_KEYS.PRODUCTS);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get cached products:', error);
      return null;
    }
  }

  /**
   * Сохранить рецепты в кэш
   */
  cacheRecipes(recipes: Recipe[]): void {
    if (!this.isAvailable()) return;
    
    try {
      localStorage.setItem(CACHE_KEYS.RECIPES, JSON.stringify(recipes));
      this.updateDataKey('recipes');
      console.log(`Cached ${recipes.length} recipes`);
    } catch (error) {
      console.error('Failed to cache recipes:', error);
    }
  }

  /**
   * Получить рецепты из кэша
   */
  getCachedRecipes(): Recipe[] | null {
    if (!this.isAvailable()) return null;

    try {
      const data = localStorage.getItem(CACHE_KEYS.RECIPES);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get cached recipes:', error);
      return null;
    }
  }

  /**
   * Сохранить инвентарь в кэш
   */
  cacheInventory(inventory: InventoryItemWithProduct[]): void {
    if (!this.isAvailable()) return;
    
    try {
      localStorage.setItem(CACHE_KEYS.INVENTORY, JSON.stringify(inventory));
      this.updateDataKey('inventory');
      console.log(`Cached ${inventory.length} inventory items`);
    } catch (error) {
      console.error('Failed to cache inventory:', error);
    }
  }

  /**
   * Получить инвентарь из кэша
   */
  getCachedInventory(): InventoryItemWithProduct[] | null {
    if (!this.isAvailable()) return null;

    try {
      const data = localStorage.getItem(CACHE_KEYS.INVENTORY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get cached inventory:', error);
      return null;
    }
  }

  /**
   * Сохранить список покупок в кэш
   */
  cacheShoppingList(shoppingList: ShoppingListItemWithDetails[]): void {
    if (!this.isAvailable()) return;
    
    try {
      localStorage.setItem(CACHE_KEYS.SHOPPING_LIST, JSON.stringify(shoppingList));
      this.updateDataKey('shoppingList');
      console.log(`Cached ${shoppingList.length} shopping list items`);
    } catch (error) {
      console.error('Failed to cache shopping list:', error);
    }
  }

  /**
   * Получить список покупок из кэша
   */
  getCachedShoppingList(): ShoppingListItemWithDetails[] | null {
    if (!this.isAvailable()) return null;

    try {
      const data = localStorage.getItem(CACHE_KEYS.SHOPPING_LIST);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get cached shopping list:', error);
      return null;
    }
  }

  /**
   * Сохранить категории в кэш
   */
  cacheCategories(categories: Category[]): void {
    if (!this.isAvailable()) return;
    
    try {
      localStorage.setItem(CACHE_KEYS.CATEGORIES, JSON.stringify(categories));
      this.updateDataKey('categories');
      console.log(`Cached ${categories.length} categories`);
    } catch (error) {
      console.error('Failed to cache categories:', error);
    }
  }

  /**
   * Получить категории из кэша
   */
  getCachedCategories(): Category[] | null {
    if (!this.isAvailable()) return null;

    try {
      const data = localStorage.getItem(CACHE_KEYS.CATEGORIES);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get cached categories:', error);
      return null;
    }
  }

  /**
   * Сохранить все данные в кэш
   */
  cacheAllData(data: Partial<CachedData>): void {
    if (data.products) this.cacheProducts(data.products);
    if (data.recipes) this.cacheRecipes(data.recipes);
    if (data.inventory) this.cacheInventory(data.inventory);
    if (data.shoppingList) this.cacheShoppingList(data.shoppingList);
    if (data.categories) this.cacheCategories(data.categories);
    
    this.updateLastSyncTime();
  }

  /**
   * Получить все данные из кэша
   */
  getAllCachedData(): CachedData {
    return {
      products: this.getCachedProducts() || undefined,
      recipes: this.getCachedRecipes() || undefined,
      inventory: this.getCachedInventory() || undefined,
      shoppingList: this.getCachedShoppingList() || undefined,
      categories: this.getCachedCategories() || undefined,
      timestamp: this.getLastSyncTime(),
    };
  }

  /**
   * Очистить весь кэш
   */
  clearCache(): void {
    if (!this.isAvailable()) return;

    Object.values(CACHE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });

    console.log('Cache cleared');
  }

  /**
   * Очистить устаревший кэш (старше 7 дней)
   */
  clearExpiredCache(): void {
    const metadata = this.getMetadata();
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    if (metadata.lastSync > 0 && metadata.lastSync < sevenDaysAgo) {
      console.log('Clearing expired cache...');
      this.clearCache();
    }
  }

  /**
   * Обновить ключи данных в метаданных
   */
  private updateDataKey(key: string): void {
    const metadata = this.getMetadata();
    if (!metadata.dataKeys.includes(key)) {
      metadata.dataKeys.push(key);
      this.setMetadata(metadata);
    }
  }

  /**
   * Получить размер кэша в байтах (приближенно)
   */
  getCacheSize(): number {
    if (!this.isAvailable()) return 0;

    let totalSize = 0;
    Object.values(CACHE_KEYS).forEach(key => {
      const item = localStorage.getItem(key);
      if (item) {
        totalSize += item.length * 2; // UTF-16, каждый символ = 2 байта
      }
    });

    return totalSize;
  }

  /**
   * Получить размер кэша в человекочитаемом формате
   */
  getCacheSizeFormatted(): string {
    const bytes = this.getCacheSize();
    
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * Проверить, есть ли кэшированные данные
   */
  hasCachedData(): boolean {
    const metadata = this.getMetadata();
    return metadata.dataKeys.length > 0 && metadata.lastSync > 0;
  }
}

/**
 * Singleton instance
 */
let cacheService: CacheService | null = null;

/**
 * Получить экземпляр сервиса кэширования
 */
export function getCacheService(): CacheService {
  if (!cacheService) {
    cacheService = new CacheService();
  }
  return cacheService;
}
