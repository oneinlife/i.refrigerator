/**
 * Примеры использования системы конвертации единиц измерения
 * Этот файл можно использовать для тестирования и демонстрации возможностей
 */

import {
  convertToBaseUnit,
  convertUnit,
  hasEnoughQuantity,
  areUnitsCompatible,
  formatQuantity,
  compareQuantities,
  getDisplayUnit,
} from './unitConverter';

/**
 * Пример 1: Базовая конвертация
 */
export function example1_BasicConversion() {
  console.log('=== Пример 1: Базовая конвертация ===\n');
  
  // Конвертация весов
  const weight1 = convertToBaseUnit(1, 'кг');
  console.log('1 кг =', weight1); // { quantity: 1000, unit: 'г' }
  
  const weight2 = convertToBaseUnit(500, 'г');
  console.log('500 г =', weight2); // { quantity: 500, unit: 'г' }
  
  // Конвертация объемов
  const volume1 = convertToBaseUnit(2, 'л');
  console.log('2 л =', volume1); // { quantity: 2000, unit: 'мл' }
  
  const volume2 = convertToBaseUnit(250, 'мл');
  console.log('250 мл =', volume2); // { quantity: 250, unit: 'мл' }
  
  console.log('\n');
}

/**
 * Пример 2: Конвертация между единицами
 */
export function example2_UnitConversion() {
  console.log('=== Пример 2: Конвертация между единицами ===\n');
  
  // Килограммы в граммы
  const kg_to_g = convertUnit(1.5, 'кг', 'г');
  console.log('1.5 кг = ', kg_to_g, 'г'); // 1500
  
  // Граммы в килограммы
  const g_to_kg = convertUnit(2500, 'г', 'кг');
  console.log('2500 г =', g_to_kg, 'кг'); // 2.5
  
  // Литры в миллилитры
  const l_to_ml = convertUnit(0.5, 'л', 'мл');
  console.log('0.5 л =', l_to_ml, 'мл'); // 500
  
  // Попытка конвертации несовместимых единиц
  const invalid = convertUnit(1, 'кг', 'л');
  console.log('1 кг в литры =', invalid); // null (несовместимые)
  
  console.log('\n');
}

/**
 * Пример 3: Проверка достаточности количества
 */
export function example3_CheckSufficiency() {
  console.log('=== Пример 3: Проверка достаточности ===\n');
  
  // Есть 1 кг муки, нужно 500 г
  const enough1 = hasEnoughQuantity(1, 'кг', 500, 'г');
  console.log('Есть 1 кг, нужно 500 г:', enough1); // true
  
  // Есть 200 мл молока, нужно 1 л
  const enough2 = hasEnoughQuantity(200, 'мл', 1, 'л');
  console.log('Есть 200 мл, нужно 1 л:', enough2); // false
  
  // Есть 1500 г сахара, нужно 1.5 кг
  const enough3 = hasEnoughQuantity(1500, 'г', 1.5, 'кг');
  console.log('Есть 1500 г, нужно 1.5 кг:', enough3); // true (равны)
  
  // Есть 2 л воды, нужно 1500 мл
  const enough4 = hasEnoughQuantity(2, 'л', 1500, 'мл');
  console.log('Есть 2 л, нужно 1500 мл:', enough4); // true
  
  console.log('\n');
}

/**
 * Пример 4: Проверка совместимости единиц
 */
export function example4_UnitCompatibility() {
  console.log('=== Пример 4: Совместимость единиц ===\n');
  
  console.log('кг и г совместимы?', areUnitsCompatible('кг', 'г')); // true
  console.log('л и мл совместимы?', areUnitsCompatible('л', 'мл')); // true
  console.log('кг и л совместимы?', areUnitsCompatible('кг', 'л')); // false
  console.log('шт и г совместимы?', areUnitsCompatible('шт', 'г')); // false
  
  console.log('\n');
}

/**
 * Пример 5: Сравнение количеств
 */
export function example5_CompareQuantities() {
  console.log('=== Пример 5: Сравнение количеств ===\n');
  
  // Сравнение: 2 кг vs 1500 г
  const cmp1 = compareQuantities(2, 'кг', 1500, 'г');
  console.log('2 кг vs 1500 г:', cmp1); // 500 (2000 - 1500)
  
  // Сравнение: 500 мл vs 0.5 л
  const cmp2 = compareQuantities(500, 'мл', 0.5, 'л');
  console.log('500 мл vs 0.5 л:', cmp2); // 0 (равны)
  
  // Сравнение: 300 г vs 0.5 кг
  const cmp3 = compareQuantities(300, 'г', 0.5, 'кг');
  console.log('300 г vs 0.5 кг:', cmp3); // -200 (300 - 500)
  
  console.log('\n');
}

/**
 * Пример 6: Форматирование для отображения
 */
export function example6_FormatDisplay() {
  console.log('=== Пример 6: Форматирование для UI ===\n');
  
  // Большие значения автоматически конвертируются
  console.log('1500 г:', formatQuantity(1500, 'г', true)); // "1.5 кг"
  console.log('2500 мл:', formatQuantity(2500, 'мл', true)); // "2.5 л"
  
  // Маленькие значения остаются как есть
  console.log('500 г:', formatQuantity(500, 'г', true)); // "500 г"
  console.log('300 мл:', formatQuantity(300, 'мл', true)); // "300 мл"
  
  // Без автоформатирования
  console.log('1500 г (no format):', formatQuantity(1500, 'г', false)); // "1500 г"
  
  console.log('\n');
}

/**
 * Пример 7: Получение оптимальной единицы для отображения
 */
export function example7_DisplayUnit() {
  console.log('=== Пример 7: Оптимальная единица ===\n');
  
  const display1 = getDisplayUnit(1500, 'г');
  console.log('1500 г ->', display1); // { quantity: 1.5, unit: 'кг' }
  
  const display2 = getDisplayUnit(500, 'г');
  console.log('500 г ->', display2); // { quantity: 500, unit: 'г' }
  
  const display3 = getDisplayUnit(2000, 'мл');
  console.log('2000 мл ->', display3); // { quantity: 2, unit: 'л' }
  
  const display4 = getDisplayUnit(750, 'мл');
  console.log('750 мл ->', display4); // { quantity: 750, unit: 'мл' }
  
  console.log('\n');
}

/**
 * Пример 8: Реальный сценарий - проверка рецепта
 */
export function example8_RecipeScenario() {
  console.log('=== Пример 8: Сценарий с рецептом ===\n');
  
  // Рецепт блинов требует:
  const recipe = {
    flour: { quantity: 300, unit: 'г' },
    milk: { quantity: 0.5, unit: 'л' },
    eggs: { quantity: 2, unit: 'шт' },
  };
  
  // В холодильнике есть:
  const inventory = {
    flour: { quantity: 0.5, unit: 'кг' },  // 500 г
    milk: { quantity: 600, unit: 'мл' },
    eggs: { quantity: 10, unit: 'шт' },
  };
  
  console.log('Рецепт блинов - проверка ингредиентов:\n');
  
  // Мука
  const hasFlour = hasEnoughQuantity(
    inventory.flour.quantity, inventory.flour.unit,
    recipe.flour.quantity, recipe.flour.unit
  );
  console.log(`Мука: нужно ${recipe.flour.quantity} ${recipe.flour.unit}, есть ${inventory.flour.quantity} ${inventory.flour.unit} - ${hasFlour ? '✅' : '❌'}`);
  
  // Молоко
  const hasMilk = hasEnoughQuantity(
    inventory.milk.quantity, inventory.milk.unit,
    recipe.milk.quantity, recipe.milk.unit
  );
  console.log(`Молоко: нужно ${recipe.milk.quantity} ${recipe.milk.unit}, есть ${inventory.milk.quantity} ${inventory.milk.unit} - ${hasMilk ? '✅' : '❌'}`);
  
  // Яйца
  const hasEggs = hasEnoughQuantity(
    inventory.eggs.quantity, inventory.eggs.unit,
    recipe.eggs.quantity, recipe.eggs.unit
  );
  console.log(`Яйца: нужно ${recipe.eggs.quantity} ${recipe.eggs.unit}, есть ${inventory.eggs.quantity} ${inventory.eggs.unit} - ${hasEggs ? '✅' : '❌'}`);
  
  const canCook = hasFlour && hasMilk && hasEggs;
  console.log(`\nМожно приготовить блины: ${canCook ? '✅ ДА' : '❌ НЕТ'}\n`);
}

/**
 * Пример 9: Добавление рецепта с конвертацией единиц
 */
export function example9_AddRecipeScenario() {
  console.log('=== Пример 9: Добавление рецепта с конвертацией ===\n');
  
  // Пользователь вводит ингредиенты рецепта в удобных единицах
  const recipeIngredients = [
    { name: 'Мука', quantity: 1.5, unit: 'кг' },
    { name: 'Молоко', quantity: 2, unit: 'л' },
    { name: 'Сахар', quantity: 300, unit: 'г' },
    { name: 'Масло', quantity: 250, unit: 'г' },
    { name: 'Ваниль', quantity: 2, unit: 'ч.л.' },
  ];
  
  console.log('Ингредиенты рецепта (исходные):');
  recipeIngredients.forEach(ing => {
    console.log(`  ${ing.name}: ${ing.quantity} ${ing.unit}`);
  });
  
  console.log('\nПосле конвертации в базовые единицы:');
  recipeIngredients.forEach(ing => {
    const converted = convertToBaseUnit(ing.quantity, ing.unit);
    console.log(`  ${ing.name}: ${converted.quantity} ${converted.unit}`);
  });
  
  console.log('\n✅ Рецепт сохранен в базовых единицах для консистентности!\n');
}

/**
 * Запустить все примеры
 */
export function runAllExamples() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║  Примеры системы конвертации единиц измерения  ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  
  example1_BasicConversion();
  example2_UnitConversion();
  example3_CheckSufficiency();
  example4_UnitCompatibility();
  example5_CompareQuantities();
  example6_FormatDisplay();
  example7_DisplayUnit();
  example8_RecipeScenario();
  example9_AddRecipeScenario();
  
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║              Все примеры выполнены              ║');
  console.log('╚════════════════════════════════════════════════╝');
}

// Запустить все примеры при импорте (для тестирования)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('💡 Для запуска примеров используйте: runAllExamples()');
}
