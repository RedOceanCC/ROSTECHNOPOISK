#!/bin/bash

# Скрипт для размещения тестового файла на сервере

echo "🚀 Размещение тестового файла уведомлений на сервере..."

# Проверяем существование файла
if [ ! -f "test-notifications-fixed.html" ]; then
    echo "❌ Файл test-notifications-fixed.html не найден!"
    exit 1
fi

# Копируем файл в корень проекта (откуда сервер раздает статические файлы)
cp test-notifications-fixed.html ../

echo "✅ Файл скопирован в корень проекта"

# Информация для пользователя
echo ""
echo "📋 Инструкции:"
echo "1. Убедитесь что сервер запущен:"
echo "   pm2 status"
echo ""
echo "2. Откройте в браузере:"
echo "   https://ростехнопоиск.рф/test-notifications-fixed.html"
echo ""
echo "3. Или локально:"
echo "   http://localhost:3000/test-notifications-fixed.html"
echo ""
echo "4. Нажмите 'Запустить все тесты' для диагностики"
echo ""
echo "🔧 Если есть проблемы, проверьте:"
echo "   - pm2 logs rostechnopolsk-backend"
echo "   - pm2 logs rostechnopolsk-frontend" 
echo "   - Консоль браузера (F12)"
