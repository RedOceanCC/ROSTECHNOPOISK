-- Добавление нового типа уведомления new_bid
-- Выполняется автоматически при запуске сервера

-- Сначала создаем временную таблицу с новой схемой
CREATE TABLE IF NOT EXISTS notifications_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT CHECK(type IN ('new_request', 'bid_accepted', 'bid_rejected', 'auction_closed', 'bid_won', 'bid_lost', 'auction_no_bids', 'system', 'new_bid')) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  telegram_sent BOOLEAN DEFAULT FALSE,
  read_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Копируем данные из старой таблицы
INSERT INTO notifications_new (id, user_id, type, title, message, telegram_sent, read_at, created_at)
SELECT id, user_id, type, title, message, telegram_sent, read_at, created_at
FROM notifications;

-- Удаляем старую таблицу
DROP TABLE notifications;

-- Переименовываем новую таблицу
ALTER TABLE notifications_new RENAME TO notifications;

-- Восстанавливаем индекс
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);
