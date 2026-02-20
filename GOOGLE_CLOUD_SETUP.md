# 🔧 Настройка Google Cloud Console

## Быстрая инструкция для i.refrigerator

### ✅ Чек-лист для успешной настройки

- [ ] Google Sheets API включен
- [ ] OAuth Consent Screen настроен
- [ ] Test users добавлен ваш email
- [ ] OAuth Client ID создан (Web application)
- [ ] Authorized JavaScript origins: `http://localhost:3000`
- [ ] Client ID скопирован в приложение

---

## 1️⃣ Включите Google Sheets API

1. Откройте [Google Cloud Console](https://console.cloud.google.com/)
2. Выберите или создайте проект
3. Перейдите в **APIs & Services → Library**
4. Найдите **"Google Sheets API"**
5. Нажмите **Enable**

---

## 2️⃣ Настройте OAuth Consent Screen

1. **APIs & Services → OAuth consent screen**
2. **User Type:** External
3. **App information:**
   - App name: `i.refrigerator`
   - User support email: ваш email
   - App logo: можно пропустить
4. **Developer contact information:**
   - Email: ваш email
5. Нажмите **Save and Continue**

### Scopes (разрешения)

6. На странице "Scopes" нажмите **Save and Continue** (пропустите)
   - Scope добавится автоматически при первой авторизации

### Test users

7. **Важно!** Нажмите **+ ADD USERS**
8. Добавьте email, с которым будете входить в приложение
9. Нажмите **Add**
10. Нажмите **Save and Continue**

> ⚠️ **Без добавления в Test users** вы получите ошибку 403: access_denied!

---

## 3️⃣ Создайте OAuth Client ID

1. **APIs & Services → Credentials**
2. Нажмите **+ CREATE CREDENTIALS → OAuth client ID**
3. **Application type:** Web application
4. **Name:** `i.refrigerator Web Client`

### Authorized JavaScript origins

5. В секции **"Authorized JavaScript origins"** нажмите **+ ADD URI**
6. Добавьте:
   ```
   http://localhost:3000
   ```

7. Для production также добавьте:
   ```
   https://ваш-домен.com
   ```

> ⚠️ **Это обязательный шаг!** Без этого получите ошибку 403: access_denied

### Redirect URIs

8. **Authorized redirect URIs:** оставьте пустым
   - Генерируется автоматически Google Identity Services

9. Нажмите **Create**

---

## 4️⃣ Скопируйте Client ID

1. Скопируйте **Client ID** из всплывающего окна
2. Формат: `123456789-abc.apps.googleusercontent.com`
3. Вставьте в приложение: ⚙️ Настройки → Client ID

---

## 🐛 Решение проблем

### Ошибка: 403: access_denied

**Причины:**

1. **Не добавлен Authorized JavaScript origin**
   - Проверьте: APIs & Services → Credentials → OAuth Client ID
   - Должен быть: `http://localhost:3000`

2. **Не добавлен в Test users**
   - Проверьте: APIs & Services → OAuth consent screen → Test users
   - Добавьте ваш email

3. **Изменения еще не применились**
   - Подождите 5-10 минут после сохранения настроек
   - Очистите кеш браузера (Ctrl+Shift+Del)

### Ошибка: popup_closed_by_user

- Разрешите всплывающие окна в браузере
- См. [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

## 📚 Дополнительные ресурсы

- [QUICKSTART.md](QUICKSTART.md) - быстрый старт проекта
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - полный список проблем
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)

---

## 🎓 Понимание настроек

### Publishing Status: Testing

По умолчанию ваше приложение в режиме **Testing**:
- Работает только для Test users (до 100 пользователей)
- Не требует верификации Google
- Идеально для личного использования

### Publishing Status: In Production

Для публичного приложения:
- Нужно нажать **Publish App**
- Может потребоваться верификация Google
- Нет ограничений по пользователям

> 💡 Для i.refrigerator (личное использование) достаточно **Testing** режима!

---

## ⏱️ Таймлайн настройки

- Создание проекта: 1 минута
- Включение Google Sheets API: 30 секунд
- OAuth Consent Screen: 2 минуты
- OAuth Client ID: 1 минута
- **Итого: ~5 минут**

---

## 🔄 Что делать после настройки?

1. Скопируйте Client ID
2. В приложении: ⚙️ Настройки → вставьте Client ID
3. Создайте Google таблицу (см. [QUICKSTART.md](QUICKSTART.md#шаг-3-подключите-google-таблицу-2-минуты))
4. Скопируйте Spreadsheet ID
5. В приложении: ⚙️ Настройки → вставьте Spreadsheet ID
6. Нажмите "Войти через Google"
7. Готово! 🎉
