# ⚡ Быстрый старт - i.refrigerator

## 3 простых шага до работающего приложения

### Шаг 1: Запустите приложение (30 секунд)

```bash
cd c:\projects\i.refrigerator
npm install
npm run dev
```

Откройте http://localhost:3000

✅ **Готово!** Приложение уже работает. Вы можете добавлять продукты - они сохраняются в браузере.

---

### Шаг 2: Настройте Google OAuth (5 минут)

Чтобы синхронизировать с Google Sheets:

1. **Откройте [Google Cloud Console](https://console.cloud.google.com/)**

2. **Создайте проект** (или выберите существующий)

3. **Включите Google Sheets API:**
   - APIs & Services → Library
   - Найдите "Google Sheets API"
   - Нажмите Enable

4. **Настройте OAuth Consent Screen** (если впервые):
   - APIs & Services → OAuth consent screen
   - User Type: **External**
   - App name: `i.refrigerator` (или любое название)
   - User support email: ваш email
   - Developer contact: ваш email
   - Нажмите **Save and Continue**
   - Scopes: пропустите (добавится автоматически)
   - **Test users:** нажмите **+ ADD USERS** и добавьте ваш email
   - Нажмите **Save and Continue**

5. **Создайте OAuth Client ID:**
   - APIs & Services → Credentials
   - Create Credentials → OAuth client ID
   - Тип: **Web application**
   - Name: `i.refrigerator Web Client`
   - **Authorized JavaScript origins:** (обязательно!)
     ```
     http://localhost:3000
     ```
     Для production добавьте ещё:
     ```
     https://ваш-домен.com
     ```
   - Authorized redirect URIs: оставьте пустым (генерируется автоматически)
   - Нажмите **Create**
   - **Скопируйте Client ID** (формат: `*.apps.googleusercontent.com`)

6. **В приложении:**
   - Нажмите ⚙️ Настройки
   - Вставьте Client ID
   - Сохраните

✅ **OAuth настроен!**

⚠️ **Важно:** Если получаете ошибку 403: access_denied, проверьте:
- Authorized JavaScript origins добавлен: `http://localhost:3000`
- Ваш email добавлен в Test users (если приложение в Testing mode)
- Подождите 5 минут после изменений в Google Cloud Console

---

### Шаг 3: Подключите Google таблицу (2 минуты)

1. **Создайте [Google таблицу](https://sheets.google.com/)**

2. **Скопируйте ID таблицы** из URL:
   ```
   https://docs.google.com/spreadsheets/d/[ВАШ_ID]/edit
   ```

3. **Переименуйте первый лист в "Inventory"**

4. **В приложении:**
   - Откройте ⚙️ Настройки
   - Вставьте Spreadsheet ID
   - Сохраните

5. **Авторизуйтесь:**
   - Вернитесь на главную страницу
   - Нажмите "Войти через Google"
   - Предоставьте доступ к Google Sheets

✅ **Готово!** Теперь можно синхронизировать данные.

---

## 🎉 Всё работает!

Теперь вы можете:

- ✅ Добавлять продукты → сохраняются автоматически
- 📤 Экспортировать в Google Sheets
- 📥 Импортировать из Google Sheets  
- 🔄 Синхронизировать данные
- ⏰ Включить автосинхронизацию (в настройках)

---

## 💡 Полезные советы

### Для тестирования

```bash
# Добавьте несколько продуктов через UI
# Затем нажмите "Экспорт"
# Откройте вашу Google таблицу - данные там!
```

### Автосинхронизация

1. ⚙️ Настройки
2. ✅ Включить автоматическую синхронизацию
3. Установите интервал (например, 5 минут)
4. Сохраните

Приложение будет автоматически синхронизироваться каждые 5 минут.

### Создание таблицы из приложения

Если у вас нет таблицы:
1. Войдите через Google
2. ⚙️ Настройки → "📄 Создать новую таблицу"
3. Spreadsheet ID подставится автоматически

---

## 🚨 Проблемы?

### "Client ID не настроен"
→ Вставьте Client ID в настройках

### "Not authenticated"  
→ Нажмите "Войти через Google"

### "Permission denied"
→ Убедитесь, что Google Sheets API включен

### Не синхронизируется
→ Проверьте Spreadsheet ID в настройках

---

## 📚 Дополнительно

- [README.md](README.md) - Полная документация
- [CLIENT_ARCHITECTURE.md](CLIENT_ARCHITECTURE.md) - Архитектура приложения
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - API справочник

---

## 🎯 Что дальше?

1. **Деплой на production:**
   ```bash
   vercel --prod
   ```
   
   Не забудьте добавить production URL в Authorized JavaScript origins!

2. **Поделитесь с друзьями** - они смогут использовать свои таблицы

3. **Кастомизируйте** - форкните и добавьте свои фичи!

---

Приятного использования! ❄️🎉
