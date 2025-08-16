# 🚀 Исправление Telegram WebApp на продакшене

## 🎯 Проблема
- 404 ошибка при доступе к `/telegram/request.html`
- Неправильная конфигурация статических файлов

## ✅ Что нужно сделать на сервере

### 1. Обновить файлы на сервере

Загрузите эти обновленные файлы:

**a) `backend/server.js`** - исправлен порядок middleware
**b) `production-config.env`** - добавлен WEB_APP_URL и токен

### 2. Убедиться что папка telegram-webapp существует

Проверьте что на сервере есть структура:
```
/path/to/your/app/
├── backend/
│   └── server.js
├── telegram-webapp/
│   └── request.html
└── production-config.env
```

### 3. Перезапустить сервер

```bash
# Остановить текущий процесс
pm2 stop rostechnopoisk

# Применить новую конфигурацию
pm2 start ecosystem.config.js --env production

# Или если используете systemd
sudo systemctl restart rostechnopoisk
```

### 4. Проверить что работает

**Тестовые URL:**
- ✅ https://xn--e1aggkdcahelgf4b.xn--p1ai/api/health
- ✅ https://xn--e1aggkdcahelgf4b.xn--p1ai/telegram/request.html
- ✅ https://xn--e1aggkdcahelgf4b.xn--p1ai/ (основной сайт)

## 🔧 Что было исправлено

### В `backend/server.js`:
1. **Порядок middleware** - Telegram статика теперь обрабатывается ПЕРЕД фронтендом
2. **Исключения для роутинга** - запросы к `/api/` и `/telegram/` не перехватываются фронтендом

### В `production-config.env`:
1. **Добавлен токен бота** - `TELEGRAM_BOT_TOKEN=8132176571:AAE_NDB99yL-ekj-7wrTN7gEaZ1LD9ewyGk`
2. **Добавлен WEB_APP_URL** - `WEB_APP_URL=https://xn--e1aggkdcahelgf4b.xn--p1ai`

## 🐛 Диагностика

### Если все еще не работает:

**1. Проверьте логи сервера:**
```bash
pm2 logs rostechnopoisk
# или
tail -f /var/log/rostechnopoisk/app.log
```

**2. Проверьте права доступа к файлам:**
```bash
ls -la telegram-webapp/
# Должно показать request.html с правами чтения
```

**3. Проверьте что сервер видит файлы:**
```bash
curl -I https://xn--e1aggkdcahelgf4b.xn--p1ai/telegram/request.html
# Должно вернуть 200 OK, а не 404
```

**4. Проверьте переменные окружения:**
```bash
# В логах при старте должно быть:
# 🤖 Telegram бот запущен
# 🤖 Telegram WebApp: https://xn--e1aggkdcahelgf4b.xn--p1ai/telegram/
```

## 📱 Тестирование Telegram бота

После исправления:

1. **Найдите бота в Telegram** (по токену 8132176571)
2. **Отправьте /start**
3. **Создайте заявку на сайте** как менеджер
4. **Проверьте уведомление** в Telegram с кнопкой "Подать заявку"
5. **Нажмите кнопку** - должно открыться веб-приложение

## 🚨 Важно

После обновления файлов **обязательно перезапустите сервер**, иначе изменения не применятся!

## 📞 Поддержка

Если проблемы остаются, проверьте:
- Все файлы загружены правильно
- Сервер перезапущен
- Логи не содержат ошибок
- Права доступа к файлам корректны
