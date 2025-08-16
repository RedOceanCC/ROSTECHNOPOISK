# Шаблоны конфигураций - РОСТЕХНОПОИСК

Этот каталог содержит шаблоны файлов конфигурации для различных сред.

## 📋 Инструкция по настройке

### 1. Локальная разработка

```bash
# Скопируйте шаблон
cp config-templates/env.local.template .env.local

# Отредактируйте файл (при необходимости)
nano .env.local
```

### 2. Среда разработки

```bash
# Скопируйте шаблон
cp config-templates/env.development.template .env.development

# Отредактируйте файл
nano .env.development
```

### 3. Продакшн (ВАЖНО!)

```bash
# Скопируйте шаблон
cp config-templates/env.production.template .env.production

# ОБЯЗАТЕЛЬНО измените параметры:
nano .env.production
```

**⚠️ КРИТИЧНО для продакшена:**
- `SESSION_SECRET` - должен быть случайной строкой минимум 64 символа
- `CORS_ORIGINS` - укажите ваши реальные домены
- `DB_PATH` - проверьте права доступа к каталогу
- `LOG_FILE` - убедитесь, что каталог для логов существует

## 🔐 Генерация безопасного SESSION_SECRET

```bash
# В Linux/Mac:
openssl rand -hex 32

# В Windows PowerShell:
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])

# В Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 📁 Структура переменных

### Основные
- `NODE_ENV` - окружение (local/development/production)
- `PORT` - порт backend сервера
- `DB_PATH` - путь к файлу базы данных SQLite

### Безопасность
- `SESSION_SECRET` - секретный ключ для сессий
- `CORS_ORIGINS` - разрешенные домены для CORS

### Логирование
- `LOG_LEVEL` - уровень логирования (debug/info/warn/error)
- `LOG_FILE` - путь к файлу логов

### Интеграции
- `TELEGRAM_BOT_TOKEN` - токен Telegram бота (опционально)
- `TELEGRAM_WEBHOOK_URL` - URL webhook для Telegram

## 🚀 Автоматическая настройка

Используйте скрипт `setup-env.js` для автоматической настройки:

```bash
node setup-env.js --env=local
node setup-env.js --env=production
```

## 📋 Проверка конфигурации

```bash
# Проверить, какие переменные загружены
node -e "require('dotenv').config({path: '.env.production'}); console.log(process.env.NODE_ENV, process.env.DB_PATH)"
```
