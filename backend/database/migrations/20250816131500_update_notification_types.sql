-- Миграция: Обновление типов уведомлений
-- Дата: 16.08.2025 13:15
-- Описание: Добавляет новые типы уведомлений в CHECK constraint

-- Поскольку SQLite не поддерживает изменение CHECK constraints,
-- нужно создать новую таблицу и перенести данные

-- 1. Создаем новую таблицу с обновленными типами
CREATE TABLE IF NOT EXISTS notifications_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT CHECK(type IN ('new_request', 'bid_accepted', 'bid_rejected', 'auction_closed', 'bid_won', 'bid_lost', 'auction_no_bids', 'system')) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  telegram_sent BOOLEAN DEFAULT FALSE,
  read_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 2. Копируем существующие данные
INSERT INTO notifications_new (id, user_id, type, title, message, telegram_sent, read_at, created_at)
SELECT id, user_id, type, title, message, telegram_sent, read_at, created_at
FROM notifications;

-- 3. Удаляем старую таблицу
DROP TABLE notifications;

-- 4. Переименовываем новую таблицу
ALTER TABLE notifications_new RENAME TO notifications;

-- 5. Восстанавливаем индекс
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
