# 🚨 ЭКСТРЕННОЕ ИСПРАВЛЕНИЕ 502 Bad Gateway

## 🔍 Что означает 502 Bad Gateway:
- Caddy (веб-сервер) работает
- Backend приложение (порт 3001) НЕ отвечает
- Возможно backend упал или завис

## 🚀 СРОЧНАЯ ДИАГНОСТИКА:

### Шаг 1: Проверьте статус PM2
```bash
pm2 status
pm2 list
```

### Шаг 2: Проверьте логи backend
```bash
pm2 logs rostechnopolsk-backend --lines 20
pm2 logs rostechnopolsk-backend --err --lines 10
```

### Шаг 3: Проверьте что backend отвечает локально
```bash
curl http://localhost:3001/api/health
# Если не отвечает - backend упал
```

### Шаг 4: Проверьте порты
```bash
netstat -tlnp | grep :3001
# Должен показать что процесс слушает порт 3001
```

## 🛠️ БЫСТРОЕ ИСПРАВЛЕНИЕ:

### Если backend упал:
```bash
# Перезапустить backend
pm2 restart rostechnopolsk-backend

# Или если совсем плохо - убить и запустить заново
pm2 delete rostechnopolsk-backend
pm2 start ecosystem.config.js --only rostechnopolsk-backend --env production
```

### Если backend завис:
```bash
# Принудительно убить
pm2 delete rostechnopolsk-backend

# Запустить заново
cd /root/ROSTECHNOPOISK
pm2 start ecosystem.config.js --only rostechnopolsk-backend --env production
```

### Если процесс запускается но сразу падает:
```bash
# Проверить логи ошибок
pm2 logs rostechnopolsk-backend --err

# Возможные проблемы:
# 1. Ошибка в коде (из-за наших изменений)
# 2. База данных недоступна
# 3. Нет прав на файлы
```

## 🔧 ЭКСТРЕННОЕ ВОССТАНОВЛЕНИЕ:

### Если наши изменения сломали backend:

```bash
cd /root/ROSTECHNOPOISK

# Откатить изменения в server.js к рабочей версии
git checkout HEAD -- backend/server.js

# Или восстановить из бэкапа если есть
# cp backup/server.js backend/server.js

# Перезапустить
pm2 restart rostechnopolsk-backend
```

### Альтернативное решение - запуск без PM2:
```bash
cd /root/ROSTECHNOPOISK/backend
NODE_ENV=production node server.js

# Если запустилось - проблема в PM2
# Если не запустилось - смотрите ошибки в консоли
```

## 📊 Проверка восстановления:

1. **Backend отвечает локально:**
   ```bash
   curl http://localhost:3001/api/health
   ```

2. **Сайт доступен:**
   https://xn--e1aggkdcahelgf4b.xn--p1ai/api/health

3. **PM2 показывает онлайн:**
   ```bash
   pm2 status
   # rostechnopolsk-backend должен быть online
   ```

## 🚨 Если ничего не помогает:

### Быстрый откат к стабильной версии:
```bash
cd /root/ROSTECHNOPOISK

# Остановить все
pm2 stop all
pm2 delete all

# Откатить код
git stash  # сохранить изменения
git reset --hard HEAD~5  # откатить на 5 коммитов назад

# Запустить базовую версию
pm2 start ecosystem.config.js --env production
```

## 📞 Диагностические команды:

```bash
# Проверить что слушает порт 3001
sudo ss -tlnp | grep :3001

# Проверить процессы Node.js
ps aux | grep node

# Проверить доступную память
free -h

# Проверить место на диске
df -h
```

## ⚡ Самое быстрое решение:

```bash
pm2 restart rostechnopolsk-backend
curl http://localhost:3001/api/health
```

Если это не помогает - backend точно упал и нужна более глубокая диагностика!
