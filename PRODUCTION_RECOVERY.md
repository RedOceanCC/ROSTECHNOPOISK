# 🚨 ЭКСТРЕННОЕ ВОССТАНОВЛЕНИЕ ПРОДАКШЕНА

## Текущие проблемы:
1. ❌ **502 ошибка** - сайт недоступен 
2. ❌ **Бесконечный цикл** в backend логах
3. ❌ **Ошибка базы данных**
4. ❌ **Фронтенд отключен**

## 🚀 СРОЧНОЕ ВОССТАНОВЛЕНИЕ:

### Шаг 1: Остановить все процессы
```bash
pm2 stop all
pm2 delete all
```

### Шаг 2: Загрузить исправленный server.js
(Убран бесконечный цикл в коде Telegram WebApp)

### Шаг 3: Проверить базу данных
```bash
cd /root/ROSTECHNOPOISK
ls -la /var/lib/rostechnopoisk/database/rostechnopolsk.db
# Если файла нет, нужно восстановить базу
```

### Шаг 4: Запустить сервисы по порядку

**A) Запустить backend:**
```bash
cd /root/ROSTECHNOPOISK
pm2 start ecosystem.config.js --only rostechnopolsk-backend --env production
```

**B) Проверить что backend работает:**
```bash
curl http://localhost:3001/api/health
pm2 logs rostechnopolsk-backend --lines 5
```

**C) Запустить frontend:**
```bash
pm2 start ecosystem.config.js --only rostechnopolsk-frontend --env production
```

### Шаг 5: Проверить восстановление
- ✅ https://ростехнопоиск.рф/api/health
- ✅ https://ростехнопоиск.рф/ (основной сайт)
- ✅ https://ростехнопоиск.рф/telegram/request.html

## 🔧 Диагностика проблем:

### Если база данных недоступна:
```bash
# Проверить права
ls -la /var/lib/rostechnopoisk/database/
chown -R root:root /var/lib/rostechnopoisk/
chmod 755 /var/lib/rostechnopoisk/database/
chmod 644 /var/lib/rostechnopoisk/database/rostechnopolsk.db
```

### Если backend не стартует:
```bash
# Проверить конфигурацию
cd /root/ROSTECHNOPOISK
cat .env.production | grep TELEGRAM
pm2 logs rostechnopolsk-backend --err
```

### Если frontend не стартует:
```bash
# Проверить что файлы есть
ls -la frontend/
pm2 logs rostechnopolsk-frontend
```

## 📊 Правильные логи после восстановления:

**Backend должен показать:**
```
🤖 Telegram WebApp настроен: /root/ROSTECHNOPOISK/telegram-webapp
✅ Telegram WebApp активирован
🤖 Telegram бот запущен
🚀 Сервер РОСТЕХНОПОИСК запущен на порту 3001
```

**НЕ должно быть:**
- Повторяющихся сообщений
- Ошибок Database.js
- Warnings о TELEGRAM_BOT_TOKEN

## 🎯 Финальная проверка:

1. **Основной сайт:** https://ростехнопоиск.рф/
2. **API здоровья:** https://ростехнопоиск.рф/api/health  
3. **Telegram WebApp:** https://ростехнопоиск.рф/telegram/request.html
4. **Логи чистые:** `pm2 logs` без ошибок

## 🚨 Если ничего не работает:

```bash
# Экстренное восстановление с нуля
cd /root/ROSTECHNOPOISK
git stash  # сохранить изменения
git pull   # получить последнюю версию
cp production-config.env .env.production
npm install
pm2 start ecosystem.config.js --env production
```
