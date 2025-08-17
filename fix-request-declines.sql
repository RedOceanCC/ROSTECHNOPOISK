-- Прямое исправление таблицы request_declines
-- Выполните: sqlite3 /путь/к/базе/rostechnopolsk.db < fix-request-declines.sql

-- Удаляем неправильные записи миграций
DELETE FROM schema_migrations WHERE version LIKE '%request_declines%';

-- Создаем таблицу (если не существует)
CREATE TABLE IF NOT EXISTS request_declines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL,
  owner_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES rental_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Создаем индексы
CREATE INDEX IF NOT EXISTS idx_request_declines_request ON request_declines(request_id);
CREATE INDEX IF NOT EXISTS idx_request_declines_owner ON request_declines(owner_id);
CREATE INDEX IF NOT EXISTS idx_request_declines_created ON request_declines(created_at);

-- Регистрируем миграции как выполненные
INSERT OR IGNORE INTO schema_migrations (version, execution_time_ms, environment) 
VALUES ('20250120180100_create_request_declines_table', 1, 'production');

INSERT OR IGNORE INTO schema_migrations (version, execution_time_ms, environment) 
VALUES ('20250120180200_create_request_declines_indexes', 1, 'production');

-- Проверяем результат
.schema request_declines
