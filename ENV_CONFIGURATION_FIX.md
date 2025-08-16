# 🔧 ИСПРАВЛЕНИЕ: Конфигурация переменных окружения

## 🚨 Проблема найдена!

В `backend/server.js` строка 1-3:
```javascript
require('dotenv').config({
  path: `./.env.${process.env.NODE_ENV || 'local'}`
});
```

При `NODE_ENV=production` ищет файл `.env.production`, но у вас файл `production-config.env`!

## ✅ РЕШЕНИЯ (выберите одно):

### Решение 1: Переименовать файл (Рекомендуется)
```bash
cd /root/ROSTECHNOPOISK
mv production-config.env .env.production
```

### Решение 2: Создать симлинк
```bash
cd /root/ROSTECHNOPOISK
ln -s production-config.env .env.production
```

### Решение 3: Скопировать в backend как .env
```bash
cd /root/ROSTECHNOPOISK
cp production-config.env backend/.env
```

### Решение 4: Изменить код загрузки (если нужно)
В `backend/server.js` изменить на:
```javascript
// Попробовать разные варианты
if (require('fs').existsSync('./production-config.env')) {
  require('dotenv').config({ path: './production-config.env' });
} else if (require('fs').existsSync('./config.env')) {
  require('dotenv').config({ path: './config.env' });
} else {
  require('dotenv').config({
    path: `./.env.${process.env.NODE_ENV || 'local'}`
  });
}
```

## 🚀 Быстрое исправление:

```bash
# 1. Переименовать файл конфигурации
cd /root/ROSTECHNOPOISK
mv production-config.env .env.production

# 2. Перезапустить backend
pm2 restart rostechnopolsk-backend

# 3. Проверить логи
pm2 logs rostechnopolsk-backend --lines 10
```

## 📊 Проверка успешного исправления:

В логах должно появиться:
```
🤖 Telegram WebApp путь: /path/to/telegram-webapp
🤖 Файл существует: true
✅ Telegram WebApp найден в: /correct/path
🤖 Telegram бот запущен
🤖 Telegram WebApp: https://xn--e1aggkdcahelgf4b.xn--p1ai/telegram/
```

Вместо:
```
⚠️ TELEGRAM_BOT_TOKEN не установлен, бот не запущен
```

## 🎯 Тестирование после исправления:

1. **Проверьте переменные:**
   https://xn--e1aggkdcahelgf4b.xn--p1ai/telegram/test-direct

2. **Проверьте статические файлы:**
   https://xn--e1aggkdcahelgf4b.xn--p1ai/telegram/request.html

3. **Проверьте диагностику:**
   https://xn--e1aggkdcahelgf4b.xn--p1ai/api/telegram/debug
