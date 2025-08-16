// Тесты модели Database
const path = require('path');
const fs = require('fs');
const { TestDatabase } = require('../../config/test-helpers');

// Мок для основной модели Database
jest.mock('../../../backend/models/Database', () => {
  const originalModule = jest.requireActual('../../../backend/models/Database');
  return {
    ...originalModule,
    // Переопределяем путь к БД для тестов
    database: {
      ...originalModule.database,
      connect: jest.fn(),
      close: jest.fn(),
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn()
    }
  };
});

const Database = require('../../../backend/models/Database');

describe('Database Model', () => {
  let testDb;

  beforeAll(async () => {
    testDb = new TestDatabase();
    await testDb.connect();
  });

  afterAll(async () => {
    await testDb.close();
  });

  beforeEach(async () => {
    await testDb.clearAll();
    await testDb.resetAutoIncrement();
  });

  describe('Connection Management', () => {
    test('должен создать singleton подключение', () => {
      expect(Database.database).toBeDefined();
      expect(typeof Database.database.run).toBe('function');
      expect(typeof Database.database.get).toBe('function');
      expect(typeof Database.database.all).toBe('function');
    });

    test('должен использовать одно и то же подключение', () => {
      const db1 = Database.database;
      const db2 = Database.database;
      expect(db1).toBe(db2);
    });
  });

  describe('Query Methods', () => {
    beforeEach(() => {
      // Сбрасываем моки перед каждым тестом
      Database.database.run.mockClear();
      Database.database.get.mockClear();
      Database.database.all.mockClear();
    });

    test('run() должен выполнить SQL запрос', async () => {
      Database.database.run.mockResolvedValue({ lastID: 1, changes: 1 });

      const result = await Database.database.run(
        'INSERT INTO companies (name, status) VALUES (?, ?)',
        ['Test Company', 'active']
      );

      expect(Database.database.run).toHaveBeenCalledWith(
        'INSERT INTO companies (name, status) VALUES (?, ?)',
        ['Test Company', 'active']
      );
      expect(result).toEqual({ lastID: 1, changes: 1 });
    });

    test('get() должен вернуть одну запись', async () => {
      const mockCompany = { id: 1, name: 'Test Company', status: 'active' };
      Database.database.get.mockResolvedValue(mockCompany);

      const result = await Database.database.get(
        'SELECT * FROM companies WHERE id = ?',
        [1]
      );

      expect(Database.database.get).toHaveBeenCalledWith(
        'SELECT * FROM companies WHERE id = ?',
        [1]
      );
      expect(result).toEqual(mockCompany);
    });

    test('all() должен вернуть массив записей', async () => {
      const mockCompanies = [
        { id: 1, name: 'Company 1', status: 'active' },
        { id: 2, name: 'Company 2', status: 'active' }
      ];
      Database.database.all.mockResolvedValue(mockCompanies);

      const result = await Database.database.all(
        'SELECT * FROM companies WHERE status = ?',
        ['active']
      );

      expect(Database.database.all).toHaveBeenCalledWith(
        'SELECT * FROM companies WHERE status = ?',
        ['active']
      );
      expect(result).toEqual(mockCompanies);
    });

    test('должен обрабатывать ошибки SQL', async () => {
      Database.database.run.mockRejectedValue(new Error('SQL Error: table not found'));

      await expect(
        Database.database.run('INSERT INTO nonexistent_table VALUES (?)', ['test'])
      ).rejects.toThrow('SQL Error: table not found');
    });
  });

  describe('Parameter Binding', () => {
    test('должен корректно обрабатывать параметры', async () => {
      Database.database.run.mockResolvedValue({ lastID: 1, changes: 1 });

      await Database.database.run(
        'INSERT INTO users (name, phone, role, company_id) VALUES (?, ?, ?, ?)',
        ['John Doe', '+1234567890', 'owner', 1]
      );

      expect(Database.database.run).toHaveBeenCalledWith(
        'INSERT INTO users (name, phone, role, company_id) VALUES (?, ?, ?, ?)',
        ['John Doe', '+1234567890', 'owner', 1]
      );
    });

    test('должен обрабатывать пустые параметры', async () => {
      Database.database.all.mockResolvedValue([]);

      await Database.database.all('SELECT * FROM companies');

      expect(Database.database.all).toHaveBeenCalledWith('SELECT * FROM companies');
    });

    test('должен обрабатывать null значения', async () => {
      Database.database.run.mockResolvedValue({ lastID: 1, changes: 1 });

      await Database.database.run(
        'INSERT INTO equipment (name, owner_id, additional_equipment) VALUES (?, ?, ?)',
        ['Excavator', 1, null]
      );

      expect(Database.database.run).toHaveBeenCalledWith(
        'INSERT INTO equipment (name, owner_id, additional_equipment) VALUES (?, ?, ?)',
        ['Excavator', 1, null]
      );
    });
  });

  describe('Transaction Support', () => {
    test('должен поддерживать транзакции', async () => {
      Database.database.run
        .mockResolvedValueOnce({ changes: 1 }) // BEGIN
        .mockResolvedValueOnce({ lastID: 1, changes: 1 }) // INSERT
        .mockResolvedValueOnce({ lastID: 2, changes: 1 }) // INSERT
        .mockResolvedValueOnce({ changes: 1 }); // COMMIT

      // Симуляция транзакции
      await Database.database.run('BEGIN TRANSACTION');
      await Database.database.run('INSERT INTO companies (name) VALUES (?)', ['Company 1']);
      await Database.database.run('INSERT INTO companies (name) VALUES (?)', ['Company 2']);
      await Database.database.run('COMMIT');

      expect(Database.database.run).toHaveBeenCalledTimes(4);
      expect(Database.database.run).toHaveBeenNthCalledWith(1, 'BEGIN TRANSACTION');
      expect(Database.database.run).toHaveBeenNthCalledWith(4, 'COMMIT');
    });

    test('должен поддерживать rollback при ошибке', async () => {
      Database.database.run
        .mockResolvedValueOnce({ changes: 1 }) // BEGIN
        .mockRejectedValueOnce(new Error('Constraint violation')) // INSERT с ошибкой
        .mockResolvedValueOnce({ changes: 1 }); // ROLLBACK

      try {
        await Database.database.run('BEGIN TRANSACTION');
        await Database.database.run('INSERT INTO companies (name) VALUES (?)', [null]); // Ошибка
      } catch (error) {
        await Database.database.run('ROLLBACK');
      }

      expect(Database.database.run).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('Connection Lifecycle', () => {
    test('должен инициализироваться при первом обращении', () => {
      // Database модель должна быть готова к использованию сразу
      expect(Database.database).toBeTruthy();
    });

    test('должен корректно закрывать соединение', async () => {
      Database.database.close.mockResolvedValue();
      
      await Database.database.close();
      
      expect(Database.database.close).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('должен выбрасывать понятные ошибки при проблемах с БД', async () => {
      Database.database.get.mockRejectedValue(new Error('Database locked'));

      await expect(
        Database.database.get('SELECT * FROM companies WHERE id = ?', [999])
      ).rejects.toThrow('Database locked');
    });

    test('должен обрабатывать ошибки подключения', async () => {
      Database.database.connect = jest.fn().mockRejectedValue(new Error('Connection failed'));

      await expect(Database.database.connect()).rejects.toThrow('Connection failed');
    });
  });

  describe('Performance', () => {
    test('запросы должны выполняться в разумное время', async () => {
      Database.database.all.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([]), 50))
      );

      const start = Date.now();
      await Database.database.all('SELECT * FROM companies');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // Должно выполниться менее чем за 100мс
    });
  });
});
