# 🚀 Инструкция по деплою РОСТЕХНОПОИСК

## 📋 Содержание

1. [Требования к серверу](#требования-к-серверу)
2. [Подготовка сервера](#подготовка-сервера)
3. [Установка проекта](#установка-проекта)
4. [Настройка окружения](#настройка-окружения)
5. [Инициализация базы данных](#инициализация-базы-данных)
6. [Настройка веб-сервера](#настройка-веб-сервера)
7. [Запуск в продакшене](#запуск-в-продакшене)
8. [Мониторинг и логирование](#мониторинг-и-логирование)
9. [Резервное копирование](#резервное-копирование)
10. [Обновление проекта](#обновление-проекта)

---

## 🖥️ Требования к серверу

### Минимальные требования:
- **ОС**: Ubuntu 20.04 LTS / CentOS 8+ / Debian 11+
- **CPU**: 2 ядра
- **RAM**: 2 GB
- **Диск**: 20 GB SSD
- **Сеть**: 1 Gbps

### Рекомендуемые требования:
- **ОС**: Ubuntu 22.04 LTS
- **CPU**: 4 ядра
- **RAM**: 4 GB
- **Диск**: 50 GB SSD
- **Сеть**: 1 Gbps

### Необходимое ПО:
- Node.js 18+ 
- npm 9+
- PM2
- Nginx
- Git
- Certbot (для SSL)

---

## 🔧 Подготовка сервера

### 1. Обновление системы

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git htop nano

# CentOS/RHEL
sudo yum update -y
sudo yum install -y curl wget git htop nano
```

### 2. Установка Node.js

```bash
# Установка Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Проверка версий
node --version  # должно быть v20.x.x
npm --version   # должно быть 10.x.x
```

### 3. Установка PM2

```bash
sudo npm install -g pm2
pm2 startup  # Настройка автозапуска
```

### 4. Установка Nginx

```bash
# Ubuntu/Debian
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Проверка
sudo systemctl status nginx
```

### 5. Настройка брандмауэра

```bash
# Открываем необходимые порты
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

---

## 📦 Установка проекта

### 1. Клонирование репозитория

```bash
# Переходим в домашнюю папку
cd /home/$(whoami)

# Клонируем проект
git clone https://github.com/your-username/rostechnopoisk.git
cd rostechnopoisk

# Или если используете приватный репозиторий:
git clone git@github.com:your-username/rostechnopoisk.git
```

### 2. Создание пользователя для приложения

```bash
# Создаем пользователя (опционально)
sudo useradd -m -s /bin/bash rostechno
sudo usermod -aG sudo rostechno

# Переносим проект
sudo mv /home/$(whoami)/rostechnopoisk /home/rostechno/
sudo chown -R rostechno:rostechno /home/rostechno/rostechnopoisk
```

### 3. Установка зависимостей

```bash
# Переходим в папку проекта
cd /home/rostechno/rostechnopoisk

# Устанавливаем зависимости
npm install

# Устанавливаем backend зависимости
cd backend
npm install
cd ..
```

---

## ⚙️ Настройка окружения

### 1. Создание файла конфигурации

```bash
# Автоматическая настройка для продакшена
node setup-env.js --env=production

# Или вручную:
cp config-templates/env.production.template .env.production
```

### 2. Редактирование конфигурации

```bash
nano .env.production
```

**ОБЯЗАТЕЛЬНО измените следующие параметры:**

```env
# Генерируйте новый секретный ключ!
SESSION_SECRET=your_super_secure_random_64_character_string_here_change_this

# Укажите ваши домены
CORS_ORIGINS=https://ростехнопоиск.рф,https://xn--e1aggkdcahelgf4b.xn--p1ai

# Настройте пути для продакшена
DB_PATH=/var/lib/rostechnopoisk/database/rostechnopolsk.db
LOG_DIR=/var/log/rostechnopoisk
BACKUP_PATH=/var/backups/rostechnopoisk
```

### 3. Генерация безопасного SESSION_SECRET

```bash
# Вариант 1: OpenSSL
openssl rand -hex 32

# Вариант 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Скопируйте результат в SESSION_SECRET
```

### 4. Создание необходимых каталогов

```bash
# Создание каталогов с правильными правами
sudo mkdir -p /var/lib/rostechnopoisk/database
sudo mkdir -p /var/log/rostechnopoisk
sudo mkdir -p /var/backups/rostechnopoisk

# Установка владельца
sudo chown -R rostechno:rostechno /var/lib/rostechnopoisk
sudo chown -R rostechno:rostechno /var/log/rostechnopoisk
sudo chown -R rostechno:rostechno /var/backups/rostechnopoisk

# Установка прав доступа
sudo chmod 755 /var/lib/rostechnopoisk
sudo chmod 755 /var/log/rostechnopoisk
sudo chmod 700 /var/backups/rostechnopoisk
```

---

## 🗄️ Инициализация базы данных

### 1. Запуск инициализации

```bash
# Переходим в папку проекта
cd /home/rostechno/rostechnopoisk

# Устанавливаем окружение
export NODE_ENV=production

# Запускаем инициализацию БД
node scripts/init-production-db.js
```

### 2. Проверка базы данных

```bash
# Проверка целостности
node backend/database/migrate-prod.js check

# Просмотр статуса
node -e "
require('dotenv').config({path: '.env.production'});
const db = require('./backend/models/Database');
db.connect().then(() => db.getStatus()).then(console.log);
"
```

---

## 🌐 Настройка веб-сервера

### 1. Создание конфигурации Nginx

```bash
sudo nano /etc/nginx/sites-available/rostechnopoisk
```

Содержимое файла:

```nginx
server {
    listen 80;
    server_name ростехнопоиск.рф xn--e1aggkdcahelgf4b.xn--p1ai;

    # Редирект на HTTPS (добавится после получения SSL)
    # return 301 https://$server_name$request_uri;

    # Временно для получения SSL сертификата
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
    }

    # Статические файлы
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        proxy_pass http://localhost:3000;
    }

    # Безопасность
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
}
```

### 2. Активация конфигурации

```bash
# Создание символической ссылки
sudo ln -s /etc/nginx/sites-available/rostechnopoisk /etc/nginx/sites-enabled/

# Проверка конфигурации
sudo nginx -t

# Перезагрузка Nginx
sudo systemctl reload nginx
```

### 3. Получение SSL сертификата

```bash
# Установка Certbot
sudo apt install -y certbot python3-certbot-nginx

# Получение сертификата
sudo certbot --nginx -d ростехнопоиск.рф -d xn--e1aggkdcahelgf4b.xn--p1ai

# Проверка автообновления
sudo certbot renew --dry-run
```

---

## 🚀 Запуск в продакшене

### 1. Создание PM2 конфигурации

```bash
cd /home/rostechno/rostechnopoisk
cp ecosystem.config.example.js ecosystem.config.js
nano ecosystem.config.js
```

Обновите пути в конфигурации:

```javascript
module.exports = {
  apps: [
    {
      name: 'rostechnopolsk-backend',
      script: './backend/server.js',
      cwd: '/home/rostechno/rostechnopoisk',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      error_file: '/var/log/rostechnopoisk/backend-error.log',
      out_file: '/var/log/rostechnopoisk/backend-out.log',
      log_file: '/var/log/rostechnopoisk/backend-combined.log',
      time: true
    },
    {
      name: 'rostechnopolsk-frontend',
      script: './frontend-server.js',
      cwd: '/home/rostechno/rostechnopoisk',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '200M',
      error_file: '/var/log/rostechnopoisk/frontend-error.log',
      out_file: '/var/log/rostechnopoisk/frontend-out.log',
      log_file: '/var/log/rostechnopoisk/frontend-combined.log',
      time: true
    }
  ]
};
```

### 2. Запуск приложения

```bash
# Переключаемся на пользователя проекта
sudo -u rostechno -i

# Переходим в папку проекта
cd /home/rostechno/rostechnopoisk

# Устанавливаем переменную окружения
export NODE_ENV=production

# Запускаем с PM2
pm2 start ecosystem.config.js

# Проверяем статус
pm2 status
pm2 logs

# Сохраняем конфигурацию PM2
pm2 save
pm2 startup
```

### 3. Настройка автозапуска

```bash
# Генерируем команду для автозапуска (выполните как root)
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u rostechno --hp /home/rostechno
```

---

## 📊 Мониторинг и логирование

### 1. Настройка логротации

```bash
sudo nano /etc/logrotate.d/rostechnopoisk
```

Содержимое:

```
/var/log/rostechnopoisk/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 rostechno rostechno
    postrotate
        sudo -u rostechno pm2 reloadLogs
    endscript
}
```

### 2. Мониторинг с PM2

```bash
# Установка PM2 мониторинга
pm2 install pm2-logrotate

# Веб-интерфейс мониторинга
pm2 web

# Просмотр логов в реальном времени
pm2 logs
pm2 logs rostechnopolsk-backend
pm2 logs rostechnopolsk-frontend
```

### 3. Системный мониторинг

```bash
# Создание скрипта мониторинга
sudo nano /usr/local/bin/rostechnopoisk-health-check
```

Содержимое скрипта:

```bash
#!/bin/bash
echo "$(date): Проверка здоровья РОСТЕХНОПОИСК"

# Проверка PM2 процессов
pm2 list | grep -E "(rostechnopolsk|online)"

# Проверка размера БД
db_size=$(du -h /var/lib/rostechnopoisk/database/rostechnopolsk.db 2>/dev/null | cut -f1)
echo "Размер БД: ${db_size:-'не найдена'}"

# Проверка свободного места
df -h /var/lib/rostechnopoisk

# Проверка ответа сервера
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health
```

```bash
sudo chmod +x /usr/local/bin/rostechnopoisk-health-check

# Добавление в crontab для регулярной проверки
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/rostechnopoisk-health-check >> /var/log/rostechnopoisk/health.log") | crontab -
```

---

## 💾 Резервное копирование

### 1. Автоматическое резервное копирование

```bash
sudo nano /usr/local/bin/backup-rostechnopoisk
```

Содержимое скрипта:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/rostechnopoisk"
DB_PATH="/var/lib/rostechnopoisk/database/rostechnopolsk.db"
PROJECT_DIR="/home/rostechno/rostechnopoisk"

echo "$(date): Начало резервного копирования"

# Создание бэкапа БД
if [ -f "$DB_PATH" ]; then
    cp "$DB_PATH" "$BACKUP_DIR/db_backup_$DATE.db"
    echo "БД сохранена: $BACKUP_DIR/db_backup_$DATE.db"
fi

# Создание архива проекта (без node_modules)
tar -czf "$BACKUP_DIR/project_backup_$DATE.tar.gz" \
    --exclude="node_modules" \
    --exclude="*.log" \
    --exclude="*.db" \
    -C "/home/rostechno" rostechnopoisk

echo "Проект сохранен: $BACKUP_DIR/project_backup_$DATE.tar.gz"

# Удаление старых бэкапов (старше 30 дней)
find "$BACKUP_DIR" -name "*.db" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete

echo "$(date): Резервное копирование завершено"
```

```bash
sudo chmod +x /usr/local/bin/backup-rostechnopoisk

# Добавление в crontab (ежедневно в 2:00)
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-rostechnopoisk >> /var/log/rostechnopoisk/backup.log") | crontab -
```

### 2. Восстановление из бэкапа

```bash
# Остановка приложения
pm2 stop all

# Восстановление БД
cp /var/backups/rostechnopoisk/db_backup_YYYYMMDD_HHMMSS.db /var/lib/rostechnopoisk/database/rostechnopolsk.db

# Восстановление проекта
cd /home/rostechno
tar -xzf /var/backups/rostechnopoisk/project_backup_YYYYMMDD_HHMMSS.tar.gz

# Установка зависимостей
cd rostechnopoisk
npm install
cd backend && npm install && cd ..

# Запуск приложения
pm2 start ecosystem.config.js
```

---

## 🔄 Обновление проекта

### 1. Плановое обновление

```bash
# Переключение на пользователя проекта
sudo -u rostechno -i
cd /home/rostechno/rostechnopoisk

# Создание бэкапа перед обновлением
node backend/database/migrate-prod.js backup

# Получение обновлений
git fetch origin
git pull origin main

# Установка новых зависимостей
npm install
cd backend && npm install && cd ..

# Выполнение миграций БД
export NODE_ENV=production
node backend/database/migrate-prod.js

# Перезапуск приложения
pm2 reload ecosystem.config.js
pm2 logs
```

### 2. Экстренное обновление

```bash
# Создание бэкапа
sudo -u rostechno node /home/rostechno/rostechnopoisk/backend/database/migrate-prod.js backup

# Остановка приложения
sudo -u rostechno pm2 stop all

# Обновление кода
cd /home/rostechno/rostechnopoisk
sudo -u rostechno git pull origin main

# Быстрая установка зависимостей
sudo -u rostechno npm ci --production
cd backend && sudo -u rostechno npm ci --production && cd ..

# Миграции БД
sudo -u rostechno NODE_ENV=production node backend/database/migrate-prod.js

# Запуск
sudo -u rostechno pm2 start ecosystem.config.js
```

### 3. Откат изменений

```bash
# В случае проблем - откат к предыдущей версии
cd /home/rostechno/rostechnopoisk
git log --oneline -10  # Смотрим последние коммиты
git checkout PREVIOUS_COMMIT_HASH

# Восстановление БД из бэкапа
sudo -u rostechno node backend/database/migrate-prod.js restore /var/backups/rostechnopoisk/latest_backup.db

# Перезапуск
pm2 reload ecosystem.config.js
```

---

## 🔍 Диагностика проблем

### Основные команды для диагностики:

```bash
# Статус сервисов
sudo systemctl status nginx
pm2 status
pm2 logs

# Проверка портов
sudo netstat -tlnp | grep -E "(3000|3001|80|443)"

# Проверка дискового пространства
df -h

# Проверка памяти
free -h

# Просмотр логов системы
sudo journalctl -xe

# Просмотр логов приложения
tail -f /var/log/rostechnopoisk/backend-combined.log
tail -f /var/log/rostechnopoisk/frontend-combined.log

# Проверка целостности БД
sudo -u rostechno NODE_ENV=production node /home/rostechno/rostechnopoisk/backend/database/migrate-prod.js check
```

### Частые проблемы и решения:

1. **Приложение не запускается**
   ```bash
   # Проверка прав доступа
   sudo chown -R rostechno:rostechno /home/rostechno/rostechnopoisk
   sudo chown -R rostechno:rostechno /var/lib/rostechnopoisk
   sudo chown -R rostechno:rostechno /var/log/rostechnopoisk
   ```

2. **База данных недоступна**
   ```bash
   # Проверка пути к БД
   ls -la /var/lib/rostechnopoisk/database/
   
   # Создание каталога если не существует
   sudo mkdir -p /var/lib/rostechnopoisk/database
   sudo chown rostechno:rostechno /var/lib/rostechnopoisk/database
   ```

3. **Nginx не может подключиться к приложению**
   ```bash
   # Проверка, запущено ли приложение
   pm2 status
   
   # Проверка портов
   sudo netstat -tlnp | grep -E "(3000|3001)"
   
   # Перезапуск приложения
   pm2 restart all
   ```

---

## ✅ Финальная проверка

После завершения деплоя выполните:

```bash
# 1. Проверка статуса всех сервисов
sudo systemctl status nginx
pm2 status

# 2. Проверка API
curl http://localhost:3001/api/health

# 3. Проверка фронтенда
curl http://localhost:3000

# 4. Проверка через доменное имя
curl https://ростехнопоиск.рф/api/health

# 5. Проверка SSL сертификата
openssl s_client -connect ростехнопоиск.рф:443 -servername ростехнопоиск.рф

# 6. Проверка логов на ошибки
pm2 logs --lines 50
```

---

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи: `pm2 logs`
2. Убедитесь в правильности конфигурации: `nano .env.production`
3. Проверьте права доступа к файлам и каталогам
4. Используйте команды диагностики из раздела выше

**Готово! РОСТЕХНОПОИСК запущен в продакшене! 🎉**
