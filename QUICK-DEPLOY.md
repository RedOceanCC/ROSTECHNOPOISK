# ⚡ Быстрый деплой РОСТЕХНОПОИСК

## 🚀 Для опытных администраторов

### 1. Подготовка сервера (2 минуты)

```bash
# Установка ПО
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt update && sudo apt install -y nodejs nginx git
sudo npm install -g pm2
sudo ufw allow 22,80,443
```

### 2. Клонирование и настройка (3 минуты)

```bash
# Клонирование
git clone https://github.com/your-username/rostechnopoisk.git
cd rostechnopoisk

# Быстрая настройка окружения
node setup-env.js --env=production
nano .env.production  # ИЗМЕНИТЕ SESSION_SECRET и домены!

# Создание каталогов
sudo mkdir -p /var/lib/rostechnopoisk/database /var/log/rostechnopoisk /var/backups/rostechnopoisk
sudo chown -R $USER:$USER /var/{lib,log,backups}/rostechnopoisk

# Установка зависимостей
npm install && cd backend && npm install && cd ..
```

### 3. Инициализация БД (1 минута)

```bash
NODE_ENV=production node scripts/init-production-db.js
```

### 4. Настройка Nginx (2 минуты)

```bash
# Создание конфигурации
sudo tee /etc/nginx/sites-available/rostechnopoisk << 'EOF'
server {
    listen 80;
    server_name xn--e1aggkdcahelgf4b.xn--p1ai ростехнопоиск.рф;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Активация
sudo ln -s /etc/nginx/sites-available/rostechnopoisk /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 5. Запуск приложения (1 минута)

```bash
# Обновление PM2 конфигурации
sed -i "s|/path/to/your/project|$(pwd)|g" ecosystem.config.example.js
cp ecosystem.config.example.js ecosystem.config.js

# Запуск
NODE_ENV=production pm2 start ecosystem.config.js
pm2 save && pm2 startup
```

### 6. SSL сертификат (3 минуты)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ростехнопоиск.рф -d xn--e1aggkdcahelgf4b.xn--p1ai --non-interactive --agree-tos -m admin@rostechnopolsk.ru
```

## ✅ Проверка

```bash
# Статус сервисов
pm2 status && sudo systemctl status nginx

# Проверка API
curl http://localhost:3001/api/health

# Проверка сайта
curl https://ростехнопоиск.рф/api/health
```

## 🔧 Автоматизированный скрипт

Создайте файл `auto-deploy.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Автоматический деплой РОСТЕХНОПОИСК"

# Проверка прав
if [[ $EUID -eq 0 ]]; then
   echo "Не запускайте этот скрипт от root!" 
   exit 1
fi

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Функция для вывода статуса
status() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# 1. Подготовка сервера
echo "📦 Установка зависимостей..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - || error "Не удалось добавить репозиторий Node.js"
sudo apt update && sudo apt install -y nodejs nginx git || error "Не удалось установить пакеты"
sudo npm install -g pm2 || error "Не удалось установить PM2"
status "Зависимости установлены"

# 2. Настройка проекта
echo "⚙️  Настройка проекта..."
npm install || error "Не удалось установить npm зависимости"
cd backend && npm install && cd .. || error "Не удалось установить backend зависимости"

# Автоматическая настройка окружения
node setup-env.js --env=production || error "Не удалось создать .env.production"

# Проверка SESSION_SECRET
if grep -q "CHANGE_THIS_TO_RANDOM_STRING" .env.production; then
    warning "ВНИМАНИЕ: Измените SESSION_SECRET в .env.production!"
    echo "Генерируем автоматически..."
    SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    sed -i "s/CHANGE_THIS_TO_RANDOM_STRING_IN_PRODUCTION_64_CHARS_MINIMUM/$SECRET/" .env.production
fi

status "Проект настроен"

# 3. Создание каталогов
echo "📁 Создание каталогов..."
sudo mkdir -p /var/lib/rostechnopoisk/database /var/log/rostechnopoisk /var/backups/rostechnopoisk
sudo chown -R $USER:$USER /var/{lib,log,backups}/rostechnopoisk
status "Каталоги созданы"

# 4. Инициализация БД
echo "🗄️  Инициализация базы данных..."
NODE_ENV=production node scripts/init-production-db.js || error "Ошибка инициализации БД"
status "База данных инициализирована"

# 5. Настройка Nginx
echo "🌐 Настройка Nginx..."
NGINX_CONFIG="/etc/nginx/sites-available/rostechnopoisk"
sudo tee "$NGINX_CONFIG" > /dev/null << 'EOF'
server {
    listen 80;
    server_name xn--e1aggkdcahelgf4b.xn--p1ai ростехнопоиск.рф www.ростехнопоиск.рф;
    
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
    }
    
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
    }
    
    # Безопасность
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
}
EOF

sudo ln -sf /etc/nginx/sites-available/rostechnopoisk /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx || error "Ошибка конфигурации Nginx"
status "Nginx настроен"

# 6. Настройка PM2
echo "🔄 Настройка PM2..."
sed -i "s|/path/to/your/project|$(pwd)|g" ecosystem.config.example.js
cp ecosystem.config.example.js ecosystem.config.js
status "PM2 настроен"

# 7. Запуск приложения
echo "🚀 Запуск приложения..."
NODE_ENV=production pm2 start ecosystem.config.js || error "Не удалось запустить приложение"
pm2 save
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
status "Приложение запущено"

# 8. Финальная проверка
echo "🔍 Проверка..."
sleep 5

# Проверка статуса PM2
if ! pm2 status | grep -q "online"; then
    error "Приложение не запустилось"
fi

# Проверка API
if ! curl -s http://localhost:3001/api/health > /dev/null; then
    error "API недоступен"
fi

# Проверка фронтенда
if ! curl -s http://localhost:3000 > /dev/null; then
    error "Фронтенд недоступен"
fi

status "Все проверки пройдены!"

# 9. Вывод информации
echo ""
echo "🎉 ДЕПЛОЙ ЗАВЕРШЕН УСПЕШНО!"
echo ""
echo "📋 Информация:"
echo "   • Проект: $(pwd)"
echo "   • API: http://localhost:3001/api/health"
echo "   • Фронтенд: http://localhost:3000"
echo "   • Логи: pm2 logs"
echo "   • Статус: pm2 status"
echo ""
echo "🔧 Следующие шаги:"
echo "   1. Настройте DNS для домена ростехнопоиск.рф"
echo "   2. Получите SSL сертификат:"
echo "      sudo apt install certbot python3-certbot-nginx"
echo "      sudo certbot --nginx -d ростехнопоиск.рф -d xn--e1aggkdcahelgf4b.xn--p1ai"
echo "   3. Настройте резервное копирование:"
echo "      crontab -e"
echo "      # 0 2 * * * /usr/local/bin/backup-rostechnopoisk"
echo ""
echo "📊 Мониторинг:"
echo "   • pm2 monit                    # PM2 мониторинг"
echo "   • tail -f /var/log/rostechnopoisk/backend-combined.log"
echo "   • tail -f /var/log/rostechnopoisk/frontend-combined.log"
echo ""

# 10. Предложение SSL
read -p "Хотите настроить SSL сертификат сейчас? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📜 Установка SSL сертификата..."
    sudo apt install -y certbot python3-certbot-nginx
    read -p "Введите email для уведомлений: " EMAIL
    if [[ -n "$EMAIL" ]]; then
        sudo certbot --nginx -d ростехнопоиск.рф -d xn--e1aggkdcahelgf4b.xn--p1ai --non-interactive --agree-tos -m "$EMAIL"
        status "SSL сертификат установлен!"
        echo "🔒 Сайт доступен по HTTPS: https://ростехнопоиск.рф"
    else
        warning "Email не указан, SSL не настроен"
    fi
fi

echo ""
echo "✨ Готово! РОСТЕХНОПОИСК успешно развернут!"
```

Запуск автоматического деплоя:

```bash
chmod +x auto-deploy.sh
./auto-deploy.sh
```

## 📝 Примечания

- **Время деплоя**: 10-15 минут
- **Требования**: Ubuntu 18.04+ / Debian 10+, права sudo
- **Домен**: Настройте DNS для ростехнопоиск.рф → IP сервера
- **SSL**: Автоматически через Certbot
- **Мониторинг**: PM2 + системные логи

## 🆘 Экстренное восстановление

```bash
# Остановка всех сервисов
pm2 stop all && sudo systemctl stop nginx

# Откат к последней рабочей версии
git checkout HEAD~1

# Восстановление БД из бэкапа
cp /var/backups/rostechnopoisk/$(ls -t /var/backups/rostechnopoisk/*.db | head -1) /var/lib/rostechnopoisk/database/rostechnopolsk.db

# Запуск
pm2 start all && sudo systemctl start nginx
```
