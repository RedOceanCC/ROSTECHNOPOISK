# Руководство по миграции базы данных РОСТЕХНОПОИСК

## Обзор системы миграций

Система миграций автоматически применяет изменения к структуре базы данных при запуске сервера. Все миграции находятся в `backend/database/migrations/` и выполняются в алфавитном порядке.

## Скрипты для работы с миграциями

### 1. Основной скрипт миграций
**Файл:** `backend/database/migrate.js`

**Команды:**
```bash
# Запуск всех миграций
node backend/database/migrate.js

# Создание новой миграции
node backend/database/migrate.js create "Название миграции"

# Проверка статуса миграций
node backend/database/migrate.js status
```

### 2. Автоматический запуск миграций
Миграции автоматически выполняются при запуске сервера через `server.js`:
```bash
# Миграции запускаются автоматически
node backend/server.js
```

## Текущая проблема и решение

### Проблема:
```
SQLITE_ERROR: no such table: main.request_declines
```

### Причина:
Миграция `20250120180100_create_request_declines_table.sql` пытается создать индексы в той же транзакции, что и таблицу, но SQLite выполняет команды поочередно.

### Решение (уже применено):
1. **Исправлена миграция таблицы** - убраны индексы из основной миграции
2. **Создана отдельная миграция для индексов** - `20250120180200_create_request_declines_indexes.sql`

## Пошаговая инструкция миграции на сервере

### Шаг 1: Остановка сервиса
```bash
# Остановите текущий процесс
pm2 stop rostechnopolsk-backend
# или
pkill -f "node.*server.js"
```

### Шаг 2: Создание резервной копии
```bash
# Создайте резервную копию базы данных
cp /var/lib/rostechnopoisk/database/rostechnopolsk.db /var/lib/rostechnopoisk/database/rostechnopolsk.db.backup.$(date +%Y%m%d_%H%M%S)

# Проверьте, что копия создана
ls -la /var/lib/rostechnopoisk/database/
```

### Шаг 3: Проверка текущего статуса миграций
```bash
cd /root/ROSTECHNOPOISK/backend
node database/migrate.js status
```

**Ожидаемый вывод:**
```
📊 СТАТУС МИГРАЦИЙ:
==================
✅ Выполнена 20250120180000_add_new_bid_notification_type
❌ Ошибка 20250120180100_create_request_declines_table
⏳ Ожидает 20250120180200_create_request_declines_indexes
```

### Шаг 4: Очистка неудачной миграции
```bash
# Подключитесь к базе данных
sqlite3 /var/lib/rostechnopoisk/database/rostechnopolsk.db

# Удалите запись о неудачной миграции
DELETE FROM schema_migrations WHERE version = '20250120180100_create_request_declines_table';

# Проверьте, что запись удалена
SELECT * FROM schema_migrations ORDER BY version;

# Выйдите из SQLite
.exit
```

### Шаг 5: Ручное выполнение миграций
```bash
cd /root/ROSTECHNOPOISK/backend

# Выполните миграции вручную
node database/migrate.js
```

**Ожидаемый вывод:**
```
🔄 Запуск системы миграций базы данных
✅ Таблица schema_migrations готова
📋 Выполнено миграций: X
▶️ Выполнение миграции: 20250120180100_create_request_declines_table.sql
✅ Миграция 20250120180100_create_request_declines_table.sql выполнена за Xмс
▶️ Выполнение миграции: 20250120180200_create_request_declines_indexes.sql
✅ Миграция 20250120180200_create_request_declines_indexes.sql выполнена за Xмс
✅ Применено новых миграций: 2
```

### Шаг 6: Проверка результата
```bash
# Проверьте статус миграций
node database/migrate.js status

# Проверьте структуру таблицы
sqlite3 /var/lib/rostechnopoisk/database/rostechnopolsk.db "
.schema request_declines
"
```

**Ожидаемый вывод:**
```sql
CREATE TABLE request_declines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL,
  owner_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES rental_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_request_declines_request ON request_declines(request_id);
CREATE INDEX idx_request_declines_owner ON request_declines(owner_id);
CREATE INDEX idx_request_declines_created ON request_declines(created_at);
```

### Шаг 7: Запуск сервиса
```bash
# Запустите сервер
cd /root/ROSTECHNOPOISK
pm2 start ecosystem.config.js

# Проверьте статус
pm2 status
pm2 logs rostechnopolsk-backend --lines 20
```

## Проверка работоспособности

### 1. Проверка API
```bash
# Проверьте здоровье API
curl -X GET http://localhost:3001/api/health

# Ожидаемый ответ:
# {"status":"ok","timestamp":"...","database":"connected","migrations":"completed"}
```

### 2. Проверка Telegram бота
```bash
# Проверьте логи бота
pm2 logs rostechnopolsk-backend | grep -i telegram

# Ожидаемые сообщения:
# ✅ Telegram бот инициализирован
# ✅ Telegram WebApp роуты подключены
```

### 3. Проверка базы данных
```bash
# Проверьте количество записей в новых таблицах
sqlite3 /var/lib/rostechnopoisk/database/rostechnopolsk.db "
SELECT 'notifications' as table_name, COUNT(*) as count FROM notifications
WHERE type = 'new_bid'
UNION ALL
SELECT 'request_declines', COUNT(*) FROM request_declines;
"
```

## Альтернативные методы миграции

### Метод 1: Прямое выполнение SQL
```bash
# Если автоматические миграции не работают
sqlite3 /var/lib/rostechnopoisk/database/rostechnopolsk.db < backend/database/migrations/20250120180100_create_request_declines_table.sql
sqlite3 /var/lib/rostechnopoisk/database/rostechnopolsk.db < backend/database/migrations/20250120180200_create_request_declines_indexes.sql

# Зарегистрируйте миграции вручную
sqlite3 /var/lib/rostechnopoisk/database/rostechnopolsk.db "
INSERT INTO schema_migrations (version, execution_time_ms, environment) 
VALUES ('20250120180100_create_request_declines_table', 1, 'production');
INSERT INTO schema_migrations (version, execution_time_ms, environment) 
VALUES ('20250120180200_create_request_declines_indexes', 1, 'production');
"
```

### Метод 2: Использование системной проверки
```bash
# Запустите системную проверку
cd /root/ROSTECHNOPOISK
node system-check.js
```

## Откат миграций (при критических ошибках)

### Полный откат базы данных
```bash
# Остановите сервис
pm2 stop rostechnopolsk-backend

# Восстановите резервную копию
cp /var/lib/rostechnopoisk/database/rostechnopolsk.db.backup.YYYYMMDD_HHMMSS /var/lib/rostechnopoisk/database/rostechnopolsk.db

# Удалите проблемные миграции
rm -f backend/database/migrations/20250120180100_create_request_declines_table.sql
rm -f backend/database/migrations/20250120180200_create_request_declines_indexes.sql

# Запустите сервис
pm2 start ecosystem.config.js
```

### Частичный откат (удаление таблицы)
```bash
sqlite3 /var/lib/rostechnopoisk/database/rostechnopolsk.db "
DROP TABLE IF EXISTS request_declines;
DELETE FROM schema_migrations WHERE version LIKE '%request_declines%';
"
```

## Мониторинг после миграции

### Первые 30 минут
```bash
# Следите за логами
pm2 logs rostechnopolsk-backend -f

# Проверяйте производительность
pm2 monit

# Тестируйте ключевые функции
curl -X POST http://localhost:3001/api/requests/test
```

### Ключевые показатели
- Время ответа API < 500ms
- Отсутствие ошибок в логах
- Успешная отправка Telegram уведомлений
- Корректная работа WebApp

## Контакты для экстренных случаев

При критических ошибках:
1. Немедленно выполните откат: `pm2 stop rostechnopolsk-backend`
2. Восстановите резервную копию БД
3. Проверьте логи: `pm2 logs rostechnopolsk-backend --lines 100`
4. Сообщите о проблеме с полными логами ошибок
