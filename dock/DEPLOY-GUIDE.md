# 🚀 ДЕПЛОЙ РОСТЕХНОПОИСК НА СЕРВЕР - ПОЛНАЯ ИНСТРУКЦИЯ

## 📋 ПОДГОТОВКА НА ЛОКАЛЬНОЙ МАШИНЕ

### 1️⃣ Подготовка файлов для деплоя

```bash
# В папке проекта выполните:
node prepare-production.js
```

**Результат:** Создастся папка `production-ready/` с готовой к деплою версией.

### 2️⃣ Архивация для загрузки

```bash
# Создайте архив для удобной загрузки
tar -czf rostechnopolsk-production.tar.gz production-ready/
```

---

## 🌐 ДЕПЛОЙ НА СЕРВЕР

### 3️⃣ Загрузка файлов через winSCP

1. **Подключитесь к серверу через winSCP**
2. **Создайте папку проекта:**
   ```bash
   mkdir /var/www/rostechnopolsk
   # или
   mkdir ~/rostechnopolsk
   ```
3. **Загрузите архив** `rostechnopolsk-production.tar.gz` на сервер
4. **Распакуйте:**
   ```bash
   cd /var/www/rostechnopolsk
   tar -xzf rostechnopolsk-production.tar.gz --strip-components=1
   rm rostechnopolsk-production.tar.gz
   ```

### 4️⃣ Установка Node.js (если не установлен)

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL/Rocky Linux
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Проверка
node --version  # должно быть >= 14.0.0
npm --version   # должно быть >= 6.0.0
```

### 5️⃣ Установка зависимостей

```bash
cd /var/www/rostechnopolsk

# Установите backend зависимости
cd backend
npm install --production

# Проверьте что bcryptjs установлен
npm list bcryptjs

# Вернитесь в корень
cd ..
```

### 6️⃣ Настройка конфигурации

```bash
# Отредактируйте конфигурацию
nano backend/config.env
```

**Обязательно измените:**
```bash
# ИЗМЕНИТЕ SESSION_SECRET НА СИЛЬНЫЙ СЛУЧАЙНЫЙ КЛЮЧ!
SESSION_SECRET=ваш_супер_секретный_ключ_123456789_abcdef

# Укажите ваш домен для Telegram (если используете)
TELEGRAM_WEBHOOK_URL=https://yourdomain.com/api/telegram/webhook
```

### 7️⃣ Инициализация базы данных

```bash
cd backend
node database/init.js
```

**Ожидаемый результат:**
```
✅ База данных успешно инициализирована!
✅ Демо-данные загружены
✅ Типы техники загружены из каталога
```

### 8️⃣ Тест запуска

```bash
# Тест backend
cd backend
node server.js
```

**В другом терминале проверьте:**
```bash
curl http://localhost:3001/api/health
# Ответ: {"status":"ok","timestamp":"..."}
```

**Остановите тест:** `Ctrl+C`

---

## 🔄 НАСТРОЙКА PM2 ДЛЯ ПРОДАКШЕНА

### 9️⃣ Установка PM2

```bash
sudo npm install -g pm2
```

### 🔟 Настройка PM2 конфигурации

```bash
cd /var/www/rostechnopolsk

# Отредактируйте ecosystem.config.js
nano ecosystem.config.js
```

**Обновите пути:**
```javascript
// Замените '/path/to/your/project' на:
cwd: '/var/www/rostechnopolsk',
```

### 1️⃣1️⃣ Запуск через PM2

```bash
# Создайте папку для логов
mkdir logs

# Запустите приложения
pm2 start ecosystem.config.js

# Проверьте статус
pm2 status

# Посмотрите логи
pm2 logs

# Сохраните конфигурацию PM2
pm2 save
pm2 startup
```

**Выполните команду, которую покажет `pm2 startup`**

---

## 🌐 НАСТРОЙКА NGINX (ОПЦИОНАЛЬНО)

### 1️⃣2️⃣ Установка Nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

### 1️⃣3️⃣ Настройка Nginx

```bash
# Скопируйте конфигурацию
sudo cp nginx.conf /etc/nginx/sites-available/rostechnopolsk

# Отредактируйте домен
sudo nano /etc/nginx/sites-available/rostechnopolsk
```

**Замените `your-domain.com` на ваш домен**

```bash
# Активируйте сайт
sudo ln -s /etc/nginx/sites-available/rostechnopolsk /etc/nginx/sites-enabled/

# Удалите дефолтный сайт
sudo rm /etc/nginx/sites-enabled/default

# Проверьте конфигурацию
sudo nginx -t

# Перезапустите Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## 🔐 НАСТРОЙКА БЕЗОПАСНОСТИ

### 1️⃣4️⃣ Firewall

```bash
# Ubuntu/Debian
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --add-port=22/tcp --permanent  # SSH
sudo firewall-cmd --add-port=80/tcp --permanent  # HTTP
sudo firewall-cmd --add-port=443/tcp --permanent # HTTPS
sudo firewall-cmd --reload
```

### 1️⃣5️⃣ SSL сертификат (рекомендуется)

```bash
# Установите Certbot
sudo snap install --classic certbot

# Получите SSL сертификат
sudo certbot --nginx -d yourdomain.com

# Автообновление
sudo crontab -e
# Добавьте: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## ✅ ПРОВЕРКА РАБОТЫ

### 1️⃣6️⃣ Финальная проверка

```bash
# Статус PM2
pm2 status

# Логи приложений
pm2 logs rostechnopolsk-backend --lines 20
pm2 logs rostechnopolsk-frontend --lines 20

# Статус Nginx
sudo systemctl status nginx

# Тест API
curl http://localhost:3001/api/health
curl http://yourdomain.com/api/health

# Тест frontend
curl -I http://yourdomain.com/
```

### 1️⃣7️⃣ Проверка в браузере

**Откройте в браузере:**
- **Без Nginx:** `http://your-server-ip:3000`
- **С Nginx:** `http://yourdomain.com`

**Тестовые аккаунты:**
- `admin` / `admin123` - Администратор
- `manager123` / `manager123` - Менеджер
- `owner123` / `owner123` - Владелец техники

---

## 🛠️ КОМАНДЫ УПРАВЛЕНИЯ

### Управление PM2
```bash
pm2 restart all          # Перезапуск всех приложений
pm2 stop all            # Остановка всех приложений
pm2 start all           # Запуск всех приложений
pm2 reload all          # Плавный перезапуск
pm2 logs               # Просмотр логов
pm2 monit              # Мониторинг в реальном времени
```

### Управление Nginx
```bash
sudo systemctl status nginx    # Статус
sudo systemctl restart nginx   # Перезапуск
sudo systemctl reload nginx    # Перезагрузка конфигурации
sudo nginx -t                  # Проверка конфигурации
```

### Обновление кода
```bash
# При обновлении кода:
cd /var/www/rostechnopolsk
# Загрузите новые файлы через winSCP
pm2 reload all                 # Перезапустите приложения
```

---

## 🔍 ДИАГНОСТИКА ПРОБЛЕМ

### Проблема: Приложение не запускается
```bash
# Проверьте логи PM2
pm2 logs

# Проверьте конфигурацию
cat backend/config.env

# Проверьте зависимости
cd backend && npm list
```

### Проблема: API недоступен
```bash
# Проверьте что backend запущен
pm2 status

# Проверьте порты
netstat -tlnp | grep :3001

# Проверьте логи
pm2 logs rostechnopolsk-backend
```

### Проблема: Frontend недоступен
```bash
# С Nginx
sudo nginx -t
sudo systemctl status nginx

# Без Nginx
pm2 logs rostechnopolsk-frontend
netstat -tlnp | grep :3000
```

---

## 📊 МОНИТОРИНГ

### Логи
```bash
# PM2 логи
pm2 logs

# Системные логи приложения
tail -f /var/www/rostechnopolsk/logs/backend-combined.log

# Nginx логи
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Ресурсы
```bash
# Использование памяти и CPU
pm2 monit

# Дисковое пространство
df -h

# Использование портов
netstat -tlnp | grep -E ':(3000|3001|80|443)'
```

---

## 🎉 ГОТОВО!

**✅ Ваш проект РОСТЕХНОПОИСК успешно развернут!**

**🌐 Доступ:**
- **Frontend:** `http://yourdomain.com` или `http://server-ip:3000`
- **API:** `http://yourdomain.com/api` или `http://server-ip:3001/api`

**📞 При проблемах:**
1. Проверьте логи: `pm2 logs`
2. Проверьте статус: `pm2 status`
3. Проверьте конфигурацию: `cat backend/config.env`

**🔄 Обновление проекта:**
1. Подготовьте новую версию: `node prepare-production.js`
2. Загрузите на сервер через winSCP
3. Перезапустите: `pm2 reload all`
