@echo off
echo ===========================================
echo   ЗАПУСК TELEGRAM БОТА РОСТЕХНОПОИСК
echo ===========================================
echo.

echo 1. Переход в папку backend...
cd backend

echo 2. Установка зависимостей...
npm install

echo 3. Применение миграций...
npm run migrate

echo 4. Запуск сервера с Telegram ботом...
echo.
echo Сервер будет доступен на: http://localhost:3001
echo Telegram WebApp: http://localhost:3001/telegram/
echo.
echo Для остановки нажмите Ctrl+C
echo.

npm run dev

pause
