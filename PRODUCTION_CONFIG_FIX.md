# 🚨 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Конфигурация и роутинг

## Проблемы в логах:
1. ❌ `TELEGRAM_BOT_TOKEN не установлен` - конфигурация не загружается
2. ❌ Frontend сервер перехватывает `/telegram/` запросы
3. ❌ Backend не получает запросы к Telegram файлам

## 🔧 Исправление конфигурации

### Шаг 1: Проверьте структуру файлов на сервере
```bash
cd /root/ROSTECHNOPOISK
ls -la *.env
ls -la production-config.env
```

### Шаг 2: Проверьте как запускается backend
```bash
pm2 show rostechnopolsk-backend
```

### Шаг 3: Исправьте конфигурацию

**Вариант A: Если используется PM2 ecosystem.config.js**
```javascript
// В ecosystem.config.js
module.exports = {
  apps: [{
    name: 'rostechnopolsk-backend',
    script: './backend/server.js',
    env_production: {
      NODE_ENV: 'production',
      TELEGRAM_BOT_TOKEN: '8132176571:AAE_NDB99yL-ekj-7wrTN7gEaZ1LD9ewyGk',
      WEB_APP_URL: 'https://xn--e1aggkdcahelgf4b.xn--p1ai',
      // ... остальные переменные
    }
  }]
};
```

**Вариант B: Скопировать .env в backend/**
```bash
cd /root/ROSTECHNOPOISK
cp production-config.env backend/.env
```

**Вариант C: Установить переменные через PM2**
```bash
pm2 set rostechnopolsk-backend:TELEGRAM_BOT_TOKEN "8132176571:AAE_NDB99yL-ekj-7wrTN7gEaZ1LD9ewyGk"
pm2 set rostechnopolsk-backend:WEB_APP_URL "https://xn--e1aggkdcahelgf4b.xn--p1ai"
```

## 🔧 Исправление роутинга

### Проблема: Frontend сервер перехватывает запросы

**В PM2 запущены 2 процесса:**
- rostechnopolsk-backend (backend)
- rostechnopolsk-frontend (frontend статический сервер)

**Frontend сервер не должен обрабатывать /telegram/ запросы!**

### Остановите frontend сервер:
```bash
pm2 stop rostechnopolsk-frontend
pm2 delete rostechnopolsk-frontend
```

### Или настройте прокси правильно

Если у вас есть nginx/caddy перед приложением, убедитесь что:
```nginx
# /telegram/ запросы идут на backend:3001
location /telegram/ {
    proxy_pass http://localhost:3001;
}

# Остальные запросы на frontend:3000
location / {
    proxy_pass http://localhost:3000;
}
```

## 🚀 Быстрое исправление:

```bash
# 1. Остановить все
pm2 stop all

# 2. Скопировать конфигурацию
cd /root/ROSTECHNOPOISK
cp production-config.env backend/.env

# 3. Запустить только backend
pm2 start ecosystem.config.js --only rostechnopolsk-backend --env production

# 4. Проверить переменные
pm2 show rostechnopolsk-backend
```

## 📊 Проверка исправления:

После исправления в логах должно быть:
```
🤖 Telegram бот запущен
🤖 Telegram WebApp: https://xn--e1aggkdcahelgf4b.xn--p1ai/telegram/
```

И URL должен работать:
- https://xn--e1aggkdcahelgf4b.xn--p1ai/api/health ✅
- https://xn--e1aggkdcahelgf4b.xn--p1ai/telegram/test-direct ✅
- https://xn--e1aggkdcahelgf4b.xn--p1ai/telegram/request.html ✅
