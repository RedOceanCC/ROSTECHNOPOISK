# 🔧 ИСПРАВЛЕНИЕ: Путь к базе данных в продакшене

## ✅ Проблема найдена!
**Ошибка:** `В продакшене путь к БД должен быть абсолютным`

**Причина:** В `.env.production` указан относительный путь `./database/rostechnopolsk.db`

## 🚀 БЫСТРОЕ ИСПРАВЛЕНИЕ:

### Шаг 1: Обновить конфигурацию
Загрузите исправленный `production-config.env` на сервер где изменено:

```env
# БЫЛО:
DB_PATH=./database/rostechnopolsk.db

# СТАЛО:
DB_PATH=/var/lib/rostechnopoisk/database/rostechnopolsk.db
```

### Шаг 2: Обновить .env.production на сервере
```bash
cd /root/ROSTECHNOPOISK

# Скопировать исправленную конфигурацию
cp production-config.env .env.production

# Проверить что путь правильный
grep DB_PATH .env.production
```

### Шаг 3: Проверить что база данных существует
```bash
# Проверить что файл базы существует
ls -la /var/lib/rostechnopoisk/database/rostechnopolsk.db

# Если нет - создать папки и скопировать базу
sudo mkdir -p /var/lib/rostechnopoisk/database/
sudo cp backend/database/rostechnopolsk.db /var/lib/rostechnopoisk/database/
sudo chown -R root:root /var/lib/rostechnopoisk/
sudo chmod 755 /var/lib/rostechnopoisk/database/
sudo chmod 644 /var/lib/rostechnopoisk/database/rostechnopolsk.db
```

### Шаг 4: Перезапустить backend
```bash
pm2 restart rostechnopolsk-backend

# Проверить что заработало
sleep 3
curl http://localhost:3001/api/health
```

## 📊 Проверка успешного исправления:

**В логах должно быть:**
```
🤖 Telegram WebApp настроен: /root/ROSTECHNOPOISK/telegram-webapp
✅ Telegram WebApp активирован
🤖 Telegram бот запущен
🚀 Сервер РОСТЕХНОПОИСК запущен на порту 3001
💾 База данных: /var/lib/rostechnopoisk/database/rostechnopolsk.db
```

**НЕ должно быть:**
```
❌ Критическая ошибка запуска сервера
Error: В продакшене путь к БД должен быть абсолютным
```

## 🎯 Финальная проверка:

1. **API здоровья:** `curl http://localhost:3001/api/health`
2. **Сайт работает:** https://xn--e1aggkdcahelgf4b.xn--p1ai/
3. **Telegram WebApp:** https://xn--e1aggkdcahelgf4b.xn--p1ai/telegram/request.html

## 🚨 Если база данных не найдена:

```bash
# Найти где лежит база данных
find /root -name "rostechnopolsk.db" -type f 2>/dev/null

# Скопировать в правильное место
sudo mkdir -p /var/lib/rostechnopoisk/database/
sudo cp /path/to/found/rostechnopolsk.db /var/lib/rostechnopoisk/database/
sudo chown root:root /var/lib/rostechnopoisk/database/rostechnopolsk.db
sudo chmod 644 /var/lib/rostechnopoisk/database/rostechnopolsk.db
```

## ⚡ Альтернативное решение (если нет доступа к /var/lib):

Изменить в `production-config.env`:
```env
DB_PATH=/root/ROSTECHNOPOISK/backend/database/rostechnopolsk.db
```

Но лучше использовать стандартное место `/var/lib/rostechnopoisk/`
