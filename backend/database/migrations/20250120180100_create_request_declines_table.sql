-- Создание таблицы для отслеживания отклонений заявок
-- Выполняется автоматически при запуске сервера

-- Создаем таблицу
CREATE TABLE IF NOT EXISTS request_declines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL,
  owner_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES rental_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
)
