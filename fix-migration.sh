#!/bin/bash

# Скрипт для исправления проблемы с миграцией request_declines
# Выполните на сервере: bash fix-migration.sh

set -e  # Остановка при первой ошибке

echo "🔧 Исправление проблемы с миграцией request_declines..."
echo "=================================================="

# Проверяем, что мы в правильной директории
if [ ! -f "backend/server.js" ]; then
    echo "❌ Ошибка: запустите скрипт из корневой директории проекта"
    echo "Пример: cd /root/ROSTECHNOPOISK && bash fix-migration.sh"
    exit 1
fi

# Останавливаем сервис
echo "🛑 Остановка сервиса..."
pm2 stop rostechnopolsk-backend 2>/dev/null || echo "Сервис уже остановлен"

# Создаем резервную копию
DB_PATH="/var/lib/rostechnopoisk/database/rostechnopolsk.db"
BACKUP_PATH="${DB_PATH}.backup.$(date +%Y%m%d_%H%M%S)"

echo "💾 Создание резервной копии базы данных..."
if [ -f "$DB_PATH" ]; then
    cp "$DB_PATH" "$BACKUP_PATH"
    echo "✅ Резервная копия создана: $BACKUP_PATH"
else
    echo "❌ База данных не найдена: $DB_PATH"
    exit 1
fi

# Удаляем запись о неудачной миграции
echo "🧹 Очистка неудачной миграции..."
sqlite3 "$DB_PATH" "DELETE FROM schema_migrations WHERE version = '20250120180100_create_request_declines_table';" || echo "Запись уже отсутствует"

# Проверяем текущий статус
echo "📊 Проверка статуса миграций..."
cd backend
node database/migrate.js status

# Выполняем миграции
echo "🔄 Выполнение миграций..."
node database/migrate.js

# Проверяем результат
echo "✅ Проверка результата..."
sqlite3 "$DB_PATH" ".schema request_declines" | head -10

# Запускаем сервис
echo "🚀 Запуск сервиса..."
cd ..
pm2 start ecosystem.config.js

# Проверяем статус
echo "📈 Проверка статуса сервиса..."
sleep 2
pm2 status

echo ""
echo "🎉 Исправление завершено!"
echo "==============================================="
echo "📋 Что было сделано:"
echo "  1. Создана резервная копия БД: $BACKUP_PATH"
echo "  2. Очищена неудачная миграция"
echo "  3. Выполнены новые миграции"
echo "  4. Запущен сервис"
echo ""
echo "🔍 Проверьте логи:"
echo "  pm2 logs rostechnopolsk-backend --lines 20"
echo ""
echo "🆘 В случае проблем выполните откат:"
echo "  pm2 stop rostechnopolsk-backend"
echo "  cp $BACKUP_PATH $DB_PATH"
echo "  pm2 start ecosystem.config.js"
