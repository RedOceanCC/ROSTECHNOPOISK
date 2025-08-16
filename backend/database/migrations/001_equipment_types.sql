-- Миграция: Создание таблицы типов техники
-- Дата: 2025-08-15
-- Описание: Добавляет таблицу equipment_types для хранения типов и подтипов техники

CREATE TABLE IF NOT EXISTS equipment_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type VARCHAR(100) NOT NULL,
  subtype VARCHAR(100) NOT NULL,
  characteristics TEXT,
  is_off_road BOOLEAN DEFAULT 0,
  additional_options TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(type, subtype)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_equipment_types_type ON equipment_types(type);
CREATE INDEX IF NOT EXISTS idx_equipment_types_subtype ON equipment_types(subtype);
CREATE INDEX IF NOT EXISTS idx_equipment_types_off_road ON equipment_types(is_off_road);
