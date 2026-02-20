import type { Product } from './product';

/**
 * Элемент списка покупок (ShoppingList)
 */
export interface ShoppingListItem {
  /** ID записи в списке покупок */
  shopping_item_id: string;
  
  /** Foreign Key → Products.product_id */
  product_id: string;
  
  /** Foreign Key → Recipes.recipe_id (опционально, если добавлено из рецепта) */
  recipe_id?: string;
  
  /** Сколько всего нужно продукта */
  quantity_needed: number;
  
  /** Сколько уже есть в наличии */
  quantity_available: number;
  
  /** Сколько нужно купить */
  quantity_to_buy: number;
  
  /** Единица измерения */
  unit: string;
  
  /** Отмечено ли как купленное */
  checked: boolean;
  
  /** Дата добавления в список */
  added_date: string;
  
  /** Дата покупки */
  purchased_date?: string;
}

/**
 * Элемент списка покупок с детальной информацией (JOIN)
 */
export interface ShoppingListItemWithDetails extends ShoppingListItem {
  /** Данные продукта из справочника */
  product: Product;
  
  /** Название рецепта, если элемент добавлен из рецепта */
  recipe_name?: string;
}

/**
 * Данные для создания элемента списка покупок
 */
export type CreateShoppingItemInput = Omit<ShoppingListItem, 'shopping_item_id' | 'added_date' | 'purchased_date'>;

/**
 * Данные для обновления элемента списка покупок
 */
export type UpdateShoppingItemInput = Partial<Omit<ShoppingListItem, 'shopping_item_id' | 'added_date'>>;

/**
 * Группировка элементов списка покупок
 */
export interface ShoppingListGroup {
  /** Название группы (обычно категория продуктов) */
  group_name: string;
  
  /** Элементы в группе */
  items: ShoppingListItemWithDetails[];
  
  /** Количество элементов в группе */
  total_items: number;
  
  /** Количество купленных элементов */
  checked_items: number;
}

/**
 * Alias для группировки (используется в компонентах)
 */
export type GroupedShoppingList = ShoppingListGroup;

/**
 * Утилиты для работы со списком покупок
 */
export namespace ShoppingListUtils {
  /**
   * Группировка элементов по категориям продуктов
   * @deprecated Категории больше не поддерживаются. Возвращает все элементы в одной группе.
   */
  export function groupByCategory(items: ShoppingListItemWithDetails[]): ShoppingListGroup[] {
    // Поскольку категории больше не поддерживаются, возвращаем все в одной группе
    return [{
      group_name: 'Все продукты',
      items,
      total_items: items.length,
      checked_items: items.filter(i => i.checked).length,
    }];
  }
  
  /**
   * Фильтрация только активных (некупленных) элементов
   */
  export function filterActive(items: ShoppingListItem[]): ShoppingListItem[] {
    return items.filter(item => !item.checked);
  }
  
  /**
   * Фильтрация только купленных элементов
   */
  export function filterCompleted(items: ShoppingListItem[]): ShoppingListItem[] {
    return items.filter(item => item.checked);
  }
  
  /**
   * Подсчет общей стоимости (если добавить поле price)
   */
  export function calculateTotal(items: ShoppingListItemWithDetails[]): number {
    // TODO: реализовать когда добавим цены
    return 0;
  }
}
