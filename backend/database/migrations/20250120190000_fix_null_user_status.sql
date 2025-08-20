-- Исправление пользователей с NULL статусом
-- Восстанавливаем пользователей, у которых статус стал NULL из-за бага в User.update()

UPDATE users 
SET status = 'active' 
WHERE status IS NULL;

-- Убеждаемся что у всех новых пользователей будет активный статус по умолчанию
-- (это уже должно быть в schema.sql, но на всякий случай)
ALTER TABLE users 
  ALTER COLUMN status SET DEFAULT 'active';
