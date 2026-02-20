# ❄️ i.refrigerator

Приложение для управления инвентарем холодильника с синхронизацией в Google Sheets. **Полностью клиентское приложение** - все данные хранятся в браузере (localStorage), никакого сервера не требуется!

## 🌟 Возможности

- ✅ Добавление, редактирование и удаление продуктов
- 📊 Категоризация продуктов
- 📅 Отслеживание срока годности с уведомлениями
- 📤 Экспорт данных в Google Sheets
- 📥 Импорт данных из Google Sheets
- 🔄 Автоматическая синхронизация
- 💾 Все данные хранятся в браузере (localStorage)
- 🔐 Безопасная авторизация через Google OAuth 2.0
- 🚀 Работает полностью на клиенте - сервер не нужен!
- 🎨 Современный UI с адаптивным дизайном
- ⚡ Построено на Next.js 15 и TypeScript

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Запуск приложения

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000) в браузере.

### 3. Настройка Google OAuth 2.0

#### Шаг 1: Создание проекта в Google Cloud Console

1. Перейдите на [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Перейдите в **APIs & Services** → **Enable APIs and Services**
4. Найдите и включите **Google Sheets API**

#### Шаг 2: Создание OAuth 2.0 Client ID

1. В меню перейдите в **APIs & Services** → **Credentials**
2. Нажмите **Create Credentials** → **OAuth client ID**
3. Если требуется, настройте OAuth consent screen:
   - Выберите **External**
   - Заполните название приложения: "i.refrigerator"
   - Добавьте свой email
   - Нажмите **Save and Continue**
4. Вернитесь к созданию OAuth client ID
5. Выберите тип: **Web application**
6. Добавьте **Authorized JavaScript origins**:
   ```
   http://localhost:3000
   ```
7. Нажмите **Create**
8. **Скопируйте Client ID** (будет выглядеть как `123456789-abc...apps.googleusercontent.com`)

> ⚠️ **Важно:** Если получаете ошибку **403: access_denied**, проверьте:
> - Добавлен ли `http://localhost:3000` в Authorized JavaScript origins
> - Добавлен ли ваш email в Test users (OAuth consent screen)
> - Подробнее: [GOOGLE_CLOUD_SETUP.md](GOOGLE_CLOUD_SETUP.md) и [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

#### Шаг 3: Создание Google таблицы

1. Создайте новую [Google таблицу](https://sheets.google.com/)
2. Скопируйте ID таблицы из URL:
   ```
   https://docs.google.com/spreadsheets/d/[ВАШ_ID]/edit
   ```
3. Переименуйте первый лист в **"Inventory"**

#### Шаг 4: Настройка приложения

1. Откройте [http://localhost:3000](http://localhost:3000)
2. Нажмите **"⚙️ Настройки"** в правом верхнем углу
3. Вставьте **Client ID** в соответствующее поле
4. Вставьте **Spreadsheet ID** в соответствующее поле
5. Нажмите **"💾 Сохранить настройки"**
6. Вернитесь на главную страницу
7. Нажмите **"Войти через Google"**
8. Предоставьте доступ к Google Sheets

Готово! Теперь вы можете синхронизировать данные с Google Sheets.

## 📖 Использование

### Добавление продукта

1. Заполните форму добавления продукта
2. Выберите категорию и единицу измерения
3. Укажите срок годности (опционально)
4. Нажмите **Добавить**

Данные автоматически сохраняются в localStorage вашего браузера.

### Синхронизация с Google Sheets

#### Экспорт (📤)
Отправляет все данные из приложения в Google таблицу (перезаписывает содержимое таблицы).

#### Импорт (📥)
Загружает данные из Google таблицы в приложение (перезаписывает локальные данные).

#### Синхронизация (🔄)
Умное объединение данных:
- Локальные данные имеют приоритет
- Добавляются новые элементы из таблицы
- Обновляется и таблица, и локальные данные

### Автоматическая синхронизация

1. Перейдите в **⚙️ Настройки**
2. Включите **"Автоматическая синхронизация"**
3. Установите интервал (в минутах)
4. Нажмите **"💾 Сохранить настройки"**

Приложение будет автоматически синхронизироваться с Google Sheets каждые N минут.

## 🏗️ Архитектура

### Клиентское приложение (без сервера!)

Все работает в браузере:
- **localStorage** - хранение данных инвентаря
- **Google OAuth 2.0** - безопасная авторизация
- **Google Sheets API** - прямое обращение к таблицам
- **React hooks** - управление состоянием

### Структура проекта

```
i.refrigerator/
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Главная страница
│   │   ├── settings/page.tsx         # Страница настроек
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── InventoryForm.tsx         # Форма добавления/редактирования
│   │   ├── InventoryList.tsx         # Список продуктов
│   │   ├── SyncButtons.tsx           # Кнопки синхронизации
│   │   └── GoogleAuth.tsx            # Авторизация Google
│   ├── hooks/
│   │   └── useAutoSync.ts            # Хук автосинхронизации
│   ├── lib/
│   │   ├── clientGoogleSheets.ts     # Клиентский Google Sheets API
│   │   └── storageService.ts         # Сервис localStorage
│   └── types/
│       └── inventory.ts              # TypeScript типы
├── package.json
└── tsconfig.json
```

## 🔧 Технологии

- **Next.js 15** - React фреймворк
- **TypeScript** - Типобезопасность
- **Google Sheets API** - Синхронизация данных
- **Google OAuth 2.0** - Безопасная авторизация
- **localStorage** - Клиентское хранилище
- **date-fns** - Работа с датами

## 💾 Хранение данных

### localStorage

Все данные хранятся в localStorage браузера:

- `refrigerator_inventory` - список продуктов
- `google_access_token` - токен доступа Google
- `google_client_id` - Client ID для OAuth
- `google_spreadsheet_id` - ID Google таблицы
- `google_sheet_name` - название листа
- `auto_sync_enabled` - включена ли автосинхронизация
- `sync_interval_minutes` - интервал синхронизации

### Безопасность

- ✅ Используется OAuth 2.0 (безопасный метод авторизации)
- ✅ Токены хранятся только в браузере пользователя
- ✅ Нет серверной части - нет утечек данных
- ✅ Доступ только к вашим таблицам

⚠️ **Важно**: Данные хранятся в браузере. При очистке кэша браузера данные будут удалены. Используйте синхронизацию с Google Sheets для резервного копирования!

## 🐛 Устранение неполадок

### ⚠️ Браузер блокирует всплывающее окно OAuth
**Симптом:** Ошибка `Failed to open popup window... Maybe blocked by the browser?`

**Быстрое решение:**
1. Посмотрите на адресную строку - появится иконка 🚫
2. Нажмите на нее и выберите "Всегда разрешать всплывающие окна"
3. Попробуйте снова "Войти через Google"

### Ошибка: "Client ID не настроен"
1. Перейдите в **⚙️ Настройки**
2. Вставьте Client ID из Google Cloud Console
3. Сохраните настройки

### Ошибка: "Not authenticated"
1. Нажмите **"Войти через Google"** на главной странице
2. Предоставьте доступ к Google Sheets

### Ошибка: "Permission denied" или 403
**Причины:**
1. Не добавлен `http://localhost:3000` в Authorized JavaScript origins
2. Ваш email не добавлен в Test users (если приложение в Testing mode)
3. Google Sheets API не включен
4. Таблица не существует или недоступна

**Решение:**
- См. подробное руководство: [GOOGLE_CLOUD_SETUP.md](GOOGLE_CLOUD_SETUP.md)
- Проверьте чек-лист настроек в [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- Убедитесь, что вы вошли под правильным Google аккаунтом

### Ошибка синхронизации: "Cannot read properties of undefined (reading 'client')"
**Причина:** Google API не успел загрузиться

**Быстрое решение:**
1. Перезагрузите страницу (F5)
2. Подождите 2-3 секунды
3. Попробуйте снова

**Если не помогает:**
- Очистите кеш браузера (Ctrl+Shift+Del)
- Проверьте интернет соединение
- Отключите блокировщики рекламы для localhost:3000
- См. [TROUBLESHOOTING.md](TROUBLESHOOTING.md) для подробностей

### Данные не синхронизируются
1. Проверьте Spreadsheet ID в настройках
2. Убедитесь, что вы авторизованы
3. Откройте консоль браузера (F12) и проверьте ошибки

### Данные пропали после очистки кэша
Данные хранятся в localStorage и удаляются при очистке. Используйте синхронизацию:
1. Авторизуйтесь
2. Нажмите **📥 Импорт**, чтобы восстановить данные из Google Sheets

📚 **Полное руководство по устранению проблем:** См. [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

## 📱 Production Deployment

При деплое на production:

1. Обновите **Authorized JavaScript origins** в Google Cloud Console:
   ```
   https://yourdomain.com
   ```

2. Пользователи должны будут настроить свой собственный Client ID или вы можете:
   - Встроить Client ID в приложение (для публичного использования)
   - Создать общий Client ID для всех пользователей

## 🔒 Приватность

- Все данные хранятся локально в браузере пользователя
- Синхронизация происходит напрямую между браузером и Google Sheets
- Нет промежуточных серверов
- Никто не имеет доступ к вашим данным, кроме вас

## � Документация

- **[QUICKSTART.md](QUICKSTART.md)** - Быстрый старт за 3 шага (10 минут)- **[COMMON_ERRORS.md](COMMON_ERRORS.md)** - ⚡ Частые ошибки и быстрые решения- **[GOOGLE_CLOUD_SETUP.md](GOOGLE_CLOUD_SETUP.md)** - Подробная настройка Google Cloud Console
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Решение проблем (403, popup, авторизация)
- **[CLIENT_ARCHITECTURE.md](CLIENT_ARCHITECTURE.md)** - Техническая архитектура проекта
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - API референс

## �📄 Лицензия

MIT

## 🙏 Благодарности

Спасибо Google за предоставление Sheets API и OAuth 2.0!

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка Google Sheets API

#### Шаг 1: Создание проекта в Google Cloud Console

1. Перейдите на [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Перейдите в **APIs & Services** → **Enable APIs and Services**
4. Найдите и включите **Google Sheets API**

#### Шаг 2: Создание Service Account

1. В меню перейдите в **IAM & Admin** → **Service Accounts**
2. Нажмите **Create Service Account**
3. Введите название (например, "i-refrigerator-sync")
4. Нажмите **Create and Continue**
5. Выберите роль **Editor** (или **Owner**)
6. Нажмите **Done**

#### Шаг 3: Создание ключа

1. Нажмите на созданный Service Account
2. Перейдите на вкладку **Keys**
3. Нажмите **Add Key** → **Create new key**
4. Выберите формат **JSON**
5. Скачайте файл с ключом

#### Шаг 4: Создание Google таблицы

1. Создайте новую [Google таблицу](https://sheets.google.com/)
2. Скопируйте ID таблицы из URL:
   ```
   https://docs.google.com/spreadsheets/d/[ВАШ_ID]/edit
   ```
3. Нажмите **Share** (Поделиться)
4. Добавьте email вашего Service Account (из JSON файла, поле `client_email`)
5. Дайте права **Editor**

#### Шаг 5: Настройка переменных окружения

1. Скопируйте файл `.env.local.example` в `.env.local`:
   ```bash
   copy .env.local.example .env.local
   ```

2. Откройте скачанный JSON файл с ключами
3. Скопируйте **всё содержимое** JSON файла в одну строку
4. Вставьте в `.env.local`:

```env
GOOGLE_CREDENTIALS={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}

SPREADSHEET_ID=your_spreadsheet_id_here
SHEET_NAME=Inventory
AUTO_SYNC=true
SYNC_INTERVAL=5
```

**Важно:** JSON должен быть в одну строку, без переносов!

### 3. Запуск приложения

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000) в браузере.

## 📖 Использование

### Добавление продукта

1. Заполните форму добавления продукта
2. Выберите категорию и единицу измерения
3. Укажите срок годности (опционально)
4. Нажмите **Добавить**

### Синхронизация с Google Sheets

#### Экспорт (📤)
Отправляет все данные из приложения в Google таблицу (перезаписывает содержимое таблицы).

#### Импорт (📥)
Загружает данные из Google таблицы в приложение (перезаписывает локальные данные).

#### Синхронизация (🔄)
Умное объединение данных:
- Локальные данные имеют приоритет
- Добавляются новые элементы из таблицы
- Обновляется и таблица, и локальные данные

### Автоматическая синхронизация

Если в `.env.local` установлено `AUTO_SYNC=true`, приложение будет автоматически синхронизироваться с Google Sheets каждые N минут (по умолчанию 5).

## 🏗️ Структура проекта

```
i.refrigerator/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── inventory/route.ts    # API для работы с инвентарем
│   │   │   └── sync/route.ts         # API для синхронизации
│   │   ├── layout.tsx                # Корневой layout
│   │   └── page.tsx                  # Главная страница
│   ├── components/
│   │   ├── InventoryForm.tsx         # Форма добавления/редактирования
│   │   ├── InventoryList.tsx         # Список продуктов
│   │   └── SyncButtons.tsx           # Кнопки синхронизации
│   ├── hooks/
│   │   └── useAutoSync.ts            # Хук автосинхронизации
│   ├── lib/
│   │   └── googleSheets.ts           # Сервис Google Sheets
│   └── types/
│       └── inventory.ts              # TypeScript типы
├── .env.local.example                # Пример конфигурации
├── next.config.js
├── package.json
└── tsconfig.json
```

## 🔧 Технологии

- **Next.js 15** - React фреймворк
- **TypeScript** - Типизация
- **Google Sheets API** - Синхронизация данных
- **date-fns** - Работа с датами

## 📝 API Endpoints

### GET /api/inventory
Получить весь инвентарь

### POST /api/inventory
Добавить новый продукт

### PUT /api/inventory
Обновить существующий продукт

### DELETE /api/inventory?id={id}
Удалить продукт

### POST /api/sync
Синхронизация с Google Sheets
```json
{
  "action": "export" | "import" | "sync"
}
```

### GET /api/sync
Получить конфигурацию синхронизации

## 🐛 Устранение неполадок

### Ошибка: "Google Sheets service not configured"
- Проверьте, что файл `.env.local` существует
- Убедитесь, что `GOOGLE_CREDENTIALS` содержит корректный JSON в одну строку
- Перезапустите сервер разработки

### Ошибка: "Permission denied"
- Убедитесь, что вы дали доступ Service Account к вашей таблице
- Проверьте email в поле `client_email` в JSON файле

### Синхронизация не работает
- Проверьте `SPREADSHEET_ID` - это должен быть ID из URL таблицы
- Убедитесь, что лист называется так же, как указано в `SHEET_NAME`
- Проверьте консоль браузера на наличие ошибок

## 📄 Лицензия

MIT

## 🤝 Вклад

Буду рад любым предложениям и улучшениям!
