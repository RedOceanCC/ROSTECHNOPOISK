# 🚀 Полная инструкция по развертыванию Telegram бота на сервере

## 📋 Что нужно загрузить на сервер

### 1. Обновленные файлы
```
backend/server.js          # ✅ Исправлена диагностика
production-config.env      # ✅ Добавлен токен и WEB_APP_URL
telegram-webapp/
└── request.html           # ✅ Веб-приложение для Telegram
```

## 🔧 Пошаговое развертывание

### Шаг 1: Загрузка файлов на сервер

**Через SCP/SFTP:**
```bash
# Загрузите файлы на сервер в правильную структуру
scp backend/server.js user@server:/path/to/your/app/backend/
scp production-config.env user@server:/path/to/your/app/
scp -r telegram-webapp/ user@server:/path/to/your/app/
```

**Через файловый менеджер:** Убедитесь что структура такая:
```
/path/to/your/app/
├── backend/
│   ├── server.js          # ← Обновленный файл
│   └── package.json
├── telegram-webapp/       # ← Новая папка
│   └── request.html       # ← HTML файл
└── production-config.env  # ← Обновленный файл
```

### Шаг 2: Установка зависимостей

```bash
# Подключитесь к серверу
ssh user@your-server

# Перейдите в папку backend
cd /path/to/your/app/backend

# Установите зависимость для Telegram бота
npm install node-telegram-bot-api

# Проверьте что установилось
npm list node-telegram-bot-api
```

### Шаг 3: Обновление конфигурации

```bash
# Скопируйте продакшн конфигурацию
cp ../production-config.env .env

# Или если используете другое имя файла
cp ../production-config.env config.env
```

### Шаг 4: Перезапуск сервера

**Если используете PM2:**
```bash
# Остановить текущий процесс
pm2 stop rostechnopoisk

# Перезагрузить конфигурацию
pm2 reload ecosystem.config.js --env production

# Или просто рестарт
pm2 restart rostechnopoisk

# Проверить статус
pm2 status
pm2 logs rostechnopoisk
```

**Если используете systemd:**
```bash
sudo systemctl restart rostechnopoisk
sudo systemctl status rostechnopoisk
sudo journalctl -u rostechnopoisk -f
```

**Если запускаете вручную:**
```bash
cd backend
NODE_ENV=production node server.js
```

### Шаг 5: Проверка работы

1. **Проверьте основной API:**
   https://xn--e1aggkdcahelgf4b.xn--p1ai/api/health

2. **Проверьте диагностику (исправленную):**
   https://xn--e1aggkdcahelgf4b.xn--p1ai/api/telegram/debug

3. **Проверьте Telegram файл:**
   https://xn--e1aggkdcahelgf4b.xn--p1ai/telegram/request.html

## 🔍 Проверка логов

После перезапуска в логах должно быть:
```
🤖 Telegram WebApp путь: /path/to/telegram-webapp
🤖 Файл существует: true
✅ Telegram WebApp найден в: /correct/path
🤖 Telegram бот запущен
🤖 Telegram WebApp: https://xn--e1aggkdcahelgf4b.xn--p1ai/telegram/
```

## ⚠️ Возможные проблемы

### Проблема 1: "Cannot find module 'node-telegram-bot-api'"
```bash
cd backend
npm install node-telegram-bot-api
```

### Проблема 2: Права доступа к файлам
```bash
chmod -R 755 telegram-webapp/
chown -R www-data:www-data telegram-webapp/  # замените на вашего пользователя
```

### Проблема 3: Конфигурация не загружается
Убедитесь что файл `.env` или `config.env` в правильном месте и содержит:
```env
TELEGRAM_BOT_TOKEN=8132176571:AAE_NDB99yL-ekj-7wrTN7gEaZ1LD9ewyGk
WEB_APP_URL=https://xn--e1aggkdcahelgf4b.xn--p1ai
```

### Проблема 4: Папка telegram-webapp не найдена
Проверьте что папка существует относительно backend:
```bash
ls -la ../telegram-webapp/
ls -la telegram-webapp/request.html
```

## 🎯 Автоматический скрипт развертывания

Создайте файл `deploy-telegram.sh`:
```bash
#!/bin/bash
echo "🚀 Развертывание Telegram бота..."

# Остановить сервер
pm2 stop rostechnopoisk

# Установить зависимости
cd backend
npm install node-telegram-bot-api

# Обновить конфигурацию
cp ../production-config.env .env

# Запустить сервер
pm2 start rostechnopoisk

echo "✅ Развертывание завершено!"
echo "🔗 Проверьте: https://xn--e1aggkdcahelgf4b.xn--p1ai/api/telegram/debug"
```

Сделайте исполняемым и запустите:
```bash
chmod +x deploy-telegram.sh
./deploy-telegram.sh
```

## 📱 Тестирование Telegram бота

После успешного развертывания:

1. **Найдите бота в Telegram** (токен 8132176571)
2. **Отправьте /start**
3. **Войдите на сайт как менеджер** и создайте заявку
4. **Проверьте уведомление** в Telegram
5. **Нажмите кнопку** - должно открыться веб-приложение

## 🎉 Готово!

После выполнения всех шагов у вас будет работающий Telegram бот с веб-приложением!
