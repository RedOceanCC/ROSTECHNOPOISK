// Тесты модели User
const User = require('../../../backend/models/User');
const bcrypt = require('bcrypt');
const { TestDatabase, TestDataGenerator } = require('../../config/test-helpers');

// Мок для Database
jest.mock('../../../backend/models/Database', () => ({
  database: {
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn()
  }
}));

const { database } = require('../../../backend/models/Database');

describe('User Model', () => {
  let testDb;

  beforeAll(async () => {
    testDb = new TestDatabase();
    await testDb.connect();
  });

  afterAll(async () => {
    await testDb.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create()', () => {
    test('должен создать нового пользователя с хешированным паролем', async () => {
      const userData = TestDataGenerator.user({
        name: 'John Doe',
        phone: '+1234567890',
        role: 'owner',
        company_id: 1,
        password: 'testpass123'
      });

      database.run.mockResolvedValue({ lastID: 1, changes: 1 });

      const result = await User.create(userData);

      expect(database.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining([
          'John Doe',
          '+1234567890', 
          'owner',
          1,
          expect.any(String) // хешированный пароль
        ])
      );
      expect(result).toEqual({ id: 1, success: true });
    });

    test('должен хешировать пароль перед сохранением', async () => {
      const userData = TestDataGenerator.user({ password: 'plaintext' });
      database.run.mockResolvedValue({ lastID: 1, changes: 1 });

      await User.create(userData);

      const callArgs = database.run.mock.calls[0][1];
      const hashedPassword = callArgs[4]; // пароль должен быть 5-м параметром

      expect(hashedPassword).not.toBe('plaintext');
      expect(hashedPassword).toMatch(/^\$2b\$10\$/); // bcrypt hash format
    });

    test('должен обрабатывать пустой company_id', async () => {
      const userData = TestDataGenerator.user({ company_id: null });
      database.run.mockResolvedValue({ lastID: 1, changes: 1 });

      await User.create(userData);

      const callArgs = database.run.mock.calls[0][1];
      expect(callArgs[3]).toBeNull(); // company_id должен быть null
    });

    test('должен выбрасывать ошибку при дублировании телефона', async () => {
      const userData = TestDataGenerator.user();
      database.run.mockRejectedValue(new Error('UNIQUE constraint failed: users.phone'));

      await expect(User.create(userData)).rejects.toThrow('UNIQUE constraint failed');
    });
  });

  describe('findByPhone()', () => {
    test('должен найти пользователя по телефону', async () => {
      const mockUser = {
        id: 1,
        name: 'John Doe',
        phone: '+1234567890',
        role: 'owner',
        company_id: 1,
        password_hash: '$2b$10$hashedpassword'
      };

      database.get.mockResolvedValue(mockUser);

      const result = await User.findByPhone('+1234567890');

      expect(database.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM users WHERE phone = ?'),
        ['+1234567890']
      );
      expect(result).toEqual(mockUser);
    });

    test('должен вернуть null если пользователь не найден', async () => {
      database.get.mockResolvedValue(undefined);

      const result = await User.findByPhone('+9999999999');

      expect(result).toBeUndefined();
    });

    test('должен обрабатывать невалидный формат телефона', async () => {
      database.get.mockResolvedValue(undefined);

      const result = await User.findByPhone('invalid-phone');

      expect(result).toBeUndefined();
    });
  });

  describe('findById()', () => {
    test('должен найти пользователя по ID', async () => {
      const mockUser = {
        id: 1,
        name: 'John Doe',
        phone: '+1234567890',
        role: 'owner',
        company_id: 1
      };

      database.get.mockResolvedValue(mockUser);

      const result = await User.findById(1);

      expect(database.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM users WHERE id = ?'),
        [1]
      );
      expect(result).toEqual(mockUser);
    });

    test('должен вернуть null для несуществующего ID', async () => {
      database.get.mockResolvedValue(undefined);

      const result = await User.findById(999);

      expect(result).toBeUndefined();
    });

    test('должен обрабатывать нечисловой ID', async () => {
      database.get.mockResolvedValue(undefined);

      const result = await User.findById('invalid-id');

      expect(result).toBeUndefined();
    });
  });

  describe('findAll()', () => {
    test('должен вернуть всех пользователей с информацией о компании', async () => {
      const mockUsers = [
        {
          id: 1,
          name: 'John Doe',
          phone: '+1234567890',
          role: 'owner',
          company_id: 1,
          company_name: 'Company A'
        },
        {
          id: 2,
          name: 'Jane Smith',
          phone: '+0987654321',
          role: 'manager',
          company_id: 2,
          company_name: 'Company B'
        }
      ];

      database.all.mockResolvedValue(mockUsers);

      const result = await User.findAll();

      expect(database.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT u.*, c.name as company_name FROM users u')
      );
      expect(result).toEqual(mockUsers);
      expect(result).toHaveLength(2);
    });

    test('должен вернуть пустой массив если пользователей нет', async () => {
      database.all.mockResolvedValue([]);

      const result = await User.findAll();

      expect(result).toEqual([]);
    });

    test('должен включать пользователей без компании', async () => {
      const mockUsers = [
        {
          id: 1,
          name: 'Admin User',
          phone: '+1111111111',
          role: 'admin',
          company_id: null,
          company_name: null
        }
      ];

      database.all.mockResolvedValue(mockUsers);

      const result = await User.findAll();

      expect(result[0].company_name).toBeNull();
    });
  });

  describe('verifyPassword()', () => {
    test('должен корректно проверять правильный пароль', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 10);
      const mockUser = {
        id: 1,
        password_hash: hashedPassword
      };

      database.get.mockResolvedValue(mockUser);

      const result = await User.verifyPassword(1, 'correctpassword');

      expect(result).toBe(true);
    });

    test('должен отклонять неправильный пароль', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 10);
      const mockUser = {
        id: 1,
        password_hash: hashedPassword
      };

      database.get.mockResolvedValue(mockUser);

      const result = await User.verifyPassword(1, 'wrongpassword');

      expect(result).toBe(false);
    });

    test('должен вернуть false для несуществующего пользователя', async () => {
      database.get.mockResolvedValue(undefined);

      const result = await User.verifyPassword(999, 'anypassword');

      expect(result).toBe(false);
    });

    test('должен обрабатывать пользователя без пароля', async () => {
      const mockUser = {
        id: 1,
        password_hash: null
      };

      database.get.mockResolvedValue(mockUser);

      const result = await User.verifyPassword(1, 'anypassword');

      expect(result).toBe(false);
    });
  });

  describe('updatePassword()', () => {
    test('должен обновить пароль пользователя', async () => {
      database.run.mockResolvedValue({ changes: 1 });

      const result = await User.updatePassword(1, 'newpassword');

      expect(database.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET password_hash = ? WHERE id = ?'),
        [expect.any(String), 1]
      );
      expect(result).toBe(true);

      // Проверяем что пароль был хеширован
      const callArgs = database.run.mock.calls[0][1];
      const hashedPassword = callArgs[0];
      expect(hashedPassword).toMatch(/^\$2b\$10\$/);
    });

    test('должен вернуть false если пользователь не найден', async () => {
      database.run.mockResolvedValue({ changes: 0 });

      const result = await User.updatePassword(999, 'newpassword');

      expect(result).toBe(false);
    });
  });

  describe('delete()', () => {
    test('должен удалить пользователя', async () => {
      database.run.mockResolvedValue({ changes: 1 });

      const result = await User.delete(1);

      expect(database.run).toHaveBeenCalledWith(
        'DELETE FROM users WHERE id = ?',
        [1]
      );
      expect(result).toBe(true);
    });

    test('должен вернуть false если пользователь не найден', async () => {
      database.run.mockResolvedValue({ changes: 0 });

      const result = await User.delete(999);

      expect(result).toBe(false);
    });
  });

  describe('findByRole()', () => {
    test('должен найти всех пользователей с указанной ролью', async () => {
      const mockOwners = [
        { id: 1, name: 'Owner 1', role: 'owner' },
        { id: 2, name: 'Owner 2', role: 'owner' }
      ];

      database.all.mockResolvedValue(mockOwners);

      const result = await User.findByRole('owner');

      expect(database.all).toHaveBeenCalledWith(
        expect.stringContaining('WHERE u.role = ?'),
        ['owner']
      );
      expect(result).toEqual(mockOwners);
    });

    test('должен вернуть пустой массив для роли без пользователей', async () => {
      database.all.mockResolvedValue([]);

      const result = await User.findByRole('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('findByCompany()', () => {
    test('должен найти всех пользователей компании', async () => {
      const mockUsers = [
        { id: 1, name: 'User 1', company_id: 1 },
        { id: 2, name: 'User 2', company_id: 1 }
      ];

      database.all.mockResolvedValue(mockUsers);

      const result = await User.findByCompany(1);

      expect(database.all).toHaveBeenCalledWith(
        expect.stringContaining('WHERE u.company_id = ?'),
        [1]
      );
      expect(result).toEqual(mockUsers);
    });
  });

  describe('Validation', () => {
    test('должен валидировать обязательные поля', async () => {
      const invalidUserData = {
        name: '',
        phone: '',
        role: '',
        password: ''
      };

      database.run.mockRejectedValue(new Error('NOT NULL constraint failed'));

      await expect(User.create(invalidUserData)).rejects.toThrow('NOT NULL constraint failed');
    });

    test('должен валидировать формат роли', async () => {
      const userData = TestDataGenerator.user({ role: 'invalid_role' });
      
      database.run.mockRejectedValue(new Error('CHECK constraint failed'));

      await expect(User.create(userData)).rejects.toThrow('CHECK constraint failed');
    });
  });

  describe('Edge Cases', () => {
    test('должен обрабатывать очень длинные имена', async () => {
      const longName = 'A'.repeat(1000);
      const userData = TestDataGenerator.user({ name: longName });
      
      database.run.mockRejectedValue(new Error('String too long'));

      await expect(User.create(userData)).rejects.toThrow('String too long');
    });

    test('должен обрабатывать специальные символы в имени', async () => {
      const userData = TestDataGenerator.user({ name: "O'Connor-Smith (Тест)" });
      database.run.mockResolvedValue({ lastID: 1, changes: 1 });

      const result = await User.create(userData);

      expect(result.success).toBe(true);
    });

    test('должен обрабатывать международные номера телефонов', async () => {
      const userData = TestDataGenerator.user({ phone: '+7-903-123-45-67' });
      database.run.mockResolvedValue({ lastID: 1, changes: 1 });

      const result = await User.create(userData);

      expect(result.success).toBe(true);
    });
  });
});
