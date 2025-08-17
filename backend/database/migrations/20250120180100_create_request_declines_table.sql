-- Создание таблицы для отслеживания отклонений заявок
-- Выполняется автоматически при запуске сервера

CREATE TABLE IF NOT EXISTS request_declines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL,
  owner_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES rental_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Создаем индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_request_declines_request ON request_declines(request_id);
CREATE INDEX IF NOT EXISTS idx_request_declines_owner ON request_declines(owner_id);
CREATE INDEX IF NOT EXISTS idx_request_declines_created ON request_declines(created_at);
