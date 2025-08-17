#!/bin/bash

# Скрипт для диагностики состояния базы данных
# Выполните: bash check-db-state.sh

echo "🔍 ДИАГНОСТИКА БАЗЫ ДАННЫХ"
echo "=========================="

# Определяем путь к базе данных
if [ -f "/var/lib/rostechnopoisk/database/rostechnopolsk.db" ]; then
    DB_PATH="/var/lib/rostechnopoisk/database/rostechnopolsk.db"
elif [ -f "backend/database/rostechnopolsk.db" ]; then
    DB_PATH="backend/database/rostechnopolsk.db"
else
    echo "❌ База данных не найдена"
    exit 1
fi

echo "📊 База данных: $DB_PATH"
echo ""

# Проверяем существование таблицы request_declines
echo "🔍 Проверка таблицы request_declines:"
TABLE_EXISTS=$(sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name='request_declines';" 2>/dev/null || echo "")

if [ -z "$TABLE_EXISTS" ]; then
    echo "❌ Таблица request_declines НЕ СУЩЕСТВУЕТ"
else
    echo "✅ Таблица request_declines существует"
    
    # Показываем структуру
    echo ""
    echo "📋 Структура таблицы:"
    sqlite3 "$DB_PATH" ".schema request_declines"
    
    # Показываем индексы
    echo ""
    echo "📊 Индексы:"
    sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='request_declines';"
    
    # Количество записей
    echo ""
    echo "📈 Количество записей:"
    sqlite3 "$DB_PATH" "SELECT COUNT(*) as count FROM request_declines;"
fi

echo ""
echo "🔍 Проверка записей миграций:"
sqlite3 "$DB_PATH" "SELECT version, executed_at FROM schema_migrations WHERE version LIKE '%request_declines%' ORDER BY version;"

echo ""
echo "📊 Все таблицы в базе:"
sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"

echo ""
echo "🔍 Проверка типов уведомлений:"
sqlite3 "$DB_PATH" "SELECT DISTINCT type FROM notifications ORDER BY type;" 2>/dev/null || echo "Таблица notifications не найдена"
