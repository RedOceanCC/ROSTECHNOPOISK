-- Миграция: Добавление типа уведомления 'new_bid'
-- Дата: 2025-08-17
-- Описание: Расширяем типы уведомлений для поддержки уведомлений о новых ставках

-- SQLite не поддерживает изменение CHECK constraint напрямую
-- Поэтому создаем новую таблицу с обновленным constraint

-- 1. Создаем временную таблицу с новым constraint
CREATE TABLE notifications_new (
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

-- 2. Копируем данные из старой таблицы
INSERT INTO notifications_new 
SELECT id, user_id, type, title, message, telegram_sent, read_at, created_at 
FROM notifications;

-- 3. Удаляем старую таблицу
DROP TABLE notifications;

-- 4. Переименовываем новую таблицу
ALTER TABLE notifications_new RENAME TO notifications;

-- 5. Восстанавливаем индекс
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read_at);
