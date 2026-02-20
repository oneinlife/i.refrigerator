'use client';

import type { RecipeWithIngredients, RecipeMatch, RecipeIngredientWithProduct } from '@/types/recipe';
import type { InventoryItemWithProduct } from '@/types/inventory';

/**
 * Сервис для сопоставления рецептов с инвентарем холодильника
 */
export class RecipeMatcherService {
  /**
   * Найти рецепты, которые можно приготовить из имеющихся продуктов
   * @param recipes - список рецептов с ингредиентами
   * @param inventory - текущий инвентарь холодильника
   * @returns список рецептов с информацией о совпадении
   */
  matchRecipes(
    recipes: RecipeWithIngredients[],
    inventory: InventoryItemWithProduct[]
  ): RecipeMatch[] {
    return recipes
      .map(recipe => this.matchRecipe(recipe, inventory))
      .sort((a, b) => b.match_percentage - a.match_percentage);
  }

  /**
   * Сопоставить один рецепт с инвентарем
   */
  matchRecipe(
    recipe: RecipeWithIngredients,
    inventory: InventoryItemWithProduct[]
  ): RecipeMatch {
    console.log('RecipeMatcherService.matchRecipe called:', {
      recipe_name: recipe.name,
      ingredients_count: recipe.ingredients.length,
      inventory_count: inventory.length
    });
    
    const availableIngredients: RecipeIngredientWithProduct[] = [];
    const missingIngredients: RecipeIngredientWithProduct[] = [];
    const missingQuantities: RecipeMatch['missing_quantities'] = [];

    // Проверяем каждый ингредиент рецепта
    for (const ingredient of recipe.ingredients) {
      const inventoryItem = this.findInventoryItem(ingredient, inventory);
      
      console.log('Checking ingredient:', {
        product_name: ingredient.product.name,
        product_id: ingredient.product_id,
        required_quantity: ingredient.quantity,
        required_unit: ingredient.unit,
        found_in_inventory: !!inventoryItem,
        available_quantity: inventoryItem?.quantity,
        available_unit: inventoryItem?.unit
      });

      if (inventoryItem && this.hasEnoughQuantity(ingredient, inventoryItem)) {
        console.log('  ✅ Available');
        availableIngredients.push(ingredient);
      } else {
        console.log('  ❌ Missing');
        missingIngredients.push(ingredient);
        
        // Вычисляем недостающее количество
        const missing = inventoryItem
          ? Math.max(0, ingredient.quantity - inventoryItem.quantity)
          : ingredient.quantity;

        console.log('  Missing quantity:', missing);

        missingQuantities.push({
          product_id: ingredient.product_id,
          product_name: ingredient.product.name,
          missing,
          unit: ingredient.unit,
        });
      }
    }

    console.log('Match result:', {
      available: availableIngredients.length,
      missing: missingIngredients.length,
      missing_quantities: missingQuantities
    });

    // Подсчитываем процент совпадения
    const totalIngredients = recipe.ingredients.length;
    const matchPercentage = totalIngredients > 0
      ? Math.round((availableIngredients.length / totalIngredients) * 100)
      : 0;

    // Проверяем, можно ли приготовить (все обязательные ингредиенты есть)
    const requiredIngredients = recipe.ingredients.filter(ing => !ing.optional);
    const availableRequiredCount = requiredIngredients.filter(required =>
      availableIngredients.some(avail => avail.product_id === required.product_id)
    ).length;
    const canCook = requiredIngredients.length === availableRequiredCount;

    return {
      recipe,
      match_percentage: matchPercentage,
      available_ingredients: availableIngredients,
      missing_ingredients: missingIngredients,
      can_cook: canCook,
      missing_quantities: missingQuantities,
    };
  }

  /**
   * Найти элемент инвентаря для ингредиента
   */
  private findInventoryItem(
    ingredient: RecipeIngredientWithProduct,
    inventory: InventoryItemWithProduct[]
  ): InventoryItemWithProduct | undefined {
    return inventory.find(item => item.product_id === ingredient.product_id);
  }

  /**
   * Проверить, достаточно ли количества продукта в инвентаре
   * @param ingredient - ингредиент из рецепта
   * @param inventoryItem - продукт в инвентаре
   */
  private hasEnoughQuantity(
    ingredient: RecipeIngredientWithProduct,
    inventoryItem: InventoryItemWithProduct
  ): boolean {
    const normalizedIngredientUnit = this.normalizeUnit(ingredient.unit);
    const normalizedInventoryUnit = this.normalizeUnit(inventoryItem.unit);
    
    console.log('    hasEnoughQuantity check:', {
      ingredient_unit: ingredient.unit,
      inventory_unit: inventoryItem.unit,
      normalized_ingredient: normalizedIngredientUnit,
      normalized_inventory: normalizedInventoryUnit,
      units_match: normalizedIngredientUnit === normalizedInventoryUnit
    });
    
    // Если единицы измерения совпадают, сравниваем напрямую
    if (normalizedIngredientUnit === normalizedInventoryUnit) {
      const hasEnough = inventoryItem.quantity >= ingredient.quantity;
      console.log('    Units match, comparing quantities:', {
        required: ingredient.quantity,
        available: inventoryItem.quantity,
        hasEnough
      });
      return hasEnough;
    }

    // Если единицы разные, считаем что продукт есть
    // (т.к. точное преобразование единиц измерения сложно без дополнительных данных)
    console.log('    Units differ, assuming sufficient (TODO: unit conversion)');
    return true;
  }

  /**
   * Нормализовать единицу измерения для сравнения
   */
  private normalizeUnit(unit: string): string {
    const normalized = unit.toLowerCase().trim();

    // Маппинг синонимов
    const unitMap: Record<string, string> = {
      'шт': 'шт',
      'штук': 'шт',
      'штука': 'шт',
      'кг': 'кг',
      'килограмм': 'кг',
      'г': 'г',
      'грамм': 'г',
      'л': 'л',
      'литр': 'л',
      'мл': 'мл',
      'миллилитр': 'мл',
      'ст.л.': 'ст.л.',
      'ст. л.': 'ст.л.',
      'столовая ложка': 'ст.л.',
      'ч.л.': 'ч.л.',
      'ч. л.': 'ч.л.',
      'чайная ложка': 'ч.л.',
      'стакан': 'стакан',
    };

    return unitMap[normalized] || normalized;
  }

  /**
   * Фильтровать рецепты по минимальному проценту совпадения
   */
  filterByMatchPercentage(
    matches: RecipeMatch[],
    minPercentage: number
  ): RecipeMatch[] {
    return matches.filter(match => match.match_percentage >= minPercentage);
  }

  /**
   * Фильтровать только те рецепты, которые можно приготовить
   */
  filterCookableRecipes(matches: RecipeMatch[]): RecipeMatch[] {
    return matches.filter(match => match.can_cook);
  }

  /**
   * Сгруппировать рецепты по проценту совпадения
   */
  groupByMatchPercentage(matches: RecipeMatch[]): {
    perfect: RecipeMatch[]; // 100%
    high: RecipeMatch[]; // 75-99%
    medium: RecipeMatch[]; // 50-74%
    low: RecipeMatch[]; // < 50%
  } {
    return {
      perfect: matches.filter(m => m.match_percentage === 100),
      high: matches.filter(m => m.match_percentage >= 75 && m.match_percentage < 100),
      medium: matches.filter(m => m.match_percentage >= 50 && m.match_percentage < 75),
      low: matches.filter(m => m.match_percentage < 50),
    };
  }

  /**
   * Найти рецепты по категории с учетом инвентаря
   */
  matchRecipesByCategory(
    recipes: RecipeWithIngredients[],
    inventory: InventoryItemWithProduct[],
    category: string
  ): RecipeMatch[] {
    const filteredRecipes = recipes.filter(recipe =>
      recipe.categories.toLowerCase().split(',').some(cat => cat.trim() === category.toLowerCase())
    );

    return this.matchRecipes(filteredRecipes, inventory);
  }

  /**
   * Получить рекомендуемые рецепты на основе текущего инвентаря
   * Возвращает рецепты, которые можно приготовить или почти приготовить
   */
  getRecommendedRecipes(
    recipes: RecipeWithIngredients[],
    inventory: InventoryItemWithProduct[],
    limit: number = 10
  ): RecipeMatch[] {
    const matches = this.matchRecipes(recipes, inventory);
    
    // Фильтруем рецепты с совпадением >= 60%
    const recommended = matches.filter(m => m.match_percentage >= 60);
    
    return recommended.slice(0, limit);
  }

  /**
   * Подсчитать статистику по совпадению
   */
  getMatchStatistics(matches: RecipeMatch[]): {
    total: number;
    canCook: number;
    averageMatch: number;
    perfectMatches: number;
  } {
    const total = matches.length;
    const canCook = matches.filter(m => m.can_cook).length;
    const averageMatch = total > 0
      ? Math.round(matches.reduce((sum, m) => sum + m.match_percentage, 0) / total)
      : 0;
    const perfectMatches = matches.filter(m => m.match_percentage === 100).length;

    return {
      total,
      canCook,
      averageMatch,
      perfectMatches,
    };
  }
}

// Экспорт singleton
let recipeMatcherInstance: RecipeMatcherService | null = null;

export function getRecipeMatcherService(): RecipeMatcherService {
  if (!recipeMatcherInstance) {
    recipeMatcherInstance = new RecipeMatcherService();
  }
  return recipeMatcherInstance;
}
