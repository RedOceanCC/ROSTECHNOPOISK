# 🚨 ИСПРАВЛЕНИЕ: Абсолютный путь к БД в продакшене

## ❌ Ошибка
```
❌ Критическая ошибка запуска сервера: Error: В продакшене путь к БД должен быть абсолютным
```

## 🔧 БЫСТРОЕ ИСПРАВЛЕНИЕ

### На сервере выполните:

```bash
cd /root/ROSTECHNOPOISK

# Создать правильный .env.production файл
cat > .env.production << 'EOF'
# Настройки сервера для продакшена
PORT=3001
NODE_ENV=production

# Настройки сессий
SESSION_SECRET=b8d52d5d01ca90c623b09e1ab44d43ffd48979c5d49bdf932b3530a3f32fa73c

# Настройки базы данных
DB_PATH=/root/ROSTECHNOPOISK/backend/database/rostechnopolsk.db

# Telegram Bot
TELEGRAM_BOT_TOKEN=8132176571:AAE_NDB99yL-ekj-7wrTN7gEaZ1LD9ewyGk
TELEGRAM_WEBHOOK_URL=https://xn--e1aggkdcahelgf4b.xn--p1ai/api/telegram/webhook
WEB_APP_URL=https://xn--e1aggkdcahelgf4b.xn--p1ai

# Настройки аукциона
AUCTION_DURATION_HOURS=24

# Настройки логирования
LOG_LEVEL=info
EOF

# Проверить что файл создан правильно
cat .env.production | grep DB_PATH

# Убедиться что база данных существует
ls -la /root/ROSTECHNOPOISK/backend/database/rostechnopolsk.db

# Перезапустить backend
pm2 restart rostechnopolsk-backend

# Проверить логи
pm2 logs rostechnopolsk-backend --lines 20
```

## ✅ Проверка успешного исправления

После перезапуска в логах должно быть:
```
🚀 Сервер РОСТЕХНОПОИСК запущен на порту 3001
💾 База данных: /root/ROSTECHNOPOISK/backend/database/rostechnopolsk.db
🤖 Telegram бот запущен
```

НЕ должно быть:
```
❌ Критическая ошибка запуска сервера
Error: В продакшене путь к БД должен быть абсолютным
```

## 🔗 Финальные проверки

```bash
# API здоровья
curl http://localhost:3001/api/health

# Сайт работает 
curl -I https://xn--e1aggkdcahelgf4b.xn--p1ai/

# Telegram WebApp
curl -I https://xn--e1aggkdcahelgf4b.xn--p1ai/telegram/request.html
```

## 🚨 Если база данных не найдена

```bash
# Найти где лежит база
find /root -name "rostechnopolsk.db" -type f 2>/dev/null

# Скопировать базу в правильное место (если нужно)
mkdir -p /root/ROSTECHNOPOISK/backend/database/
cp /path/to/found/rostechnopolsk.db /root/ROSTECHNOPOISK/backend/database/

# Проверить права доступа
chmod 644 /root/ROSTECHNOPOISK/backend/database/rostechnopolsk.db
```

## 📋 Альтернативное решение

Если хотите использовать стандартный путь `/var/lib/`, измените в `.env.production`:

```bash
# Заменить путь на стандартный
sed -i 's|DB_PATH=/root/ROSTECHNOPOISK/backend/database/rostechnopolsk.db|DB_PATH=/var/lib/rostechnopoisk/database/rostechnopolsk.db|' .env.production

# Создать директорию и скопировать базу
sudo mkdir -p /var/lib/rostechnopoisk/database/
sudo cp /root/ROSTECHNOPOISK/backend/database/rostechnopolsk.db /var/lib/rostechnopoisk/database/
sudo chown root:root /var/lib/rostechnopoisk/database/rostechnopolsk.db
sudo chmod 644 /var/lib/rostechnopoisk/database/rostechnopolsk.db
```

