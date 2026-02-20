# Быстрая справка - i.refrigerator

## Основные команды

```bash
# Установка зависимостей
npm install

# Запуск dev сервера
npm run dev

# Сборка для production
npm run build

# Запуск production сервера
npm start

# Проверка кода
npm run lint
```

## Структура данных

### InventoryItem
```typescript
{
  id: string;              // Уникальный ID
  name: string;            // Название продукта
  quantity: number;        // Количество
  unit: string;            // Единица измерения (кг, г, л, мл, шт)
  category: string;        // Категория
  expiryDate?: string;     // Срок годности (опционально)
  addedDate: string;       // Дата добавления
  notes?: string;          // Примечания (опционально)
}
```

### Категории
- Молочные продукты
- Мясо и рыба
- Овощи
- Фрукты
- Напитки
- Замороженное
- Другое

### Единицы измерения
- кг (килограммы)
- г (граммы)
- л (литры)
- мл (миллилитры)
- шт (штуки)

## API

### Инвентарь

**GET /api/inventory**
- Получить весь инвентарь
- Ответ: `InventoryItem[]`

**POST /api/inventory**
- Добавить новый продукт
- Тело запроса: `Omit<InventoryItem, 'id' | 'addedDate'>`
- Ответ: `InventoryItem`

**PUT /api/inventory**
- Обновить существующий продукт
- Тело запроса: `InventoryItem`
- Ответ: `InventoryItem`

**DELETE /api/inventory?id={id}**
- Удалить продукт
- Параметр: `id` (string)
- Ответ: `{ success: true }`

### Синхронизация

**GET /api/sync**
- Получить конфигурацию синхронизации
- Ответ:
```json
{
  "configured": boolean,
  "spreadsheetId": string | null,
  "sheetName": string,
  "autoSync": boolean,
  "syncInterval": number
}
```

**POST /api/sync**
- Выполнить синхронизацию
- Тело запроса:
```json
{
  "action": "export" | "import" | "sync"
}
```
- Ответ:
```json
{
  "success": true,
  "message": string,
  "count": number,
  "items"?: InventoryItem[]
}
```

## Переменные окружения (.env.local)

```env
# Google Service Account credentials (JSON в одну строку)
GOOGLE_CREDENTIALS={"type":"service_account",...}

# ID Google таблицы
SPREADSHEET_ID=your_spreadsheet_id

# Название листа в таблице
SHEET_NAME=Inventory

# Включить автоматическую синхронизацию
AUTO_SYNC=true

# Интервал синхронизации в минутах
SYNC_INTERVAL=5
```

## Компоненты

### InventoryForm
Форма добавления/редактирования продукта

**Props:**
- `onSubmit: (item: Omit<InventoryItem, 'id' | 'addedDate'>) => void`
- `editItem?: InventoryItem | null`

### InventoryList
Список продуктов с таблицей

**Props:**
- `items: InventoryItem[]`
- `onDelete: (id: string) => void`
- `onEdit: (item: InventoryItem) => void`

**Особенности:**
- Красная подсветка для просроченных продуктов
- Желтая подсветка для продуктов, срок годности которых истечет в течение 3 дней
- Форматирование дат на русском языке

### SyncButtons
Кнопки синхронизации с Google Sheets

**Props:**
- `onSync: () => void` - callback после успешной синхронизации
- `loading: boolean` - индикатор загрузки

**Кнопки:**
- 📤 Экспорт - отправить данные в Google Sheets
- 📥 Импорт - загрузить данные из Google Sheets
- 🔄 Синхронизация - умное объединение данных

## Hooks

### useAutoSync
Автоматическая синхронизация с заданным интервалом

**Параметры:**
```typescript
{
  enabled: boolean;      // Включена ли синхронизация
  interval: number;      // Интервал в минутах
  onSync: () => void;    // Callback после синхронизации
}
```

## Сервисы

### GoogleSheetsService

**Методы:**

- `exportToSheet(spreadsheetId, sheetName, items)` - Экспорт в таблицу
- `importFromSheet(spreadsheetId, sheetName)` - Импорт из таблицы
- `syncWithSheet(spreadsheetId, sheetName, localItems)` - Синхронизация
- `createSpreadsheet(title)` - Создание новой таблицы

## Формат данных в Google Sheets

Таблица должна иметь следующие колонки (A-H):

| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| ID | Название | Количество | Единица | Категория | Срок годности | Дата добавления | Примечания |

Первая строка - заголовки, данные начинаются со второй строки.

## Troubleshooting

### Проблема: Устаревшие зависимости
```bash
npm update
```

### Проблема: Конфликты портов
Измените порт в `package.json`:
```json
"dev": "next dev -p 3001"
```

### Проблема: Ошибки TypeScript
```bash
npm run build
```

### Проблема: Проблемы с синхронизацией
1. Проверьте консоль браузера (F12)
2. Проверьте консоль сервера (терминал)
3. Проверьте `.env.local`
4. Убедитесь, что Service Account имеет доступ к таблице

## Полезные ссылки

- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Sheets](https://sheets.google.com/)
- [Next.js Docs](https://nextjs.org/docs)
- [TypeScript Docs](https://www.typescriptlang.org/docs/)
- [Google Sheets API](https://developers.google.com/sheets/api)
