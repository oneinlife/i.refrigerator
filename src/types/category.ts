/**
 * Категория рецептов (Categories)
 * Справочник категорий для группировки и фильтрации рецептов
 */
export interface Category {
  /** Уникальный ID категории */
  category_id: string;
  
  /** Название категории */
  name: string;
  
  /** Тип категории: предустановленная или пользовательская */
  type: 'predefined' | 'custom';
  
  /** Количество использований в рецептах (для аналитики) */
  usage_count: number;
  
  /** Дата создания категории */
  created_date: string;
}

/**
 * Данные для создания новой категории
 */
export type CreateCategoryInput = Omit<Category, 'category_id' | 'created_date' | 'usage_count'>;

/**
 * Данные для обновления категории
 */
export type UpdateCategoryInput = Partial<Omit<Category, 'category_id' | 'created_date' | 'type'>>;

/**
 * Предустановленные категории рецептов
 */
export const SUGGESTED_CATEGORIES = {
  // По кухне мира
  CUISINE: [
    'Русская кухня',
    'Азия',
    'Европейская',
    'Итальянская',
    'Французская',
    'Грузинская',
    'Мексиканская',
    'Японская',
    'Китайская',
    'Американская',
  ],
  
  // По типу приема пищи
  MEAL_TYPE: [
    'Завтрак',
    'Обед',
    'Ужин',
    'Перекус',
    'Десерт',
  ],
  
  // По типу блюда
  DISH_TYPE: [
    'Первое',
    'Второе',
    'Горячее',
    'Холодное',
    'Салат',
    'Суп',
    'Выпечка',
    'Напиток',
    'Закуска',
    'Гарнир',
  ],
  
  // По характеристикам
  CHARACTERISTICS: [
    'Быстро',
    'Сытное',
    'Легкое',
    'Праздничное',
    'Для детей',
    'Вегетарианское',
    'ПП',
    'Острое',
    'Сладкое',
    'Постное',
  ],
  
  // По сезону
  SEASON: [
    'Зимнее',
    'Летнее',
    'Осеннее',
    'Весеннее',
  ],
} as const;

/**
 * Получить все предустановленные категории одним списком
 */
export function getAllSuggestedCategories(): string[] {
  return Object.values(SUGGESTED_CATEGORIES).flat();
}

/**
 * Получить категории определенной группы
 */
export function getSuggestedCategoriesByGroup(group: keyof typeof SUGGESTED_CATEGORIES): string[] {
  return [...SUGGESTED_CATEGORIES[group]];
}

/**
 * Проверка, является ли категория предустановленной
 */
export function isPredefinedCategory(categoryName: string): boolean {
  return getAllSuggestedCategories().includes(categoryName);
}
