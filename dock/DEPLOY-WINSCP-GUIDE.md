# 🚀 ПОЛНАЯ ИНСТРУКЦИЯ ПО ДЕПЛОЮ РОСТЕХНОПОИСК ЧЕРЕЗ WinSCP

## 📋 НЕОБХОДИМЫЕ ИЗМЕНЕНИЯ ПЕРЕМЕННЫХ ОКРУЖЕНИЯ

### Обязательные изменения для вашего домена:

1. **В `.env.local`:**
   ```env
   SESSION_SECRET=СГЕНЕРИРУЙТЕ_СИЛЬНЫЙ_КЛЮЧ_СЛУЧАЙНЫЙ_64_СИМВОЛА
   TELEGRAM_WEBHOOK_URL=https://xn--e1aggkdcahelgf4b.xn--p1ai/api/telegram/webhook
   ```

2. **CORS уже настроен для:**
   - `https://xn--e1aggkdcahelgf4b.xn--p1ai`
   - `https://ростехнопоиск.рф`
   - `http://xn--e1aggkdcahelgf4b.xn--p1ai`
   - `http://ростехнопоиск.рф`

3. **API_BASE_URL во frontend автоматически определяется:**
   - Локально: `http://localhost:3001/api`
   - На сервере: `/api` (через Nginx)

---

## 🛠️ ПОШАГОВАЯ ИНСТРУКЦИЯ ПО ДЕПЛОЮ

### ШАГ 1: ПОДГОТОВКА НА ЛОКАЛЬНОЙ МАШИНЕ

1. **Откройте PowerShell в папке проекта:**
   ```powershell
   cd D:\Project\Despair
   ```

2. **Запустите подготовку production версии:**
   ```powershell
   node prepare-production.js
   ```
   
   **Результат:** Создастся папка `production-ready/` с готовыми файлами.

3. **Создайте ZIP архив для удобной загрузки:**
   ```powershell
   # Через PowerShell
   Compress-Archive -Path "production-ready\*" -DestinationPath "rostechnopolsk-production.zip"
   ```
   
   **Альтернативно:** Через WinRAR/7-Zip создайте архив `rostechnopolsk-production.zip` из содержимого папки `production-ready/`.

---

### ШАГ 2: ПОДКЛЮЧЕНИЕ К СЕРВЕРУ ЧЕРЕЗ WinSCP

1. **Запустите WinSCP**

2. **Настройте подключение:**
   - **Протокол:** SFTP или SCP
   - **Хост:** IP адрес вашего сервера
   - **Порт:** 22 (или ваш SSH порт)
   - **Имя пользователя:** ваш SSH пользователь
   - **Пароль:** ваш SSH пароль (или используйте ключи)

3. **Подключитесь к серверу**

---

### ШАГ 3: ПОДГОТОВКА ПАПКИ НА СЕРВЕРЕ

1. **В WinSCP перейдите в папку деплоя:**
   ```
   /var/www/  # Для веб-серверов
   ```
   **Или создайте домашнюю папку:**
   ```
   /home/ваш-пользователь/
   ```

2. **Создайте папку проекта:**
   - Правый клик → "Создать папку"
   - Название: `rostechnopolsk`

3. **Войдите в созданную папку:**
   ```
   /var/www/rostechnopolsk/
   ```

---

### ШАГ 4: ЗАГРУЗКА ФАЙЛОВ ЧЕРЕЗ WinSCP

1. **Загрузите ZIP архив:**
   - В левой панели (локальная машина) найдите `rostechnopolsk-production.zip`
   - Перетащите файл в правую панель (сервер) в папку `/var/www/rostechnopolsk/`

2. **Распакуйте архив на сервере:**
   - Правый клик на загруженном ZIP файле
   - Выберите "Выполнить команду" или откройте встроенный терминал (Ctrl+T)
   
   **Команды в терминале WinSCP:**
   ```bash
   cd /var/www/rostechnopolsk
   unzip rostechnopolsk-production.zip
   rm rostechnopolsk-production.zip
   ls -la  # Проверить содержимое
   ```

**Ожидаемая структура на сервере:**
```
/var/www/rostechnopolsk/
├── index.html
├── app.js
├── style.css
├── notifications.js
├── validation.js
├── frontend-server.js
├── package.json
├── ecosystem.config.js
├── nginx.conf
├── Special_Equipment_Catalog.csv
└── backend/
    ├── package.json
    ├── config.env
    ├── server.js
    ├── database/
    ├── models/
    ├── routes/
    ├── services/
    ├── middleware/
    └── utils/
```

---

### ШАГ 5: НАСТРОЙКА КОНФИГУРАЦИЙ НА СЕРВЕРЕ

1. **Откройте терминал в WinSCP (Ctrl+T)**

2. **Перейдите в папку проекта:**
   ```bash
   cd /var/www/rostechnopolsk
   ```

3. **Сгенерируйте сильный SESSION_SECRET:**
   ```bash
   # Сгенерируйте случайный ключ
   openssl rand -hex 32
   ```
   Скопируйте полученный ключ.

4. **Отредактируйте конфигурацию:**
   ```bash
   nano backend/config.env
   ```
   
   **Измените строку:**
   ```env
   SESSION_SECRET=ВАШ_СГЕНЕРИРОВАННЫЙ_КЛЮЧ_ИЗ_ПРЕДЫДУЩЕГО_ШАГА
   ```
   
   **Сохранить:** Ctrl+X → Y → Enter

5. **Обновите пути в PM2 конфигурации:**
   ```bash
   nano ecosystem.config.js
   ```
   
   **Замените везде `/path/to/your/project` на:**
   ```javascript
   cwd: '/var/www/rostechnopolsk',
   ```
   
   **Сохранить:** Ctrl+X → Y → Enter

---

### ШАГ 6: УСТАНОВКА NODE.JS (ЕСЛИ НЕ УСТАНОВЛЕН)

1. **Проверьте версию Node.js:**
   ```bash
   node --version
   npm --version
   ```

2. **Если Node.js не установлен или версия < 14, установите:**

   **Ubuntu/Debian:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

   **CentOS/RHEL/AlmaLinux:**
   ```bash
   curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
   sudo yum install -y nodejs
   ```

3. **Проверьте установку:**
   ```bash
   node --version  # Должно быть >= 14.0.0
   npm --version   # Должно быть >= 6.0.0
   ```

---

### ШАГ 7: УСТАНОВКА ЗАВИСИМОСТЕЙ

1. **Установите backend зависимости:**
   ```bash
   cd /var/www/rostechnopolsk/backend
   npm install --production
   ```

2. **Проверьте установку критических пакетов:**
   ```bash
   npm list bcryptjs  # Должен быть установлен
   npm list express   # Должен быть установлен
   npm list sqlite3   # Должен быть установлен
   ```

3. **Вернитесь в корень проекта:**
   ```bash
   cd /var/www/rostechnopolsk
   ```

---

### ШАГ 8: ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ

1. **Запустите инициализацию БД:**
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

2. **Проверьте что БД создалась:**
   ```bash
   ls -la database/rostechnopolsk.db
   ```

---

### ШАГ 9: ТЕСТОВЫЙ ЗАПУСК

1. **Тест backend:**
   ```bash
   cd /var/www/rostechnopolsk/backend
   node server.js
   ```
   
   **Должно появиться:**
   ```
   🚀 Backend сервер РОСТЕХНОПОИСК запущен на порту 3001
   ✅ База данных подключена
   ⏰ Планировщик аукционов запущен
   ```

2. **В новом терминале проверьте API:**
   ```bash
   curl http://localhost:3001/api/health
   ```
   
   **Ожидаемый ответ:**
   ```json
   {"status":"ok","timestamp":"2024-12-19T..."}
   ```

3. **Остановите тест:** Ctrl+C в первом терминале

---

### ШАГ 10: УСТАНОВКА PM2 ДЛЯ ПРОДАКШЕНА

1. **Установите PM2 глобально:**
   ```bash
   sudo npm install -g pm2
   ```

2. **Создайте папку для логов:**
   ```bash
   cd /var/www/rostechnopolsk
   mkdir -p logs
   ```

3. **Запустите приложения через PM2:**
   ```bash
   pm2 start ecosystem.config.js
   ```

4. **Проверьте статус:**
   ```bash
   pm2 status
   ```
   
   **Должно показать:**
   ```
   ┌─────┬──────────────────────────┬─────────┬─────────┬─────────┬──────────┐
   │ id  │ name                     │ status  │ restart │ uptime  │ cpu      │
   ├─────┼──────────────────────────┼─────────┼─────────┼─────────┼──────────┤
   │ 0   │ rostechnopolsk-backend   │ online  │ 0       │ 5s      │ 0%       │
   │ 1   │ rostechnopolsk-frontend  │ online  │ 0       │ 5s      │ 0%       │
   └─────┴──────────────────────────┴─────────┴─────────┴─────────┴──────────┘
   ```

5. **Проверьте логи:**
   ```bash
   pm2 logs --lines 20
   ```

6. **Сохраните конфигурацию PM2:**
   ```bash
   pm2 save
   pm2 startup
   ```
   
   **Выполните команду, которую покажет `pm2 startup`**

---

### ШАГ 11: НАСТРОЙКА NGINX (РЕКОМЕНДУЕТСЯ)

1. **Установите Nginx:**

   **Ubuntu/Debian:**
   ```bash
   sudo apt update
   sudo apt install nginx
   ```

   **CentOS/RHEL:**
   ```bash
   sudo yum install nginx
   # или для новых версий:
   sudo dnf install nginx
   ```

2. **Скопируйте конфигурацию:**
   ```bash
   sudo cp /var/www/rostechnopolsk/nginx.conf /etc/nginx/sites-available/rostechnopolsk
   ```

3. **Активируйте сайт:**
   ```bash
   # Ubuntu/Debian
   sudo ln -s /etc/nginx/sites-available/rostechnopolsk /etc/nginx/sites-enabled/
   sudo rm /etc/nginx/sites-enabled/default
   
   # CentOS/RHEL
   sudo cp /var/www/rostechnopolsk/nginx.conf /etc/nginx/conf.d/rostechnopolsk.conf
   ```

4. **Проверьте конфигурацию:**
   ```bash
   sudo nginx -t
   ```

5. **Запустите Nginx:**
   ```bash
   sudo systemctl restart nginx
   sudo systemctl enable nginx
   ```

---

### ШАГ 12: НАСТРОЙКА FIREWALL

1. **Ubuntu/Debian (UFW):**
   ```bash
   sudo ufw allow 22     # SSH
   sudo ufw allow 80     # HTTP
   sudo ufw allow 443    # HTTPS
   sudo ufw enable
   ```

2. **CentOS/RHEL (firewalld):**
   ```bash
   sudo firewall-cmd --add-port=22/tcp --permanent    # SSH
   sudo firewall-cmd --add-port=80/tcp --permanent    # HTTP
   sudo firewall-cmd --add-port=443/tcp --permanent   # HTTPS
   sudo firewall-cmd --reload
   ```

---

### ШАГ 13: НАСТРОЙКА SSL СЕРТИФИКАТА (РЕКОМЕНДУЕТСЯ)

1. **Установите Certbot:**
   ```bash
   sudo snap install --classic certbot
   # или через пакетный менеджер:
   # sudo apt install certbot python3-certbot-nginx  # Ubuntu/Debian
   ```

2. **Получите SSL сертификат:**
   ```bash
   sudo certbot --nginx -d xn--e1aggkdcahelgf4b.xn--p1ai -d ростехнопоиск.рф
   ```

3. **Настройте автообновление:**
   ```bash
   sudo crontab -e
   ```
   
   **Добавьте строку:**
   ```cron
   0 12 * * * /usr/bin/certbot renew --quiet
   ```

---

### ШАГ 14: ФИНАЛЬНАЯ ПРОВЕРКА

1. **Проверьте статусы всех сервисов:**
   ```bash
   # PM2 приложения
   pm2 status
   
   # Nginx
   sudo systemctl status nginx
   
   # Логи
   pm2 logs --lines 10
   ```

2. **Проверьте API:**
   ```bash
   # Локально на сервере
   curl http://localhost:3001/api/health
   curl http://localhost:3000/
   
   # Через домен (если настроен Nginx)
   curl http://xn--e1aggkdcahelgf4b.xn--p1ai/api/health
   curl -I http://xn--e1aggkdcahelgf4b.xn--p1ai/
   ```

3. **Проверьте в браузере:**
   - **Прямой доступ:** `http://IP-СЕРВЕРА:3000`
   - **Через Nginx:** `http://xn--e1aggkdcahelgf4b.xn--p1ai`
   - **С SSL:** `https://xn--e1aggkdcahelgf4b.xn--p1ai`

---

## 🔑 ТЕСТОВЫЕ АККАУНТЫ

После успешного деплоя используйте эти аккаунты для проверки:

- **Администратор:** `admin` / `admin123`
- **Менеджер:** `manager123` / `manager123`
- **Владелец техники:** `owner123` / `owner123`

---

## 🛠️ КОМАНДЫ УПРАВЛЕНИЯ

### Управление PM2:
```bash
pm2 restart all          # Перезапуск всех приложений
pm2 stop all            # Остановка всех приложений
pm2 start all           # Запуск всех приложений
pm2 reload all          # Плавный перезапуск (zero-downtime)
pm2 logs               # Просмотр логов в реальном времени
pm2 logs --lines 50    # Последние 50 строк логов
pm2 monit              # Мониторинг ресурсов
```

### Управление Nginx:
```bash
sudo systemctl status nginx     # Статус
sudo systemctl restart nginx    # Перезапуск
sudo systemctl reload nginx     # Перезагрузка конфигурации
sudo nginx -t                   # Проверка конфигурации
```

### При обновлении кода:
```bash
# 1. Подготовьте новую версию локально
node prepare-production.js

# 2. Загрузите через WinSCP новые файлы
# 3. На сервере:
cd /var/www/rostechnopolsk
pm2 reload all                  # Перезапуск приложений
```

---

## 🔍 ДИАГНОСТИКА ПРОБЛЕМ

### Приложение не запускается:
```bash
pm2 logs                        # Смотрим логи
cat backend/config.env          # Проверяем конфигурацию
cd backend && npm list          # Проверяем зависимости
```

### API недоступен:
```bash
pm2 status                      # Статус приложений
netstat -tlnp | grep :3001     # Проверяем порт
pm2 logs rostechnopolsk-backend # Логи backend
```

### Frontend недоступен:
```bash
# С Nginx:
sudo nginx -t
sudo systemctl status nginx

# Без Nginx:
pm2 logs rostechnopolsk-frontend
netstat -tlnp | grep :3000
```

### CORS ошибки:
```bash
# Проверьте что домен правильно настроен в backend/server.js
grep -A 10 "cors(" backend/server.js

# Проверьте что NODE_ENV=production
pm2 show rostechnopolsk-backend
```

---

## 📊 МОНИТОРИНГ

### Логи:
```bash
# PM2 логи
pm2 logs

# Системные логи приложения
tail -f /var/www/rostechnopolsk/logs/backend-combined.log

# Nginx логи
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Ресурсы:
```bash
# Память и CPU
pm2 monit

# Дисковое пространство
df -h

# Открытые порты
netstat -tlnp | grep -E ':(3000|3001|80|443)'
```

---

## ✅ ГОТОВО!

**🎉 Ваш проект РОСТЕХНОПОИСК успешно развернут!**

**🌐 Доступ к системе:**
- **Frontend:** `https://xn--e1aggkdcahelgf4b.xn--p1ai`
- **API:** `https://xn--e1aggkdcahelgf4b.xn--p1ai/api`

**📱 Проверьте что работает:**
- ✅ Регистрация и авторизация
- ✅ Создание заявок на аренду
- ✅ Подача предложений
- ✅ Аукционы
- ✅ Уведомления

**🔄 Для обновлений:**
1. Запустите `node prepare-production.js` локально
2. Загрузите новые файлы через WinSCP
3. Выполните `pm2 reload all` на сервере

**📞 При проблемах:**
1. Проверьте логи: `pm2 logs`
2. Проверьте статус: `pm2 status`
3. Проверьте конфигурацию: `cat backend/config.env`
