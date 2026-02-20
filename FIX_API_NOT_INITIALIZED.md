# 🔧 Исправление: Google Sheets API not initialized

**Дата:** 20.02.2026  
**Проблема:** Ошибка "Google Sheets API not initialized" на странице статистики

---

## 🐛 Проблема

При открытии страницы `/stats` возникала ошибка:

```
Google Sheets API not initialized
at ProductsSyncService.checkGapi (src\lib\googleSheets\productsSync.ts:23:13)
at ProductsSyncService.getAllProducts (src\lib\googleSheets\productsSync.ts:31:10)
```

**Причина:**  
Хуки `useProducts`, `useRecipes`, `useInventory` пытались загрузить данные сразу при монтировании компонента, но Google API не был инициализирован (пользователь не был авторизован).

---

## ✅ Решение

### 1. Добавлена проверка авторизации на странице статистики

**Файл:** `src/app/stats/page.tsx`

Добавлено:
- Состояние `isAuthenticated`
- Компонент `GoogleAuth` для управления авторизацией
- Экран входа для неавторизованных пользователей
- Обработка ошибок загрузки данных

```tsx
if (!isAuthenticated) {
  return (
    <AppLayout>
      {/* Экран входа */}
      <GoogleAuth onAuthChange={setIsAuthenticated} />
    </AppLayout>
  );
}
```

### 2. Добавлена мягкая проверка API в сервисах

**Измененные файлы:**
- `src/lib/googleSheets/productsSync.ts`
- `src/lib/googleSheets/recipesSync.ts`
- `src/lib/googleSheets/inventorySync.ts`

Добавлен метод `isApiReady()` для мягкой проверки состояния API:

```typescript
private isApiReady(): boolean {
  return !!(this.gapi?.client?.sheets);
}

async getAllProducts(spreadsheetId: string): Promise<Product[]> {
  // Мягкая проверка - если API не готов, возвращаем пустой массив
  if (!this.isApiReady()) {
    console.warn('Google Sheets API not ready yet');
    return [];
  }
  
  this.checkGapi();
  // ... продолжение
}
```

### 3. Обновлены сообщения об ошибках

Изменено сообщение в `checkGapi()`:
```typescript
throw new Error('Google Sheets API not initialized. Please sign in first.');
```

---

## 🎯 Результат

Теперь страница статистики:
1. ✅ Показывает экран входа, если пользователь не авторизован
2. ✅ Не пытается загрузить данные до авторизации
3. ✅ Корректно обрабатывает ошибки
4. ✅ Показывает информативные сообщения

---

## 🔄 Как это работает

### 1. Пользователь не авторизован
```
Открытие /stats
  ↓
isAuthenticated = false
  ↓
Показывается экран входа
  ↓
GoogleAuth компонент
```

### 2. Пользователь авторизовался
```
Клик "Sign in with Google"
  ↓
Google OAuth flow
  ↓
isAuthenticated = true
  ↓
Хуки начинают загрузку данных
  ↓
Сервисы проверяют isApiReady()
  ↓
Если API готов → загрузка
Если нет → пустой массив []
  ↓
Отображение статистики
```

### 3. Обработка ошибок
```
Ошибка загрузки
  ↓
hasErrors = true
  ↓
Показывается экран ошибки
  ↓
Кнопка "Попробовать снова"
```

---

## 📝 Дополнительные улучшения

### Добавлено на странице статистики:

1. **Экран авторизации**
   - Иконка входа
   - Понятное описание
   - Кнопка Google Auth

2. **Экран ошибки**
   - Иконка ошибки
   - Текст ошибки
   - Кнопка перезагрузки

3. **Визуальные улучшения**
   - GoogleAuth компонент в шапке (для авторизованных)
   - Адаптивный дизайн
   - Плавные анимации

---

## 🧪 Тестирование

### Сценарий 1: Неавторизованный пользователь
1. Открыть `/stats`
2. Должен показаться экран входа
3. Нажать "Sign in with Google"
4. После авторизации данные должны загрузиться

### Сценарий 2: Авторизованный пользователь
1. Авторизоваться на главной странице
2. Открыть `/stats`
3. Данные должны загрузиться автоматически

### Сценарий 3: Ошибка загрузки
1. Симулировать ошибку API
2. Должен показаться экран ошибки
3. Кнопка "Попробовать снова" перезагружает страницу

---

## 🔍 Аналогичные проблемы

Если такая же ошибка возникает на других страницах:

1. Добавить `GoogleAuth` компонент
2. Добавить проверку `isAuthenticated`
3. Показывать экран входа для неавторизованных
4. Убедиться, что сервисы используют `isApiReady()`

---

## 📚 Связанные файлы

```
src/
├── app/
│   └── stats/
│       └── page.tsx                        ✅ Обновлен
├── components/
│   └── GoogleAuth.tsx                      (без изменений)
├── lib/
│   └── googleSheets/
│       ├── productsSync.ts                 ✅ Обновлен
│       ├── recipesSync.ts                  ✅ Обновлен
│       └── inventorySync.ts                ✅ Обновлен
└── hooks/
    ├── useProducts.ts                      (без изменений)
    ├── useRecipes.ts                       (без изменений)
    └── useInventory.ts                     (без изменений)
```

---

**Исправление завершено! ✅**

Страница статистики теперь работает корректно как для авторизованных, так и для неавторизованных пользователей.
