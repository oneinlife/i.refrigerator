# 🚨 Частые ошибки - Быстрые решения

## Ошибки синхронизации

### ❌ Cannot read properties of undefined (reading 'client')

**Что делать:** 
1. **F5** - перезагрузить страницу
2. Подождать 2-3 секунды
3. Попробовать снова

**Причина:** Google API не успел загрузиться

---

### ❌ 403: access_denied

**Что проверить:**
1. Google Cloud Console → Credentials → OAuth Client ID
2. **Authorized JavaScript origins** должен содержать:
   - `http://localhost:3000`
3. **Test users** - добавлен ваш email (если Testing mode)
4. Подождать 5 минут после изменений

**Подробно:** [TROUBLESHOOTING.md](TROUBLESHOOTING.md#проблема-ошибка-403-access_denied)

---

### ❌ Failed to open popup window

**Что делать:**
1. Посмотреть на адресную строку → иконка 🚫
2. Разрешить всплывающие окна
3. Попробовать снова "Войти через Google"

---

### ❌ Not authenticated

**Что делать:**
1. Вернуться на главную страницу
2. Нажать **"Войти через Google"**
3. Предоставить доступ к Google Sheets

---

### ❌ Google API not initialized

**Что делать:**
1. **Ctrl+Shift+Del** - очистить кеш
2. **F5** - перезагрузить страницу
3. Проверить интернет соединение
4. Отключить блокировщики рекламы для localhost

---

### ❌ Token client not initialized

**Что делать:**
1. Перезагрузить страницу (**F5**)
2. Проверить Client ID в настройках
3. Убедиться что Client ID правильный формат: `*.apps.googleusercontent.com`

---

## Ошибки настройки

### ❌ Client ID не настроен

**Что делать:**
1. ⚙️ Настройки → вставить Client ID
2. 💾 Сохранить настройки

**Где взять:** [GOOGLE_CLOUD_SETUP.md](GOOGLE_CLOUD_SETUP.md)

---

### ❌ Spreadsheet ID не настроен

**Что делать:**
1. Создать Google таблицу
2. Скопировать ID из URL: `https://docs.google.com/spreadsheets/d/[ВАШ_ID]/edit`
3. ⚙️ Настройки → вставить Spreadsheet ID
4. 💾 Сохранить настройки

---

## Проблемы с данными

### ❌ Данные пропали после очистки кэша

**Восстановление:**
1. Войти через Google
2. Нажать **📥 Импорт**
3. Данные восстановятся из Google Sheets

**Предотвращение:**
- Регулярно экспортировать в Google Sheets
- Включить автосинхронизацию (⚙️ Настройки)

---

### ❌ Данные не синхронизируются

**Что проверить:**
1. Авторизован ли через Google?
2. Spreadsheet ID заполнен в настройках?
3. Таблица существует и доступна?
4. Google Sheets API включен в Google Cloud Console?

---

## Проблемы с браузером

### 🌐 Блокировщики рекламы

**Решение:**
1. Отключить AdBlock/uBlock для `localhost:3000`
2. Перезагрузить страницу

**Проверка:**
- F12 → Console → ищите ошибки `net::ERR_BLOCKED_BY_CLIENT`

---

### 🌐 CORS / Network errors

**Решение:**
1. Проверить интернет соединение
2. Попробовать другую сеть (не корпоративную)
3. Временно отключить VPN
4. Проверить брандмауэр

---

## Быстрая диагностика

### 1️⃣ Откройте консоль браузера (F12)

**Вкладка Console:**
- Смотрите красные ошибки
- `Failed to load resource` = проблема с сетью
- `403` = проблема с настройками Google Cloud
- `undefined` = API не загрузился

**Вкладка Network:**
- Фильтр: `google`
- Проверьте загрузились ли:
  - `apis.google.com/js/api.js`
  - `accounts.google.com/gsi/client`

---

### 2️⃣ Проверьте localStorage (F12 → Application)

**Local Storage → http://localhost:3000:**
- `google_access_token` - есть токен?
- `google_client_id` - заполнен Client ID?
- `google_spreadsheet_id` - заполнен Spreadsheet ID?
- `refrigerator_inventory` - есть данные?

---

## 📚 Подробная документация

- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Полное руководство по решению проблем
- **[GOOGLE_CLOUD_SETUP.md](GOOGLE_CLOUD_SETUP.md)** - Настройка Google Cloud Console  
- **[QUICKSTART.md](QUICKSTART.md)** - Быстрый старт за 10 минут
- **[README.md](README.md)** - Основная документация

---

## 🆘 Если ничего не помогло

1. Очистить полностью кеш (Ctrl+Shift+Del)
2. Закрыть все вкладки браузера
3. Открыть заново
4. Попробовать другой браузер (Chrome/Edge/Firefox)
5. Проверить на другом компьютере/устройстве

**Если проблема остается** - создайте issue на GitHub с:
- Текстом ошибки
- Скриншотом консоли (F12)
- Шагами для воспроизведения
