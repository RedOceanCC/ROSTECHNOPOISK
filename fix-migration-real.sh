#!/bin/bash

# Реальное исправление проблемы с таблицей request_declines
# Выполните на сервере: bash fix-migration-real.sh

set -e

echo "🔧 РЕАЛЬНОЕ исправление проблемы с таблицей request_declines..."
echo "=============================================================="

# Проверяем, что мы в правильной директории
if [ ! -f "backend/server.js" ]; then
    echo "❌ Ошибка: запустите скрипт из корневой директории проекта"
    exit 1
fi

# Определяем путь к базе данных
if [ -f "/var/lib/rostechnopoisk/database/rostechnopolsk.db" ]; then
    DB_PATH="/var/lib/rostechnopoisk/database/rostechnopolsk.db"
elif [ -f "backend/database/rostechnopolsk.db" ]; then
    DB_PATH="backend/database/rostechnopolsk.db"
else
    echo "❌ База данных не найдена"
    exit 1
fi

echo "📊 Используем базу данных: $DB_PATH"

# Останавливаем сервис
echo "🛑 Остановка сервиса..."
pm2 stop rostechnopolsk-backend 2>/dev/null || echo "Сервис уже остановлен"

# Создаем резервную копию
BACKUP_PATH="${DB_PATH}.backup.$(date +%Y%m%d_%H%M%S)"
echo "💾 Создание резервной копии: $BACKUP_PATH"
cp "$DB_PATH" "$BACKUP_PATH"

# Проверяем реальное состояние таблицы
echo "🔍 Проверка существования таблицы request_declines..."
TABLE_EXISTS=$(sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name='request_declines';" || echo "")

if [ -z "$TABLE_EXISTS" ]; then
    echo "❌ Таблица request_declines НЕ существует (несмотря на запись в миграциях)"
    
    # Удаляем неправильные записи о миграциях
    echo "🧹 Удаление неправильных записей миграций..."
    sqlite3 "$DB_PATH" "DELETE FROM schema_migrations WHERE version LIKE '%request_declines%';" 2>/dev/null || echo "Записи не найдены"
    
    # Создаем таблицу напрямую
    echo "🔨 Принудительное создание таблицы request_declines..."
    sqlite3 "$DB_PATH" "
    CREATE TABLE IF NOT EXISTS request_declines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      owner_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (request_id) REFERENCES rental_requests(id) ON DELETE CASCADE,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );
    "
    
    # Создаем индексы
    echo "📋 Создание индексов..."
    sqlite3 "$DB_PATH" "
    CREATE INDEX IF NOT EXISTS idx_request_declines_request ON request_declines(request_id);
    CREATE INDEX IF NOT EXISTS idx_request_declines_owner ON request_declines(owner_id);
    CREATE INDEX IF NOT EXISTS idx_request_declines_created ON request_declines(created_at);
    "
    
    # Регистрируем миграции как выполненные
    echo "📝 Регистрация миграций..."
    sqlite3 "$DB_PATH" "
    INSERT OR IGNORE INTO schema_migrations (version, execution_time_ms, environment) 
    VALUES ('20250120180100_create_request_declines_table', 1, 'production');
    INSERT OR IGNORE INTO schema_migrations (version, execution_time_ms, environment) 
    VALUES ('20250120180200_create_request_declines_indexes', 1, 'production');
    "
    
else
    echo "✅ Таблица request_declines уже существует"
    
    # Проверяем индексы
    echo "🔍 Проверка индексов..."
    INDEXES=$(sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='request_declines';" | wc -l)
    
    if [ "$INDEXES" -lt 3 ]; then
        echo "📋 Создание недостающих индексов..."
        sqlite3 "$DB_PATH" "
        CREATE INDEX IF NOT EXISTS idx_request_declines_request ON request_declines(request_id);
        CREATE INDEX IF NOT EXISTS idx_request_declines_owner ON request_declines(owner_id);
        CREATE INDEX IF NOT EXISTS idx_request_declines_created ON request_declines(created_at);
        "
        
        # Регистрируем миграцию индексов
        sqlite3 "$DB_PATH" "
        INSERT OR IGNORE INTO schema_migrations (version, execution_time_ms, environment) 
        VALUES ('20250120180200_create_request_declines_indexes', 1, 'production');
        "
    fi
fi

# Проверяем результат
echo "✅ Проверка финального состояния..."
echo "📊 Структура таблицы request_declines:"
sqlite3 "$DB_PATH" ".schema request_declines"

echo ""
echo "📋 Индексы таблицы:"
sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='request_declines';"

echo ""
echo "📈 Статус миграций:"
cd backend
node database/migrate.js status

# Запускаем сервис
echo ""
echo "🚀 Запуск сервиса..."
cd ..
pm2 start ecosystem.config.js

# Проверяем статус
echo "📊 Статус сервиса:"
sleep 3
pm2 status

# Проверяем логи
echo ""
echo "📝 Последние логи сервиса:"
pm2 logs rostechnopolsk-backend --lines 10

echo ""
echo "🎉 ИСПРАВЛЕНИЕ ЗАВЕРШЕНО!"
echo "========================"
echo "✅ Таблица request_declines создана"
echo "✅ Индексы созданы"
echo "✅ Миграции зарегистрированы"
echo "✅ Сервис запущен"
echo ""
echo "💾 Резервная копия: $BACKUP_PATH"
echo ""
echo "🔍 Для проверки работоспособности:"
echo "   pm2 logs rostechnopolsk-backend -f"
