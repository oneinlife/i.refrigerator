# 🔧 Пошаговая инструкция по настройке Google Sheets API

## Введение

Это подробное руководство поможет вам настроить интеграцию с Google Sheets для приложения i.refrigerator.

## Часть 1: Настройка Google Cloud Console

### 1.1 Создание проекта

1. Откройте [Google Cloud Console](https://console.cloud.google.com/)
2. Войдите в свой Google аккаунт
3. В верхней панели нажмите на выпадающий список проектов
4. Нажмите **"New Project"** (Новый проект)
5. Введите название проекта (например, "i-refrigerator")
6. Нажмите **"Create"** (Создать)

### 1.2 Включение Google Sheets API

1. В меню слева выберите **"APIs & Services"** → **"Library"**
2. В поиске введите "Google Sheets API"
3. Нажмите на **"Google Sheets API"**
4. Нажмите **"Enable"** (Включить)

### 1.3 Создание Service Account

1. В меню слева выберите **"IAM & Admin"** → **"Service Accounts"**
2. Нажмите **"+ Create Service Account"** (Создать учетную запись службы)
3. Заполните форму:
   - **Service account name**: i-refrigerator-sync
   - **Service account ID**: (заполнится автоматически)
   - **Description**: Sync service for i.refrigerator app
4. Нажмите **"Create and Continue"** (Создать и продолжить)
5. На шаге "Grant this service account access to project":
   - Выберите роль **"Editor"**
   - Нажмите **"Continue"** (Продолжить)
6. На шаге "Grant users access" можно пропустить
7. Нажмите **"Done"** (Готово)

### 1.4 Создание и скачивание ключа

1. В списке Service Accounts найдите созданную учетную запись
2. Нажмите на email учетной записи
3. Перейдите на вкладку **"Keys"** (Ключи)
4. Нажмите **"Add Key"** → **"Create new key"**
5. Выберите тип ключа: **JSON**
6. Нажмите **"Create"** (Создать)
7. Файл с ключом автоматически скачается на ваш компьютер
   - Название будет примерно таким: `project-name-xxxxx.json`

⚠️ **Важно**: Храните этот файл в безопасности! Он содержит секретные ключи доступа.

## Часть 2: Настройка Google Sheets

### 2.1 Создание таблицы

1. Откройте [Google Sheets](https://sheets.google.com/)
2. Нажмите **"Blank"** (Пустой лист) или создайте новую таблицу
3. Дайте таблице название (например, "i.refrigerator Inventory")

### 2.2 Получение ID таблицы

1. Посмотрите на URL в браузере. Он будет выглядеть так:
   ```
   https://docs.google.com/spreadsheets/d/1aB2cD3eF4gH5iJ6kL7mN8oP9qR0sT1uV2wX3yZ4/edit#gid=0
   ```
2. ID таблицы - это часть между `/d/` и `/edit`:
   ```
   1aB2cD3eF4gH5iJ6kL7mN8oP9qR0sT1uV2wX3yZ4
   ```
3. Скопируйте этот ID - он понадобится позже

### 2.3 Предоставление доступа Service Account

1. В Google таблице нажмите кнопку **"Share"** (Поделиться) в правом верхнем углу
2. Откройте скачанный JSON файл и найдите поле `client_email`
   - Это будет email вида: `i-refrigerator-sync@project-name.iam.gserviceaccount.com`
3. Скопируйте этот email
4. Вставьте email в поле "Add people and groups" (Добавить людей и группы)
5. Убедитесь, что выбрана роль **"Editor"** (Редактор)
6. **Снимите галочку** "Notify people" (Уведомить людей)
7. Нажмите **"Share"** (Поделиться)

### 2.4 Настройка листа

1. Переименуйте первый лист в **"Inventory"**
   - Дважды кликните на название листа внизу страницы
   - Введите "Inventory"
   - Нажмите Enter

## Часть 3: Настройка приложения

### 3.1 Подготовка JSON ключа

1. Откройте скачанный JSON файл в текстовом редакторе (Notepad, VS Code и т.д.)
2. Содержимое будет выглядеть примерно так:
   ```json
   {
     "type": "service_account",
     "project_id": "your-project-123456",
     "private_key_id": "abcd1234...",
     "private_key": "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n",
     "client_email": "i-refrigerator-sync@your-project.iam.gserviceaccount.com",
     "client_id": "123456789",
     "auth_uri": "https://accounts.google.com/o/oauth2/auth",
     "token_uri": "https://oauth2.googleapis.com/token",
     "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
     "client_x509_cert_url": "https://..."
   }
   ```
3. **Скопируйте ВСЁ содержимое** файла В ОДНУ СТРОКУ
   - Убедитесь, что нет переносов строк
   - Должна получиться одна длинная строка JSON

### 3.2 Создание файла .env.local

1. В корне проекта `i.refrigerator` скопируйте файл `.env.local.example`:
   ```bash
   copy .env.local.example .env.local
   ```

2. Откройте файл `.env.local` в текстовом редакторе

3. Вставьте данные:

```env
GOOGLE_CREDENTIALS={"type":"service_account","project_id":"your-project-123456",...}

SPREADSHEET_ID=1aB2cD3eF4gH5iJ6kL7mN8oP9qR0sT1uV2wX3yZ4

SHEET_NAME=Inventory

AUTO_SYNC=true

SYNC_INTERVAL=5
```

Где:
- `GOOGLE_CREDENTIALS` - JSON ключ в одну строку (из шага 3.1)
- `SPREADSHEET_ID` - ID таблицы (из шага 2.2)
- `SHEET_NAME` - название листа (по умолчанию "Inventory")
- `AUTO_SYNC` - включить автоматическую синхронизацию (true/false)
- `SYNC_INTERVAL` - интервал синхронизации в минутах

### 3.3 Сохранение и проверка

1. Сохраните файл `.env.local`
2. **Перезапустите сервер разработки**:
   ```bash
   # Нажмите Ctrl+C в терминале чтобы остановить
   # Затем запустите снова:
   npm run dev
   ```

## Часть 4: Проверка работы

### 4.1 Проверка подключения

1. Откройте [http://localhost:3000](http://localhost:3000)
2. Если настройка выполнена правильно, вы увидите блок **"Синхронизация с Google Sheets"**
3. Если вы видите предупреждение "Google Sheets не настроен" - проверьте настройки

### 4.2 Тестирование синхронизации

1. Добавьте несколько продуктов в приложении
2. Нажмите кнопку **"📤 Экспорт"**
3. Откройте вашу Google таблицу
4. Вы должны увидеть данные в таблице!

### 4.3 Проверка импорта

1. В Google таблице добавьте новую строку с данными:
   ```
   ID | Название | Количество | Единица | Категория | Срок годности | Дата добавления | Примечания
   test-123 | Яблоки | 5 | кг | Фрукты | 2026-03-15 | 2026-02-20 | Свежие
   ```
2. В приложении нажмите **"📥 Импорт"**
3. Новый продукт должен появиться в списке!

## Часть 5: Устранение проблем

### Проблема: "Google Sheets service not configured"

**Решение:**
1. Проверьте, что файл `.env.local` существует в корне проекта
2. Убедитесь, что `GOOGLE_CREDENTIALS` заполнен корректным JSON
3. Перезапустите сервер (`npm run dev`)

### Проблема: "Permission denied" или 403 ошибка

**Решение:**
1. Убедитесь, что вы предоставили доступ Service Account к таблице (Часть 2.3)
2. Проверьте, что email из `client_email` есть в списке пользователей таблицы
3. Убедитесь, что роль - "Editor"

### Проблема: "Spreadsheet not found" или 404 ошибка

**Решение:**
1. Проверьте правильность `SPREADSHEET_ID` в `.env.local`
2. ID должен быть из URL таблицы (между `/d/` и `/edit`)
3. Убедитесь, что таблица не удалена

### Проблема: Данные не синхронизируются

**Решение:**
1. Проверьте название листа - оно должно совпадать с `SHEET_NAME`
2. Откройте консоль браузера (F12) и проверьте наличие ошибок
3. Проверьте консоль сервера (терминал) на наличие ошибок

## Часть 6: Продвинутые настройки

### Изменение интервала автосинхронизации

В `.env.local` измените значение:
```env
SYNC_INTERVAL=10  # Синхронизация каждые 10 минут
```

### Отключение автосинхронизации

В `.env.local`:
```env
AUTO_SYNC=false
```

### Использование нескольких листов

Создайте несколько листов в таблице и переключайтесь между ними, изменяя `SHEET_NAME`:
```env
SHEET_NAME=Холодильник_1
```

## Готово! 🎉

Теперь ваше приложение i.refrigerator полностью интегрировано с Google Sheets!

Если у вас возникли проблемы, проверьте:
1. ✅ Google Sheets API включен в Cloud Console
2. ✅ Service Account создан
3. ✅ JSON ключ скачан
4. ✅ Service Account имеет доступ к таблице
5. ✅ `.env.local` настроен правильно
6. ✅ Сервер перезапущен после изменения `.env.local`
