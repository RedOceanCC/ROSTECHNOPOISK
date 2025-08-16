-- Схема базы данных для РОСТЕХНОПОИСК MVP
-- Создание таблиц согласно расширенному ТЗ

-- Компании
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  contact_info TEXT,
  status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Пользователи (расширенная таблица)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  password VARCHAR(255) NOT NULL,
  role TEXT CHECK(role IN ('admin', 'owner', 'manager')) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  telegram_id VARCHAR(100),
  company_id INTEGER,
  status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- Связи между компаниями (кто с кем может работать)
CREATE TABLE IF NOT EXISTS company_partnerships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_company_id INTEGER NOT NULL,
  manager_company_id INTEGER NOT NULL,
  status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_company_id) REFERENCES companies(id),
  FOREIGN KEY (manager_company_id) REFERENCES companies(id),
  UNIQUE(owner_company_id, manager_company_id)
);

-- Техника (расширенная)
CREATE TABLE IF NOT EXISTS equipment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  subtype VARCHAR(100) NOT NULL,
  owner_id INTEGER NOT NULL,
  phone VARCHAR(20) NOT NULL,
  telegram_id VARCHAR(100),
  license_plate VARCHAR(20),
  is_off_road BOOLEAN DEFAULT FALSE,
  additional_equipment TEXT,
  description TEXT,
  hourly_rate DECIMAL(10,2),
  daily_rate DECIMAL(10,2),
  status TEXT CHECK(status IN ('available', 'busy', 'maintenance')) DEFAULT 'available',
  location VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- Заявки на аренду
CREATE TABLE IF NOT EXISTS rental_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  manager_id INTEGER NOT NULL,
  equipment_type VARCHAR(100) NOT NULL,
  equipment_subtype VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  work_description TEXT NOT NULL,
  location VARCHAR(255) NOT NULL,
  budget_range VARCHAR(50),
  status TEXT CHECK(status IN ('pending', 'auction_active', 'auction_closed', 'completed', 'cancelled')) DEFAULT 'pending',
  winning_bid_id INTEGER NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  auction_deadline DATETIME,
  FOREIGN KEY (manager_id) REFERENCES users(id),
  FOREIGN KEY (winning_bid_id) REFERENCES rental_bids(id)
);

-- Заявки владельцев на аукцион (скрытые ставки)
CREATE TABLE IF NOT EXISTS rental_bids (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL,
  owner_id INTEGER NOT NULL,
  equipment_id INTEGER NOT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL,
  daily_rate DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  comment TEXT,
  status TEXT CHECK(status IN ('pending', 'accepted', 'rejected', 'expired')) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES rental_requests(id),
  FOREIGN KEY (owner_id) REFERENCES users(id),
  FOREIGN KEY (equipment_id) REFERENCES equipment(id)
);

-- Telegram уведомления
CREATE TABLE IF NOT EXISTS notifications (
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

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_equipment_owner ON equipment(owner_id);
CREATE INDEX IF NOT EXISTS idx_equipment_type ON equipment(type, subtype);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_requests_manager ON rental_requests(manager_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON rental_requests(status);
CREATE INDEX IF NOT EXISTS idx_bids_request ON rental_bids(request_id);
CREATE INDEX IF NOT EXISTS idx_bids_owner ON rental_bids(owner_id);
CREATE INDEX IF NOT EXISTS idx_partnerships_owner ON company_partnerships(owner_company_id);
CREATE INDEX IF NOT EXISTS idx_partnerships_manager ON company_partnerships(manager_company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
