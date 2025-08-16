# 📋 ИНСТРУКЦИИ ПО СБОРКЕ И ЗАПУСКУ

## 🚀 Быстрый старт

### Предварительные требования
- **Node.js** >= 14.0.0
- **npm** >= 6.0.0
- **Git** (для клонирования)

### 1. Подготовка проекта

```bash
# Клонировать репозиторий (если не локальный)
git clone <repository-url>
cd Despair

# Или просто перейти в папку проекта
cd Despair
```

### 2. Установка зависимостей и инициализация

```bash
# Установить зависимости бэкенда
npm run install-backend

# Инициализировать базу данных с демо-данными
npm run init-db

# Или выполнить полную настройку одной командой
npm run setup
```

### 3. Запуск проекта

#### 🚀 РЕКОМЕНДУЕМЫЙ СПОСОБ - Полный запуск (бэкенд + фронтенд)
```bash
npm run dev-full
```
Это запустит:
- **Бэкенд** на http://localhost:3001 (API)
- **Фронтенд** на http://localhost:3000 (веб-интерфейс)

#### Альтернативные способы запуска

**Только бэкенд (режим разработки):**
```bash
npm run dev
```

**Только фронтенд сервер:**
```bash
npm run frontend
```

**Продакшн режим (только бэкенд):**
```bash
npm start
```

### 4. Проверка работоспособности

#### Проверка API
```bash
# Из корневой папки
node test-api.js      # Базовые тесты API
node test-auth.js     # Тесты с авторизацией
```

#### Проверка фронтенда
1. **РЕКОМЕНДУЕТСЯ:** Откройте http://localhost:3000 в браузере (если запущен `npm run dev-full`)
2. **Альтернатива:** Откройте `index.html` напрямую (может потребовать дополнительная настройка CORS)
3. Используйте демо-данные для входа:
   - **admin123** - Администратор
   - **owner123** - Владелец техники  
   - **manager123** - Менеджер

---

## 🛠️ Детальные инструкции

### Структура проекта
```
Despair/
├── backend/                 # Серверная часть
│   ├── config.env          # Конфигурация
│   ├── database/           # База данных
│   │   ├── init.js        # Инициализация
│   │   ├── schema.sql     # Схема БД
│   │   └── rostechnopolsk.db
│   ├── models/            # Модели данных
│   ├── routes/            # API роуты
│   ├── middleware/        # Middleware
│   ├── services/          # Сервисы
│   └── server.js          # Главный файл сервера
├── frontend/              # Клиентская часть
├── index.html            # Главная страница
├── app.js               # Логика фронтенда
├── style.css           # Стили
└── package.json        # Корневой package.json
```

### Конфигурация

#### backend/.env.local (или .env.development/.env.production)
```bash
PORT=3001                      # Порт сервера
SESSION_SECRET=supersecretkey  # Ключ для сессий
AUCTION_DURATION_HOURS=24     # Длительность аукциона в часах
NODE_ENV=development          # Окружение: local/development/production
```

### Команды npm

| Команда | Описание |
|---------|----------|
| `npm run dev-full` | 🚀 **Полный запуск (бэкенд + фронтенд)** |
| `npm run dev` | Запуск только бэкенда в режиме разработки |
| `npm run frontend` | Запуск только фронтенд сервера |
| `npm start` | Запуск в продакшн режиме |
| `npm run install-backend` | Установка зависимостей бэкенда |
| `npm run init-db` | Инициализация базы данных |
| `npm run setup` | Полная настройка проекта |
| `npm run check` | Проверка состояния системы |

### База данных

#### Инициализация
```bash
cd backend
npm run init-db
```

#### Сброс базы данных
```bash
# Удалить существующую БД и создать заново
cd backend
rm database/rostechnopolsk.db
npm run init-db
```

#### Демо-данные

**Компании:**
- ТехноСтрой ООО (владельцы)
- СтройМастер (менеджеры)
- МегаСтрой Холдинг (менеджеры)
- Техника-Сервис (владельцы)

**Пользователи:**
- `admin123` - Системный администратор
- `owner123` - Иванов И.И. (ТехноСтрой)
- `manager123` - Сидоров С.С. (СтройМастер)

**Техника:**
- Экскаватор Caterpillar 320D
- Автокран Liebherr 50т
- Самосвал КАМАЗ 6520

---

## 🧪 Тестирование

### API тесты
```bash
# Базовые тесты (без авторизации)
node test-api.js

# Тесты с авторизацией
node test-auth.js
```

### Функциональные тесты

#### 1. Тест авторизации
1. Откройте `index.html`
2. Введите `admin123` и нажмите "Войти"
3. Должна открыться панель администратора

#### 2. Тест создания заявки
1. Войдите как `manager123`
2. Нажмите "Создать заявку"
3. Заполните форму и отправьте
4. Заявка должна появиться в списке

#### 3. Тест подачи ставки
1. Войдите как `owner123`
2. Найдите активную заявку
3. Нажмите "Подать ставку"
4. Заполните ставку и отправьте

### Мануальное тестирование API

#### Через curl (Linux/Mac):
```bash
# Логин
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"admin123"}' \
  -c cookies.txt

# Получение данных
curl -X GET http://localhost:3001/api/companies \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

#### Через PowerShell (Windows):
```powershell
# Логин
$response = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" `
  -Method Post -Body '{"password":"admin123"}' `
  -ContentType "application/json" -SessionVariable session

# Получение данных
Invoke-RestMethod -Uri "http://localhost:3001/api/companies" `
  -Method Get -WebSession $session
```

---

## 🚨 Устранение неполадок

### Проблема: Сервер не запускается

**Симптом:** `EADDRINUSE: address already in use :::3001`

**Решение:**
```bash
# Windows
netstat -ano | findstr :3001
taskkill /F /PID <PID>

# Linux/Mac
lsof -ti:3001 | xargs kill -9
```

### Проблема: База данных не инициализируется

**Симптом:** `SQLITE_CONSTRAINT: UNIQUE constraint failed`

**Решение:**
```bash
cd backend
rm database/rostechnopolsk.db
npm run init-db
```

### Проблема: API возвращает 404

**Проверить:**
1. Сервер запущен: `http://localhost:3001/api/health`
2. Правильный URL: `/api/` префикс
3. Сессия активна для защищенных роутов

### Проблема: CORS ошибка "Failed to fetch"

**Симптом:** `Access to fetch at 'http://localhost:3001/api/auth/login' from origin 'null' has been blocked by CORS policy`

**Решение:**
```bash
# Используйте локальный веб-сервер вместо file://
npm run dev-full

# Затем откройте http://localhost:3000 в браузере
```

### Проблема: Фронтенд не подключается к API

**Проверить:**
1. CORS настроен в `server.js`
2. API_BASE_URL в `app.js` указывает на правильный адрес
3. Сервер запущен на порту 3001
4. Фронтенд открыт через http://localhost:3000, а не file://

### Проблема: npm команды не работают

**Проверить:**
1. Находитесь в корневой папке проекта
2. Файл `package.json` существует
3. Node.js и npm установлены

---

## 🔧 Конфигурация для продакшн

### 1. Переменные окружения
```bash
# backend/.env.production (создается автоматически)
PORT=3001
SESSION_SECRET=STRONG_RANDOM_SECRET_HERE
AUCTION_DURATION_HOURS=24
NODE_ENV=production

# Запуск с указанием окружения:
NODE_ENV=production npm start
```

### 2. Безопасность
- Изменить `SESSION_SECRET` на сложный случайный ключ
- Настроить HTTPS
- Настроить reverse proxy (nginx)
- Ограничить CORS для конкретных доменов

### 3. База данных
- Для продакшн рекомендуется PostgreSQL
- Обновить `DATABASE_URL` в конфигурации
- Настроить резервное копирование

### 4. Мониторинг
- Добавить логирование (winston)
- Настроить мониторинг (PM2)
- Добавить health checks

---

## 📚 Дополнительная информация

### API Endpoints
- `GET /api/health` - Проверка работоспособности
- `POST /api/auth/login` - Авторизация
- `GET /api/equipment/equipment-types` - Типы техники (без авторизации)
- Полный список в `README.md`

### Архитектура
- **Backend:** Node.js + Express + SQLite
- **Frontend:** Vanilla JS + HTML + CSS
- **Database:** SQLite (легко мигрировать на PostgreSQL)
- **Auth:** Session-based authentication

### Следующие шаги
1. Добавить Telegram бот интеграцию
2. Реализовать файловые загрузки
3. Добавить email уведомления
4. Создать мобильное приложение
5. Добавить аналитику и отчеты
