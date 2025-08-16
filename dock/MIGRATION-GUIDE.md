# 🗄️ РУКОВОДСТВО ПО МИГРАЦИЯМ БАЗЫ ДАННЫХ

## 📋 **Обзор системы**

Система миграций автоматически отслеживает изменения схемы базы данных и применяет их в правильном порядке. Каждая миграция выполняется только один раз и записывается в таблицу `schema_migrations`.

---

## 🚀 **Основные команды**

### **Локальная разработка:**
```bash
# Выполнить все новые миграции
npm run migrate

# Посмотреть статус миграций  
npm run migrate:status

# Создать новую миграцию
npm run migrate:create "Название миграции"
```

### **Продакшн:**
```bash
# Выполнить миграции на проде
NODE_ENV=production npm run migrate

# Статус миграций на проде
NODE_ENV=production npm run migrate:status
```

---

## 📁 **Структура миграций**

```
backend/database/migrations/
├── 001_equipment_types.sql          # Существующая миграция
├── 20250115120000_add_user_roles.sql # Новая миграция  
└── 20250115130000_update_prices.sql  # Еще одна новая
```

### **Формат файлов миграций:**
- **Имя файла:** `YYYYMMDDHHMMSS_описание.sql`
- **Содержимое:** SQL команды с комментариями
- **Кодировка:** UTF-8

---

## ✏️ **Создание новых миграций**

### **1. Создать файл миграции:**
```bash
npm run migrate:create "Add telegram notifications table"
```

### **2. Заполнить созданный файл:**
```sql
-- Миграция: Add telegram notifications table
-- Дата: 2025-01-15
-- Описание: Добавляет таблицу для хранения настроек Telegram уведомлений

-- Добавьте SQL команды ниже:
CREATE TABLE telegram_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  telegram_id VARCHAR(50),
  notifications_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_telegram_user_id ON telegram_settings(user_id);
```

### **3. Применить миграцию:**
```bash
npm run migrate
```

---

## 🔄 **Рабочий процесс**

### **В разработке:**
1. Вносишь изменения в схему → создаешь миграцию
2. Тестируешь локально: `npm run migrate`
3. Коммитишь файл миграции в git
4. На проде: автоматически применяется через деплой

### **При деплое на прод:**
1. Код попадает на сервер
2. PM2 перезапускает приложение  
3. При старте сервера автоматически запускаются миграции
4. Новые миграции применяются, старые пропускаются

---

## 📊 **Отслеживание выполненных миграций**

Система ведет таблицу `schema_migrations`:
```sql
CREATE TABLE schema_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version VARCHAR(255) NOT NULL UNIQUE,     -- Имя файла миграции
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  execution_time_ms INTEGER,                -- Время выполнения
  environment VARCHAR(50) DEFAULT 'development'  -- local/development/production
);
```

### **Просмотр статуса:**
```bash
npm run migrate:status

# Вывод:
📊 СТАТУС МИГРАЦИЙ:
==================
✅ Выполнена 001_equipment_types
✅ Выполнена 20250115120000_add_user_roles  
⏳ Ожидает 20250115130000_update_prices

📈 Статистика: 2 выполнено, 1 ожидает
```

---

## 🛡️ **Безопасность и откат**

### **Правила написания миграций:**
1. **Только ДОБАВЛЯЮЩИЕ изменения** (новые таблицы, колонки, индексы)
2. **НЕ удалять данные** без резервного копирования
3. **Тестировать на копии продакшн данных**
4. **Использовать IF NOT EXISTS** для создания таблиц

### **Пример безопасной миграции:**
```sql
-- ✅ ХОРОШО - добавляет новую колонку
ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255) DEFAULT NULL;

-- ✅ ХОРОШО - создает таблицу с проверкой  
CREATE TABLE IF NOT EXISTS user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  session_token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ❌ ПЛОХО - удаляет данные
-- DROP TABLE old_table;

-- ❌ ПЛОХО - может сломать существующий код
-- ALTER TABLE users DROP COLUMN phone;
```

### **Откат миграций:**
В текущей системе автоматического отката нет. При критической ошибке:
1. Восстановить из резервной копии базы
2. Зафиксить проблемную миграцию 
3. Создать новую корректирующую миграцию

---

## 🔧 **Настройка окружений**

Система автоматически определяет окружение из `NODE_ENV`:

### **Локальная разработка:**
```bash
NODE_ENV=local npm run migrate
# Использует: .env.local
# База: ./database/rostechnopolsk.db
```

### **Продакшн:**
```bash
NODE_ENV=production npm run migrate  
# Использует: .env.production
# База: абсолютный путь из DB_PATH
```

---

## 🚨 **Устранение проблем**

### **Миграция не применяется:**
```bash
# Проверить статус
npm run migrate:status

# Проверить логи
tail -f backend/logs/combined.log

# Проверить права доступа к файлу базы
ls -la backend/database/
```

### **Ошибка выполнения миграции:**
1. Проверить синтаксис SQL в файле миграции
2. Убедиться что все зависимые таблицы существуют
3. Проверить что миграция не была выполнена частично

### **База "заблокирована":**
```bash
# Найти процессы использующие базу
lsof backend/database/rostechnopolsk.db

# Перезапустить сервер
pm2 restart rostechnopolsk
```

---

## 📋 **Чек-лист для новых миграций**

- [ ] Файл миграции создан через `npm run migrate:create`
- [ ] SQL синтаксис проверен
- [ ] Используются безопасные операции (ADD COLUMN, CREATE TABLE IF NOT EXISTS)
- [ ] Нет операций удаления данных без резервного копирования
- [ ] Протестировано локально
- [ ] Файл закоммичен в git
- [ ] Проверен статус после применения: `npm run migrate:status`

---

## 🎯 **Итог: автоматическая синхронизация схемы**

✅ **В деве добавил колонку** → создал миграцию → закоммитил  
✅ **На проде деплой** → миграция автоматически применилась  
✅ **Схема синхронизирована** между всеми окружениями  
✅ **История изменений** сохранена в `schema_migrations`  

**Больше никаких ручных SQL команд на продакшне!** 🎉
