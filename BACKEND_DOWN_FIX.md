# 🚨 Backend упал - Connection refused на порту 3001

## Диагностика подтвердила:
❌ `curl: (7) Failed to connect to localhost port 3001: Connection refused`

**Это означает что backend процесс НЕ запущен или НЕ слушает порт 3001**

## 🔍 СРОЧНАЯ ДИАГНОСТИКА:

```bash
# 1. Проверить статус PM2
pm2 status

# 2. Проверить что слушает порт 3001
sudo ss -tlnp | grep :3001
netstat -tlnp | grep :3001

# 3. Найти процессы Node.js
ps aux | grep node

# 4. Проверить логи PM2
pm2 logs rostechnopolsk-backend --lines 20
pm2 logs rostechnopolsk-backend --err --lines 10
```

## 🚀 БЫСТРОЕ ВОССТАНОВЛЕНИЕ:

### Шаг 1: Запустить backend через PM2
```bash
cd /root/ROSTECHNOPOISK

# Если процесс есть в PM2 но не работает
pm2 restart rostechnopolsk-backend

# Если процесса нет - создать
pm2 start ecosystem.config.js --only rostechnopolsk-backend --env production
```

### Шаг 2: Если PM2 не работает - запустить напрямую
```bash
cd /root/ROSTECHNOPOISK/backend

# Запустить в фоне
NODE_ENV=production nohup node server.js > ../logs/manual-backend.log 2>&1 &

# Проверить что запустилось
curl http://localhost:3001/api/health
```

### Шаг 3: Если не запускается - проверить ошибки
```bash
cd /root/ROSTECHNOPOISK/backend

# Запустить в консоли чтобы увидеть ошибки
NODE_ENV=production node server.js

# Смотрите какая ошибка мешает запуску
```

## 🔧 Возможные проблемы и решения:

### 1. Нет файла .env.production
```bash
cd /root/ROSTECHNOPOISK
ls -la .env.production
# Если нет - создать
cp production-config.env .env.production
```

### 2. Ошибка в коде server.js
```bash
# Откатить к рабочей версии
git checkout HEAD -- backend/server.js
```

### 3. База данных недоступна
```bash
ls -la /var/lib/rostechnopoisk/database/rostechnopolsk.db
chmod 644 /var/lib/rostechnopoisk/database/rostechnopolsk.db
```

### 4. Нет прав на порт 3001
```bash
# Проверить что порт свободен
sudo lsof -i :3001
# Если занят - убить процесс
sudo kill -9 <PID>
```

### 5. Нет зависимостей
```bash
cd /root/ROSTECHNOPOISK/backend
npm install
```

## ⚡ ЭКСТРЕННОЕ ВОССТАНОВЛЕНИЕ:

```bash
cd /root/ROSTECHNOPOISK

# 1. Остановить все PM2 процессы
pm2 stop all
pm2 delete all

# 2. Убедиться что порт свободен
sudo lsof -i :3001 | tail -n +2 | awk '{print $2}' | xargs -r sudo kill -9

# 3. Запустить заново
pm2 start ecosystem.config.js --env production

# 4. Проверить
sleep 5
curl http://localhost:3001/api/health
pm2 status
```

## 📊 Правильный результат после исправления:

```bash
# Должно работать:
curl http://localhost:3001/api/health
# {"success":true,"message":"Сервер РОСТЕХНОПОИСК работает",...}

# PM2 должен показать:
pm2 status
# rostechnopolsk-backend │ online

# Порт должен слушаться:
sudo ss -tlnp | grep :3001
# LISTEN 0 511 *:3001 *:*
```
