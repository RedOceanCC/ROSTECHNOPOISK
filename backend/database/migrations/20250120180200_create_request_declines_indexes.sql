-- Создание индексов для таблицы request_declines
-- Выполняется после создания таблицы

-- Создаем индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_request_declines_request ON request_declines(request_id);
CREATE INDEX IF NOT EXISTS idx_request_declines_owner ON request_declines(owner_id);
CREATE INDEX IF NOT EXISTS idx_request_declines_created ON request_declines(created_at);
