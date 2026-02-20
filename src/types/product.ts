/**
 * Справочник продуктов (Products)
 * Мастер-список всех известных продуктов с их свойствами
 */
export interface Product {
  /** Уникальный ID продукта */
  product_id: string;
  
  /** Название продукта */
  name: string;
  
  /** Единица измерения по умолчанию */
  default_unit: string;
  
  /** Альтернативные названия (через запятую) для поиска и автодополнения */
  aliases?: string;
  
  /** Типичный срок годности в днях */
  typical_shelf_life_days?: number;
  
  /** Дата добавления продукта в справочник */
  created_date: string;
  
  /** Количество использований продукта (для аналитики и автодополнения) */
  usage_count: number;
}

/**
 * Данные для создания нового продукта
 */
export type CreateProductInput = Omit<Product, 'product_id' | 'created_date'>;

/**
 * Данные для обновления продукта
 */
export type UpdateProductInput = Partial<Omit<Product, 'product_id' | 'created_date'>>;
