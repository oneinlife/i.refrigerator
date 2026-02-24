/**
 * RecipeMatcher - Google Apps Script для расчета совпадений рецептов с инвентарем
 * 
 * ВАЖНО: Все данные должны быть в БАЗОВЫХ ЕДИНИЦАХ (г, мл, шт)
 * - Inventory: количество в граммах, миллилитрах или штуках
 * - RecipeProducts: количество в граммах, миллилитрах или штуках
 * 
 * Установка:
 * 1. Откройте Google Sheets
 * 2. Расширения → Apps Script
 * 3. Создайте новый файл и вставьте этот код
 * 4. Сохраните как "RecipeMatcher"
 * 5. Запустите функцию setupTriggers() для настройки автоматического пересчета
 */

/**
 * Настройка триггеров для автоматического пересчета
 * Запустите эту функцию ОДИН РАЗ после установки скрипта
 */
function setupTriggers() {
  // Удаляем старые триггеры
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  // Создаем триггер на изменение таблицы
  ScriptApp.newTrigger('onInventoryChange')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();
    
  Logger.log('✅ Триггеры настроены! RecipeMatches будет обновляться автоматически.');
}

/**
 * Обработчик изменения таблицы
 * Автоматически пересчитывает совпадения при изменении Inventory или RecipeProducts
 */
function onInventoryChange(e) {
  if (!e) return;
  
  const sheet = e.source.getActiveSheet();
  const sheetName = sheet.getName();
  
  // Пересчитываем только при изменении Inventory или RecipeProducts
  if (sheetName === 'Inventory' || sheetName === 'RecipeProducts') {
    Logger.log('🔄 Обнаружено изменение в ' + sheetName + ', пересчет...');
    calculateRecipeMatches();
  }
}

/**
 * Основная функция расчета совпадений рецептов
 * Можно запустить вручную из меню: Расширения → Apps Script → Выполнить
 */
function calculateRecipeMatches() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    Logger.log('📊 Начинаем расчет совпадений рецептов...');
    
    // Загружаем данные
    const inventory = loadInventory(ss);
    const recipes = loadRecipes(ss);
    const recipeProducts = loadRecipeProducts(ss);
    
    Logger.log(`Загружено: ${Object.keys(inventory).length} продуктов в инвентаре, ${recipes.length} рецептов`);
    
    // Группируем продукты по рецептам
    const recipeIngredientsMap = groupIngredientsByRecipe(recipeProducts);
    
    // Рассчитываем совпадения для каждого рецепта
    const matches = [];
    recipes.forEach(recipe => {
      const ingredients = recipeIngredientsMap[recipe.recipe_id] || [];
      const match = calculateRecipeMatch(recipe, ingredients, inventory);
      matches.push(match);
    });
    
    // Сортируем по проценту совпадения (убывание)
    matches.sort((a, b) => b.match_percentage - a.match_percentage);
    
    // Записываем результаты в лист RecipeMatches
    writeMatchesToSheet(ss, matches);
    
    Logger.log(`✅ Расчет завершен! Обработано ${matches.length} рецептов`);
    
  } catch (error) {
    Logger.log('❌ Ошибка при расчете: ' + error.toString());
    throw error;
  }
}

/**
 * Загрузить инвентарь в Map: product_id → quantity
 */
function loadInventory(ss) {
  const sheet = ss.getSheetByName('Inventory');
  if (!sheet) {
    Logger.log('⚠️ Лист Inventory не найден');
    return {};
  }
  
  const data = sheet.getDataRange().getValues();
  const inventory = {};
  
  // Пропускаем заголовок (строка 1)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const product_id = row[1]; // B: product_id
    const quantity = parseFloat(row[2]) || 0; // C: quantity
    const unit = row[3]; // D: unit
    
    if (product_id) {
      // Суммируем количество для одного и того же продукта
      if (!inventory[product_id]) {
        inventory[product_id] = { quantity: 0, unit: unit };
      }
      inventory[product_id].quantity += quantity;
    }
  }
  
  return inventory;
}

/**
 * Загрузить список рецептов со всеми полями
 */
function loadRecipes(ss) {
  const sheet = ss.getSheetByName('Recipes');
  if (!sheet) {
    Logger.log('⚠️ Лист Recipes не найден');
    return [];
  }
  
  const data = sheet.getDataRange().getValues();
  const recipes = [];
  
  // Пропускаем заголовок (строка 1)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const recipe_id = row[0]; // A: recipe_id
    const name = row[1]; // B: name
    const description = row[2]; // C: description
    const servings = row[3]; // D: servings
    const cooking_time = row[4]; // E: cooking_time
    const categories = row[5]; // F: categories
    const instructions = row[6]; // G: instructions
    const image_url = row[7]; // H: image_url
    const tags = row[8]; // I: tags
    
    if (recipe_id) {
      recipes.push({
        recipe_id: recipe_id,
        name: name || 'Без названия',
        description: description || '',
        servings: servings || 1,
        cooking_time: cooking_time || 0,
        categories: categories || '',
        instructions: instructions || '',
        image_url: image_url || '',
        tags: tags || ''
      });
    }
  }
  
  return recipes;
}

/**
 * Загрузить продукты рецептов
 */
function loadRecipeProducts(ss) {
  const sheet = ss.getSheetByName('RecipeProducts');
  if (!sheet) {
    Logger.log('⚠️ Лист RecipeProducts не найден');
    return [];
  }
  
  const data = sheet.getDataRange().getValues();
  const recipeProducts = [];
  
  // Пропускаем заголовок (строка 1)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const recipe_id = row[1]; // B: recipe_id
    const product_id = row[2]; // C: product_id
    const quantity = parseFloat(row[3]) || 0; // D: quantity
    const unit = row[4]; // E: unit
    const optional = row[5] === true || row[5] === 'TRUE'; // F: optional
    
    if (recipe_id && product_id) {
      recipeProducts.push({
        recipe_id: recipe_id,
        product_id: product_id,
        quantity: quantity,
        unit: unit,
        optional: optional
      });
    }
  }
  
  return recipeProducts;
}

/**
 * Группировать ингредиенты по recipe_id
 */
function groupIngredientsByRecipe(recipeProducts) {
  const map = {};
  
  recipeProducts.forEach(item => {
    if (!map[item.recipe_id]) {
      map[item.recipe_id] = [];
    }
    map[item.recipe_id].push(item);
  });
  
  return map;
}

/**
 * Рассчитать совпадение одного рецепта с инвентарем
 * ВАЖНО: Все количества должны быть в ОДИНАКОВЫХ ЕДИНИЦАХ (базовых)
 */
function calculateRecipeMatch(recipe, ingredients, inventory) {
  let availableCount = 0;
  let missingCount = 0;
  let requiredAvailableCount = 0;
  
  const availableIngredients = [];
  const missingIngredients = [];
  
  const requiredIngredients = ingredients.filter(ing => !ing.optional);
  
  ingredients.forEach(ingredient => {
    const inventoryItem = inventory[ingredient.product_id];
    const isRequired = !ingredient.optional;
    
    // Проверяем, достаточно ли продукта в инвентаре
    if (inventoryItem && inventoryItem.quantity >= ingredient.quantity) {
      availableCount++;
      if (isRequired) {
        requiredAvailableCount++;
      }
      availableIngredients.push({
        product_id: ingredient.product_id,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        optional: ingredient.optional
      });
    } else {
      missingCount++;
      missingIngredients.push({
        product_id: ingredient.product_id,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        optional: ingredient.optional,
        available_quantity: inventoryItem ? inventoryItem.quantity : 0
      });
    }
  });
  
  const totalIngredients = ingredients.length;
  const matchPercentage = totalIngredients > 0 
    ? Math.round((availableCount / totalIngredients) * 100) 
    : 0;
  
  // Можно приготовить, если все обязательные ингредиенты есть
  const canCook = requiredIngredients.length === requiredAvailableCount;
  
  return {
    recipe_id: recipe.recipe_id,
    recipe_name: recipe.name,
    recipe_description: recipe.description,
    recipe_servings: recipe.servings,
    recipe_cooking_time: recipe.cooking_time,
    recipe_categories: recipe.categories,
    recipe_image_url: recipe.image_url,
    recipe_tags: recipe.tags,
    match_percentage: matchPercentage,
    available_ingredients_count: availableCount,
    missing_ingredients_count: missingCount,
    total_ingredients_count: totalIngredients,
    available_ingredients: availableIngredients,
    missing_ingredients: missingIngredients,
    can_cook: canCook,
    last_updated: new Date()
  };
}

/**
 * Записать результаты в лист RecipeMatches
 */
function writeMatchesToSheet(ss, matches) {
  let sheet = ss.getSheetByName('RecipeMatches');
  
  // Создаем лист, если его нет
  if (!sheet) {
    Logger.log('📝 Создаем лист RecipeMatches...');
    sheet = ss.insertSheet('RecipeMatches');
  }
  
  // Заголовки (обновляем каждый раз для гарантии актуальности)
  sheet.getRange(1, 1, 1, 16).setValues([[
    'recipe_id',
    'recipe_name',
    'recipe_description',
    'recipe_servings',
    'recipe_cooking_time',
    'recipe_categories',
    'recipe_image_url',
    'recipe_tags',
    'match_percentage',
    'available_ingredients_count',
    'missing_ingredients_count',
    'total_ingredients_count',
    'available_ingredients',
    'missing_ingredients',
    'can_cook',
    'last_updated'
  ]]);
  
  // Форматирование заголовков
  sheet.getRange(1, 1, 1, 16)
    .setFontWeight('bold')
    .setBackground('#4285f4')
    .setFontColor('#ffffff');
  
  // Очищаем старые данные (кроме заголовка)
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 16).clearContent();
  }
  
  // Записываем новые данные
  if (matches.length > 0) {
    const values = matches.map(match => [
      match.recipe_id,
      match.recipe_name,
      match.recipe_description,
      match.recipe_servings,
      match.recipe_cooking_time,
      match.recipe_categories,
      match.recipe_image_url,
      match.recipe_tags,
      match.match_percentage,
      match.available_ingredients_count,
      match.missing_ingredients_count,
      match.total_ingredients_count,
      JSON.stringify(match.available_ingredients),
      JSON.stringify(match.missing_ingredients),
      match.can_cook,
      match.last_updated
    ]);
    
    sheet.getRange(2, 1, values.length, 16).setValues(values);
    
    // Форматирование
    // Процент совпадения - жирным
    sheet.getRange(2, 9, values.length, 1).setFontWeight('bold');
    
    // can_cook - зеленый/красный фон
    const canCookRange = sheet.getRange(2, 15, values.length, 1);
    matches.forEach((match, index) => {
      const cell = sheet.getRange(2 + index, 15);
      if (match.can_cook) {
        cell.setBackground('#d4edda').setFontColor('#155724');
      } else {
        cell.setBackground('#f8d7da').setFontColor('#721c24');
      }
    });
  }
  
  // Автоширина колонок
  sheet.autoResizeColumns(1, 16);
  
  Logger.log(`✅ Записано ${matches.length} совпадений в RecipeMatches`);
}

/**
 * Создать меню для быстрого доступа
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🍳 Рецепты')
    .addItem('🔄 Пересчитать совпадения', 'calculateRecipeMatches')
    .addItem('⚙️ Настроить автообновление', 'setupTriggers')
    .addToUi();
}
