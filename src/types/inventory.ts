import type { Product } from './product';

/**
 * Текущий инвентарь холодильника (Inventory)
 * Продукты, которые сейчас есть в холодильнике
 */
export interface InventoryItem {
  /** ID записи в инвентаре */
  inventory_id: string;
  
  /** Foreign Key → Products.product_id */
  product_id: string;
  
  /** Количество продукта */
  quantity: number;
  
  /** Единица измерения */
  unit: string;
  
  /** Срок годности (ISO date) */
  expiry_date?: string;
  
  /** Дата добавления в холодильник (ISO datetime) */
  added_date: string;
  
  /** Заметки */
  notes?: string;
}

/**
 * Инвентарь с данными о продукте (JOIN с Products)
 */
export interface InventoryItemWithProduct extends InventoryItem {
  /** Данные продукта из справочника */
  product: Product;
}

/**
 * Данные для создания новой записи в инвентаре
 */
export type CreateInventoryInput = Omit<InventoryItem, 'inventory_id' | 'added_date'>;

/**
 * Данные для обновления записи в инвентаре
 */
export type UpdateInventoryInput = Partial<Omit<InventoryItem, 'inventory_id' | 'added_date'>>;

// =============================================================================
// LEGACY TYPES - для обратной совместимости со старым кодом
// TODO: постепенно мигрировать на новую структуру
// =============================================================================

/**
 * @deprecated Используйте InventoryItemWithProduct вместо этого
 * Старый формат инвентаря (до миграции на Products)
 */
export interface LegacyInventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  expiryDate?: string;
  addedDate: string;
  notes?: string;
}

export interface SyncConfig {
  spreadsheetId: string;
  sheetName: string;
  autoSync: boolean;
  syncInterval?: number; // в минутах
}

export enum Category {
  DAIRY = 'Молочные продукты',
  MEAT = 'Мясо и рыба',
  VEGETABLES = 'Овощи',
  FRUITS = 'Фрукты',
  BEVERAGES = 'Напитки',
  FROZEN = 'Замороженное',
  OTHER = 'Другое',
}

export enum Unit {
  KG = 'кг',
  G = 'г',
  L = 'л',
  ML = 'мл',
  PCS = 'шт',
}
