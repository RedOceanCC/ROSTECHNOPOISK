// Вспомогательные утилиты для тестов
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// Класс для работы с тестовой БД
class TestDatabase {
  constructor() {
    this.dbPath = path.join(__dirname, '../test.db');
    this.db = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async close() {
    if (this.db) {
      return new Promise((resolve) => {
        this.db.close(resolve);
      });
    }
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Очистка всех таблиц
  async clearAll() {
    const tables = [
      'rental_bids',
      'rental_requests', 
      'equipment',
      'equipment_types',
      'company_partnerships',
      'users',
      'companies'
    ];

    for (const table of tables) {
      await this.run(`DELETE FROM ${table}`);
    }
  }

  // Сброс автоинкремента
  async resetAutoIncrement() {
    await this.run(`DELETE FROM sqlite_sequence`);
  }
}

// Мок для express request/response
function createMockReq(data = {}) {
  return {
    body: data.body || {},
    params: data.params || {},
    query: data.query || {},
    session: data.session || {},
    user: data.user || null,
    headers: data.headers || {}
  };
}

function createMockRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis()
  };
  return res;
}

function createMockNext() {
  return jest.fn();
}

// Генератор тестовых данных
const TestDataGenerator = {
  company: (overrides = {}) => ({
    name: 'Тестовая Компания',
    description: 'Описание тестовой компании',
    contact_info: 'test@example.com',
    status: 'active',
    ...overrides
  }),

  user: (overrides = {}) => ({
    name: 'Тестовый Пользователь',
    phone: '+71234567890',
    role: 'owner',
    company_id: 1,
    password: 'testpass123',
    ...overrides
  }),

  equipment: (overrides = {}) => ({
    owner_id: 1,
    name: 'Тестовая Техника',
    type: 'Экскаваторы',
    subtype: 'Гусеничный экскаватор 20-25 тонн',
    status: 'available',
    location: 'Москва',
    ...overrides
  }),

  request: (overrides = {}) => ({
    manager_id: 1,
    equipment_type: 'Экскаваторы',
    equipment_subtype: 'Гусеничный экскаватор 20-25 тонн',
    start_date: '2024-01-15',
    end_date: '2024-01-20',
    location: 'Москва',
    work_description: 'Тестовые работы',
    ...overrides
  }),

  bid: (overrides = {}) => ({
    request_id: 1,
    owner_id: 1,
    equipment_id: 1,
    hourly_rate: 5000,
    daily_rate: 40000,
    total_price: 200000,
    comment: 'Тестовая ставка',
    ...overrides
  })
};

// Утилиты для async тестов
const AsyncTestUtils = {
  // Ожидание с таймаутом
  timeout: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Ожидание условия
  waitFor: async (condition, timeout = 5000, interval = 100) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) return true;
      await AsyncTestUtils.timeout(interval);
    }
    throw new Error(`Условие не выполнилось за ${timeout}мс`);
  },

  // Ожидание исключения
  expectReject: async (promise, expectedError) => {
    try {
      await promise;
      throw new Error('Promise должен был быть отклонен');
    } catch (error) {
      if (expectedError && !error.message.includes(expectedError)) {
        throw new Error(`Ожидалась ошибка с "${expectedError}", получена "${error.message}"`);
      }
    }
  }
};

// DOM утилиты для frontend тестов
const DOMTestUtils = {
  // Создание mock элемента
  createElement: (tag, attributes = {}) => {
    const element = document.createElement(tag);
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'innerHTML') {
        element.innerHTML = value;
      } else if (key === 'textContent') {
        element.textContent = value;
      } else {
        element.setAttribute(key, value);
      }
    });
    return element;
  },

  // Симуляция событий
  fireEvent: (element, eventType, eventInit = {}) => {
    const event = new Event(eventType, { bubbles: true, ...eventInit });
    element.dispatchEvent(event);
  },

  // Поиск элемента по тексту
  getByText: (text, container = document) => {
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.includes(text)) {
        return node.parentElement;
      }
    }
    return null;
  }
};

module.exports = {
  TestDatabase,
  createMockReq,
  createMockRes,
  createMockNext,
  TestDataGenerator,
  AsyncTestUtils,
  DOMTestUtils
};
