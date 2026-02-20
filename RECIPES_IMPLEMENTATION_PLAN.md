# 🍳 План реализации модуля рецептов для i.refrigerator

**Дата создания:** 2026-02-20  
**Цель:** Добавить функциональность управления рецептами, поиска по ингредиентам и создания списков покупок

---

## 📊 Архитектура данных в Google Sheets

### Структура листов в одной таблице:

```
📊 Refrigerator (Google Spreadsheet)
  ├─ 📄 Inventory       - Текущий инвентарь холодильника
  ├─ 📄 Products        - Справочник всех продуктов (мастер-список)
  ├─ 📄 Recipes         - Рецепты
  ├─ 📄 RecipeProducts  - Связь рецептов и продуктов (ингредиенты)
  ├─ 📄 ShoppingList    - Список покупок
  └─ 📄 Categories      - Справочник категорий
```

---

## 🎯 ЭТАП 1: Подготовка и миграция данных (Foundation)

**Цель:** Создать структуру листов в Google Sheets и мигрировать существующий Inventory

### 1.1 Обновить типы данных

**Файлы для создания/изменения:**

- [ ] `src/types/product.ts` - новый файл
  ```typescript
  export interface Product {
    product_id: string;
    name: string;
    category: string;
    default_unit: string;
    aliases?: string; // через запятую
    typical_shelf_life_days?: number;
    created_date: string;
    usage_count: number;
  }
  ```

- [ ] `src/types/inventory.ts` - обновить существующий
  ```typescript
  export interface InventoryItem {
    inventory_id: string;
    product_id: string; // FK → Products
    quantity: number;
    unit: string;
    expiryDate?: string;
    added_date: string;
    notes?: string;
  }
  
  export interface InventoryItemWithProduct extends InventoryItem {
    product: Product; // JOIN данные
  }
  ```

- [ ] `src/types/recipe.ts` - новый файл
  ```typescript
  export interface Recipe {
    recipe_id: string;
    name: string;
    description?: string;
    servings: number;
    cooking_time: number;
    categories: string; // через запятую
    instructions: string; // через || или \n
    image_url?: string;
    tags?: string; // через запятую
    created_date: string;
    last_used_date?: string;
  }
  
  export interface RecipeIngredient {
    recipe_product_id: string;
    recipe_id: string;
    product_id: string;
    quantity: number;
    unit: string;
    optional: boolean;
    notes?: string;
  }
  
  export interface RecipeWithIngredients extends Recipe {
    ingredients: (RecipeIngredient & { product: Product })[];
  }
  ```

- [ ] `src/types/shopping.ts` - новый файл
  ```typescript
  export interface ShoppingListItem {
    shopping_item_id: string;
    product_id: string;
    recipe_id?: string;
    quantity_needed: number;
    quantity_available: number;
    quantity_to_buy: number;
    unit: string;
    checked: boolean;
    added_date: string;
    purchased_date?: string;
  }
  
  export interface ShoppingListItemWithDetails extends ShoppingListItem {
    product: Product;
    recipe_name?: string;
  }
  ```

- [ ] `src/types/category.ts` - новый файл
  ```typescript
  export interface Category {
    category_id: string;
    name: string;
    type: 'predefined' | 'custom';
    usage_count: number;
    created_date: string;
  }
  ```

### 1.2 Создать сервис управления листами Google Sheets

- [ ] `src/lib/googleSheets/sheetsManager.ts` - новый файл
  ```typescript
  export class SheetsManager {
    async ensureSheetsExist(): Promise<void>
    async getOrCreateSheet(sheetName: string): Promise<void>
    async getSheetId(sheetName: string): Promise<number | null>
    async getAllSheets(): Promise<SheetInfo[]>
  }
  ```

### 1.3 Создать миграционный скрипт

- [ ] `src/lib/migrations/migrateToProducts.ts` - новый файл
  - Извлечь уникальные продукты из текущего Inventory
  - Создать лист Products
  - Заполнить Products уникальными продуктами
  - Обновить Inventory, заменив name на product_id
  - Создать резервную копию старых данных

### 1.4 Обновить существующий инвентарь

- [ ] `src/lib/googleSheets/inventorySync.ts` - обновить существующий
  - Добавить поддержку product_id вместо name
  - Добавить методы JOIN с Products

**Результат этапа:**
- ✅ Структура листов создана
- ✅ Старый Inventory мигрирован на новую схему с Products
- ✅ Типы обновлены

---

## 🎯 ЭТАП 2: Справочник продуктов (Products Module)

**Цель:** Реализовать работу со справочником продуктов и автодополнение

### 2.1 Создать сервис Products

- [ ] `src/lib/googleSheets/productsSync.ts` - новый файл
  ```typescript
  export class ProductsSyncService {
    async getAllProducts(): Promise<Product[]>
    async getProduct(productId: string): Promise<Product | null>
    async addProduct(product: Omit<Product, 'product_id'>): Promise<Product>
    async updateProduct(product: Product): Promise<boolean>
    async deleteProduct(productId: string): Promise<boolean>
    async searchProducts(query: string): Promise<Product[]>
    async getMostUsedProducts(limit: number): Promise<Product[]>
    async incrementUsageCount(productId: string): Promise<void>
  }
  ```

### 2.2 Создать хук для работы с продуктами

- [ ] `src/hooks/useProducts.ts` - новый файл
  ```typescript
  export function useProducts() {
    // Загрузка продуктов
    // Поиск и автодополнение
    // Кэширование в памяти
  }
  ```

### 2.3 Обновить форму добавления в инвентарь

- [ ] `src/components/InventoryForm.tsx` - обновить существующий
  - Добавить автодополнение продуктов из Products
  - При выборе продукта автоматически заполнять unit и typical_shelf_life
  - При вводе нового продукта - создавать запись в Products

### 2.4 Создать страницу управления продуктами

- [ ] `src/app/products/page.tsx` - новый файл (опционально для Phase 2+)
  - Список всех продуктов
  - Редактирование, удаление
  - Статистика использования

**Результат этапа:**
- ✅ Справочник продуктов работает
- ✅ Автодополнение при добавлении в инвентарь
- ✅ Новые продукты автоматически добавляются в справочник

---

## 🎯 ЭТАП 3: CRUD рецептов (Recipes Basic)

**Цель:** Создать базовую функциональность управления рецептами

### 3.1 Создать сервисы для рецептов

- [ ] `src/lib/googleSheets/recipesSync.ts` - новый файл
  ```typescript
  export class RecipesSyncService {
    async getRecipes(): Promise<Recipe[]>
    async getRecipe(recipeId: string): Promise<RecipeWithIngredients | null>
    async addRecipe(recipe: Omit<Recipe, 'recipe_id'>): Promise<Recipe>
    async updateRecipe(recipe: Recipe): Promise<boolean>
    async deleteRecipe(recipeId: string): Promise<boolean>
  }
  ```

- [ ] `src/lib/googleSheets/recipeProductsSync.ts` - новый файл
  ```typescript
  export class RecipeProductsSyncService {
    async getRecipeIngredients(recipeId: string): Promise<RecipeIngredient[]>
    async addIngredient(ingredient: Omit<RecipeIngredient, 'recipe_product_id'>): Promise<void>
    async updateIngredient(ingredient: RecipeIngredient): Promise<boolean>
    async deleteIngredient(recipeProductId: string): Promise<boolean>
    async deleteAllIngredientsForRecipe(recipeId: string): Promise<void>
  }
  ```

### 3.2 Создать компоненты рецептов

- [ ] `src/components/recipes/RecipeCard.tsx` - новый файл
  - Карточка рецепта с превью
  - Категории, время приготовления, порции
  - Кнопки редактирования/удаления

- [ ] `src/components/recipes/RecipeList.tsx` - новый файл
  - Список рецептов грид-лейаут
  - Фильтрация и сортировка

- [ ] `src/components/recipes/RecipeForm.tsx` - новый файл
  - Форма создания/редактирования рецепта
  - Поля: название, описание, порции, время
  - Множественный выбор категорий
  - Добавление ингредиентов с автодополнением из Products
  - Список инструкций (добавить/удалить шаги)

- [ ] `src/components/recipes/RecipeDetail.tsx` - новый файл
  - Детальный просмотр рецепта
  - Список ингредиентов с указанием наличия
  - Инструкции по шагам
  - Кнопка "Создать список покупок"

### 3.3 Создать страницы рецептов

- [ ] `src/app/recipes/page.tsx` - новый файл
  - Список всех рецептов
  - Поиск по названию
  - Фильтры по категориям
  - Кнопка "Добавить рецепт"

- [ ] `src/app/recipes/new/page.tsx` - новый файл
  - Страница создания нового рецепта
  - Использует RecipeForm

- [ ] `src/app/recipes/[id]/page.tsx` - новый файл
  - Страница просмотра рецепта
  - Использует RecipeDetail

- [ ] `src/app/recipes/[id]/edit/page.tsx` - новый файл
  - Страница редактирования рецепта
  - Использует RecipeForm с данными рецепта

### 3.4 Добавить навигацию

- [ ] Обновить `src/app/page.tsx`
  - Добавить кнопку "Рецепты" в шапку

- [ ] Обновить `src/app/layout.tsx` (если есть навигация)
  - Добавить пункт "Рецепты" в меню

**Результат этапа:**
- ✅ Можно создавать, просматривать, редактировать, удалять рецепты
- ✅ Ингредиенты связаны с Products через product_id
- ✅ Базовая навигация по рецептам работает

---

## 🎯 ЭТАП 4: Поиск рецептов по ингредиентам (Smart Search)

**Цель:** Реализовать умный поиск рецептов на основе продуктов в холодильнике

### 4.1 Создать сервис сопоставления рецептов

- [ ] `src/lib/recipeMatcher.ts` - новый файл
  ```typescript
  export interface RecipeMatch {
    recipe: RecipeWithIngredients;
    matchPercentage: number; // 0-100
    availableIngredients: RecipeIngredient[];
    missingIngredients: RecipeIngredient[];
    canCook: boolean; // все обязательные ингредиенты есть
    missingQuantities: { product_id: string; missing: number; unit: string }[];
  }
  
  export async function matchRecipesWithInventory(
    inventory: InventoryItem[]
  ): Promise<RecipeMatch[]>
  ```

### 4.2 Создать компоненты поиска

- [ ] `src/components/recipes/RecipeSearch.tsx` - новый файл
  - Автоматический анализ инвентаря
  - Список рецептов с процентом совпадения
  - Сортировка: "Можно приготовить" → "Почти можно" → "Нужно докупить"
  - Цветовая индикация (зеленый/желтый/красный)

- [ ] `src/components/recipes/IngredientMatchBadge.tsx` - новый файл
  - Бейдж с процентом совпадения
  - Иконка статуса (✅/⚠️/❌)

- [ ] `src/components/recipes/MissingIngredientsList.tsx` - новый файл
  - Список недостающих ингредиентов с количествами
  - "Есть 200г, нужно 500г, не хватает 300г"

### 4.3 Создать страницу поиска

- [ ] `src/app/recipes/search/page.tsx` - новый файл
  - Использует RecipeSearch
  - Показывает рецепты, отсортированные по совпадению
  - Фильтры: "Только те, что могу приготовить"

### 4.4 Интегрировать с главной страницей

- [ ] Обновить `src/app/page.tsx`
  - Добавить кнопку "Что приготовить?" на главной
  - Показывать топ-3 рецепта, которые можно приготовить сейчас

**Результат этапа:**
- ✅ Поиск рецептов по наличию ингредиентов работает
- ✅ Процент совпадения отображается
- ✅ Пользователь видит, чего не хватает

---

## 🎯 ЭТАП 5: Список покупок (Shopping List)

**Цель:** Генерация списка покупок и добавление купленного в инвентарь

### 5.1 Создать сервис списка покупок

- [ ] `src/lib/googleSheets/shoppingListSync.ts` - новый файл
  ```typescript
  export class ShoppingListSyncService {
    async getShoppingList(): Promise<ShoppingListItemWithDetails[]>
    async addToShoppingList(items: Omit<ShoppingListItem, 'shopping_item_id'>[]): Promise<void>
    async generateFromRecipe(recipeId: string, inventory: InventoryItem[]): Promise<void>
    async toggleChecked(itemId: string): Promise<boolean>
    async clearCompleted(): Promise<void>
    async moveCheckedToInventory(expiryDates?: Map<string, string>): Promise<void>
  }
  ```

### 5.2 Создать компоненты списка покупок

- [ ] `src/components/shopping/ShoppingList.tsx` - новый файл
  - Список продуктов с чекбоксами
  - Группировка по категориям
  - Показывает: сколько нужно, сколько есть, сколько купить

- [ ] `src/components/shopping/ShoppingItem.tsx` - новый файл
  - Один элемент списка
  - Чекбокс для отметки
  - Название продукта, количество
  - Иконка категории

- [ ] `src/components/shopping/AddToInventoryButton.tsx` - новый файл
  - Кнопка "Добавить купленное в холодильник"
  - При клике открывает модалку с запросом сроков годности
  - Переносит отмеченные продукты в Inventory

- [ ] `src/components/shopping/GenerateShoppingListButton.tsx` - новый файл
  - Кнопка на странице рецепта
  - Генерирует список покупок из недостающих ингредиентов

### 5.3 Создать страницу списка покупок

- [ ] `src/app/shopping-list/page.tsx` - новый файл
  - Отображает текущий список покупок
  - Фильтры: "Все" / "Активные" / "Купленные"
  - Кнопки: "Очистить купленное", "Добавить в холодильник"

### 5.4 Интегрировать с рецептами

- [ ] Обновить `src/app/recipes/[id]/page.tsx`
  - Добавить кнопку "Создать список покупок"
  - При клике: анализировать инвентарь и создавать записи в ShoppingList

- [ ] Обновить навигацию
  - Добавить пункт "Список покупок" в меню
  - Показывать бейдж с количеством активных позиций

**Результат этапа:**
- ✅ Генерация списка покупок из рецепта работает
- ✅ Можно отмечать купленные продукты
- ✅ Купленные продукты добавляются в инвентарь одним кликом

---

## 🎯 ЭТАП 6: Категории рецептов (Categories Module)

**Цель:** Управление категориями рецептов, фильтрация

### 6.1 Создать сервис категорий

- [ ] `src/lib/googleSheets/categoriesSync.ts` - новый файл
  ```typescript
  export class CategoriesSyncService {
    async getCategories(): Promise<Category[]>
    async addCategory(name: string, type: 'custom' | 'predefined'): Promise<Category>
    async deleteCategory(categoryId: string): Promise<boolean>
    async renameCategory(categoryId: string, newName: string): Promise<boolean>
    async incrementUsageCount(categoryName: string): Promise<void>
    async getMostUsedCategories(limit: number): Promise<Category[]>
  }
  ```

- [ ] `src/lib/categoriesManager.ts` - новый файл
  ```typescript
  export const SUGGESTED_CATEGORIES = [
    'Русская кухня', 'Азия', 'Европейская', 'Итальянская',
    'Завтрак', 'Обед', 'Ужин', 'Десерт', 'Перекус',
    'Быстро', 'Сытное', 'Легкое', 'ПП', 'Вегетарианское',
  ];
  
  export function getAllCategories(): Promise<string[]>
  export function suggestCategories(query: string): string[]
  ```

### 6.2 Создать компоненты категорий

- [ ] `src/components/categories/CategorySelector.tsx` - новый файл
  - Множественный выбор категорий
  - Автодополнение из SUGGESTED_CATEGORIES + custom
  - Чипы для выбранных категорий

- [ ] `src/components/categories/CategoryFilter.tsx` - новый файл
  - Фильтр рецептов по категориям
  - Список чекбоксов с количеством рецептов
  - "Азия (12)" "Быстро (45)"

- [ ] `src/components/categories/CategoryManager.tsx` - новый файл
  - Управление пользовательскими категориями
  - Список категорий с кнопками удаления/переименования

### 6.3 Интегрировать в рецепты

- [ ] Обновить `src/components/recipes/RecipeForm.tsx`
  - Заменить простое поле на CategorySelector

- [ ] Обновить `src/app/recipes/page.tsx`
  - Добавить CategoryFilter в боковую панель

### 6.4 Создать страницу управления категориями

- [ ] `src/app/settings/categories/page.tsx` - новый файл (опционально)
  - Список всех категорий
  - Статистика использования
  - Создание/удаление/переименование

**Результат этапа:**
- ✅ Рецепты имеют множественные категории
- ✅ Фильтрация по категориям работает
- ✅ Пользователь может управлять своими категориями

---

## 🎯 ЭТАП 7: Синхронизация и оффлайн-режим (Sync & Cache)

**Цель:** Надежная синхронизация с Google Sheets и работа оффлайн

### 7.1 Улучшить менеджер синхронизации

- [ ] `src/lib/syncManager.ts` - новый файл
  ```typescript
  export class SyncManager {
    async syncAll(): Promise<SyncResult>
    async syncProducts(): Promise<void>
    async syncInventory(): Promise<void>
    async syncRecipes(): Promise<void>
    async syncShoppingList(): Promise<void>
    async syncCategories(): Promise<void>
    
    // Оффлайн кэш
    async cacheAllData(): Promise<void>
    async loadFromCache(): Promise<CachedData>
    isOnline(): boolean
  }
  ```

### 7.2 Обновить хранилище

- [ ] `src/lib/cacheService.ts` - новый файл
  - Кэширование всех данных в localStorage
  - Метки времени для определения актуальности
  - Очистка старого кэша

### 7.3 Добавить индикаторы синхронизации

- [ ] `src/components/SyncStatus.tsx` - новый компонент
  - Показывает статус синхронизации
  - Иконка: синхронизировано / синхронизируется / оффлайн
  - Время последней синхронизации

- [ ] Обновить `src/components/SyncButtons.tsx`
  - Добавить синхронизацию рецептов и списка покупок

### 7.4 Обработка конфликтов

- [ ] `src/lib/conflictResolver.ts` - новый файл
  - Стратегия разрешения конфликтов (last-write-wins или merge)
  - Уведомления о конфликтах

**Результат этапа:**
- ✅ Все модули синхронизируются с Google Sheets
- ✅ Приложение работает оффлайн с кэшем
- ✅ Пользователь видит статус синхронизации

---

## 🎯 ЭТАП 8: UI/UX улучшения и полировка (Polish)

**Цель:** Улучшить пользовательский опыт, добавить анимации и детали

### 8.1 Улучшить дизайн

- [ ] Добавить скелетоны загрузки (skeleton screens)
- [ ] Анимации переходов между страницами
- [ ] Hover-эффекты на карточках
- [ ] Тостеры для уведомлений (react-hot-toast)

### 8.2 Мобильная адаптация

- [ ] Проверить все компоненты на мобильных
- [ ] Адаптивная навигация (бургер-меню)
- [ ] Touch-friendly элементы

### 8.3 Добавить аналитику и статистику

- [ ] `src/app/stats/page.tsx` - новая страница (опционально)
  - Топ используемых продуктов
  - Топ рецептов
  - Статистика покупок
  - График сроков годности

### 8.4 Улучшить поиск

- [ ] Полнотекстовый поиск по рецептам
- [ ] Поиск по тегам
- [ ] История поиска

### 8.5 Добавить фичи удобства

- [ ] Дублирование рецепта
- [ ] Экспорт рецепта в PDF/текст
- [ ] Масштабирование рецепта (пересчет на другое количество порций)
- [ ] Таймер приготовления

**Результат этапа:**
- ✅ Приложение выглядит профессионально
- ✅ Все работает быстро и плавно
- ✅ Удобно пользоваться на любых устройствах

---

## 🎯 ЭТАП 9: Расширенные функции (Advanced Features)

**Цель:** Добавить продвинутые функции (опционально)

### 9.1 Импорт рецептов

- [ ] `src/lib/recipeImporter.ts` - новый файл
  - Парсинг рецептов с популярных сайтов
  - Импорт из JSON
  - Распознавание продуктов из текста

### 9.2 Изображения рецептов

- [ ] Загрузка изображений в Google Drive
- [ ] Превью изображений
- [ ] Оптимизация изображений

### 9.3 Планирование меню

- [ ] `src/app/meal-plan/page.tsx` - новая страница
  - Планирование меню на неделю
  - Автоматическая генерация списка покупок на неделю
  - Календарь рецептов

### 9.4 Социальные функции

- [ ] Экспорт ссылки на рецепт для шаринга
- [ ] Импорт рецептов из общей библиотеки
- [ ] Комментарии и рейтинги (если несколько пользователей)

### 9.5 AI-интеграция

- [ ] Предложения рецептов на основе истории
- [ ] Генерация рецептов по ингредиентам (GPT API)
- [ ] Автоматическое распознавание продуктов из фото чека

**Результат этапа:**
- ✅ Приложение имеет уникальные функции
- ✅ Пользователю легко управлять рецептами
- ✅ Интеграции с внешними сервисами

---

## 📝 Чеклист готовности каждого этапа

**Определение Done для этапа:**
- [ ] Все типы данных определены
- [ ] Сервисы написаны и протестированы
- [ ] Компоненты работают
- [ ] Синхронизация с Google Sheets работает
- [ ] UI соответствует дизайну
- [ ] Нет критичных багов
- [ ] Этап протестирован вручную
- [ ] Документация обновлена (если нужно)

---

## 🚀 Приоритеты реализации

**Высокий приоритет (MVP):**
- Этап 1: Подготовка и миграция
- Этап 2: Справочник продуктов
- Этап 3: CRUD рецептов
- Этап 4: Поиск рецептов
- Этап 5: Список покупок

**Средний приоритет:**
- Этап 6: Категории
- Этап 7: Синхронизация

**Низкий приоритет (Nice to have):**
- Этап 8: Полировка
- Этап 9: Расширенные функции

---

## 📚 Зависимости между этапами

```
Этап 1 (Foundation)
   ↓
Этап 2 (Products) ──┐
   ↓                │
Этап 3 (Recipes) ←──┘
   ↓
Этап 4 (Search)
   ↓
Этап 5 (Shopping)
   ↓
Этап 6 (Categories) ──┐
   ↓                  │
Этап 7 (Sync) ←───────┘
   ↓
Этап 8 (Polish)
   ↓
Этап 9 (Advanced)
```

---

## 🔧 Технические требования

**Стек:**
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Google Sheets API
- date-fns

**Паттерны:**
- Clients-side архитектура (SSG + CSR)
- localStorage для кэша и токенов
- Google Sheets как база данных
- Сервисный слой для бизнес-логики
- Компонентный подход для UI

**Производительность:**
- Кэширование запросов к Google Sheets
- Оптимизация рендеринга списков (React.memo, useMemo)
- Ленивая загрузка изображений
- Batch операции для обновления данных

---

## 📅 Временные оценки

| Этап | Задач | Оценка времени |
|------|-------|----------------|
| Этап 1 | ~8 | 4-6 часов |
| Этап 2 | ~5 | 3-4 часа |
| Этап 3 | ~10 | 6-8 часов |
| Этап 4 | ~5 | 3-4 часа |
| Этап 5 | ~8 | 4-6 часов |
| Этап 6 | ~6 | 3-4 часа |
| Этап 7 | ~6 | 4-6 часов |
| Этап 8 | ~8 | 4-8 часов |
| Этап 9 | ~12 | 8-12 часов |
| **ИТОГО** | **~68 задач** | **40-58 часов** |

**MVP (Этапы 1-5):** ~20-28 часов  
**Полная версия (Этапы 1-7):** ~28-38 часов

---

## 🎯 Текущий статус

**Активный этап:** Этап 1 - Завершен ✅  
**Прогресс:** 8 / 68 задач (12%)

### Выполнено:
- ✅ Созданы все типы данных (Product, Inventory, Recipe, Shopping, Category)
- ✅ Создан SheetsManager для управления листами
- ✅ Создан миграционный скрипт для перехода на новую структуру
- ✅ Создан InventorySyncService для работы с новым Inventory
- ✅ Очищен код от неиспользуемых файлов и серверных API routes

### Удалено (очистка кода):
- ❌ src/app/api/ - серверные API routes (не нужны в клиентской архитектуре)
- ❌ src/lib/googleSheets.ts - старый серверный сервис
- ❌ src/lib/inventoryStore.ts - заменен на storageService
- ❌ src/lib/inventoryAdapter.ts - неиспользуемый адаптер

---

## 📌 Примечания

- План может корректироваться по мере реализации
- Каждый этап должен заканчиваться рабочим приложением
- Тестирование проводится на реальных Google Sheets
- Резервное копирование данных перед миграциями обязательно

---

**Готовы начинать? С какого этапа начнем?**
