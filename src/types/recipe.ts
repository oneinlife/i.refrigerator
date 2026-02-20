import type { Product } from './product';

/**
 * Рецепт блюда (Recipes)
 */
export interface Recipe {
  /** Уникальный ID рецепта */
  recipe_id: string;
  
  /** Название рецепта */
  name: string;
  
  /** Описание рецепта */
  description?: string;
  
  /** Количество порций */
  servings: number;
  
  /** Время приготовления в минутах */
  cooking_time: number;
  
  /** Категории через запятую (например: "Азия,Горячее,Сытное") */
  categories: string;
  
  /** Инструкции по приготовлению (шаги через || или \n) */
  instructions: string;
  
  /** URL изображения блюда */
  image_url?: string;
  
  /** Теги через запятую для поиска */
  tags?: string;
  
  /** Дата создания рецепта */
  created_date: string;
  
  /** Дата последнего использования рецепта */
  last_used_date?: string;
}

/**
 * Ингредиент рецепта (RecipeProducts)
 * Связь many-to-many между рецептами и продуктами
 */
export interface RecipeIngredient {
  /** ID записи связи */
  recipe_product_id: string;
  
  /** Foreign Key → Recipes.recipe_id */
  recipe_id: string;
  
  /** Foreign Key → Products.product_id */
  product_id: string;
  
  /** Количество продукта для рецепта */
  quantity: number;
  
  /** Единица измерения */
  unit: string;
  
  /** Является ли ингредиент опциональным */
  optional: boolean;
  
  /** Примечания к ингредиенту */
  notes?: string;
}

/**
 * Рецепт с детальной информацией об ингредиентах (JOIN)
 */
export interface RecipeWithIngredients extends Recipe {
  /** Список ингредиентов с данными о продуктах */
  ingredients: RecipeIngredientWithProduct[];
}

/**
 * Ингредиент с данными о продукте (JOIN)
 */
export interface RecipeIngredientWithProduct extends RecipeIngredient {
  /** Данные продукта из справочника */
  product: Product;
}

/**
 * Результат сопоставления рецепта с инвентарем
 */
export interface RecipeMatch {
  /** Рецепт с ингредиентами */
  recipe: RecipeWithIngredients;
  
  /** Процент совпадения ингредиентов (0-100) */
  match_percentage: number;
  
  /** Ингредиенты, которые есть в наличии */
  available_ingredients: RecipeIngredientWithProduct[];
  
  /** Ингредиенты, которых не хватает */
  missing_ingredients: RecipeIngredientWithProduct[];
  
  /** Можно ли приготовить (все обязательные ингредиенты есть) */
  can_cook: boolean;
  
  /** Недостающие количества продуктов */
  missing_quantities: {
    product_id: string;
    product_name: string;
    missing: number;
    unit: string;
  }[];
}

/**
 * Данные для создания нового рецепта
 */
export type CreateRecipeInput = Omit<Recipe, 'recipe_id' | 'created_date' | 'last_used_date'>;

/**
 * Данные для обновления рецепта
 */
export type UpdateRecipeInput = Partial<Omit<Recipe, 'recipe_id' | 'created_date'>>;

/**
 * Данные для создания ингредиента рецепта
 */
export type CreateRecipeIngredientInput = Omit<RecipeIngredient, 'recipe_product_id'>;

/**
 * Утилиты для работы с категориями рецептов
 */
export namespace RecipeCategories {
  /**
   * Разбить строку категорий на массив
   */
  export function parse(categories: string): string[] {
    return categories.split(',').map(c => c.trim()).filter(Boolean);
  }
  
  /**
   * Объединить массив категорий в строку
   */
  export function stringify(categories: string[]): string {
    return categories.join(',');
  }
}

/**
 * Утилиты для работы с инструкциями рецепта
 */
export namespace RecipeInstructions {
  /**
   * Разбить строку инструкций на массив шагов
   */
  export function parse(instructions: string): string[] {
    return instructions.split('||').map(s => s.trim()).filter(Boolean);
  }
  
  /**
   * Объединить массив шагов в строку
   */
  export function stringify(steps: string[]): string {
    return steps.join('||');
  }
}
