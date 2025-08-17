@echo off
rem Скрипт для исправления проблемы с миграцией request_declines (Windows версия)
rem Выполните: fix-migration.bat

echo 🔧 Исправление проблемы с миграцией request_declines...
echo ==================================================

rem Проверяем, что мы в правильной директории
if not exist "backend\server.js" (
    echo ❌ Ошибка: запустите скрипт из корневой директории проекта
    echo Пример: cd D:\Project\Despair && fix-migration.bat
    pause
    exit /b 1
)

rem Останавливаем сервис (если запущен)
echo 🛑 Остановка сервиса...
npx pm2 stop rostechnopolsk-backend 2>nul || echo Сервис не запущен

rem Создаем резервную копию (для локальной разработки)
set DB_PATH=backend\database\rostechnopolsk.db
if exist "%DB_PATH%" (
    echo 💾 Создание резервной копии базы данных...
    copy "%DB_PATH%" "%DB_PATH%.backup.%date:~-4%%date:~4,2%%date:~7,2%_%time:~0,2%%time:~3,2%%time:~6,2%" >nul
    echo ✅ Резервная копия создана
)

rem Переходим в backend
cd backend

rem Проверяем статус миграций
echo 📊 Проверка статуса миграций...
node database\migrate.js status

rem Выполняем миграции
echo 🔄 Выполнение миграций...
node database\migrate.js

echo ""
echo 🎉 Исправление завершено!
echo ===============================================
echo 📋 Что было сделано:
echo   1. Создана резервная копия БД
echo   2. Выполнены миграции
echo ""
echo 🚀 Для запуска сервера выполните:
echo   cd .. && node backend\server.js
echo ""
pause
