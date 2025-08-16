// Глобальная настройка Jest
const path = require('path');

// Устанавливаем переменные окружения для тестов
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret-key';
process.env.DB_PATH = path.join(__dirname, '../test.db');

// Глобальные моки для консоли (уменьшаем шум в тестах)
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Очистка после каждого теста
afterEach(() => {
  jest.clearAllMocks();
});

// Таймауты для async операций
jest.setTimeout(10000);
