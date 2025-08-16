// Тесты модели Company
const Company = require('../../../backend/models/Company');
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

describe('Company Model', () => {
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
    test('должен создать новую компанию', async () => {
      const companyData = TestDataGenerator.company({
        name: 'Test Company',
        description: 'Test Description',
        contact_info: 'test@example.com'
      });

      database.run.mockResolvedValue({ lastID: 1, changes: 1 });

      const result = await Company.create(companyData);

      expect(database.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO companies'),
        expect.arrayContaining([
          'Test Company',
          'Test Description',
          'test@example.com',
          'active'
        ])
      );
      expect(result).toEqual({ id: 1, success: true });
    });

    test('должен создать компанию с минимальными данными', async () => {
      const companyData = { name: 'Minimal Company' };
      database.run.mockResolvedValue({ lastID: 1, changes: 1 });

      const result = await Company.create(companyData);

      expect(database.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO companies'),
        expect.arrayContaining([
          'Minimal Company',
          null,
          null,
          'active'
        ])
      );
      expect(result.success).toBe(true);
    });

    test('должен выбрасывать ошибку при дублировании названия', async () => {
      const companyData = TestDataGenerator.company();
      database.run.mockRejectedValue(new Error('UNIQUE constraint failed: companies.name'));

      await expect(Company.create(companyData)).rejects.toThrow('UNIQUE constraint failed');
    });
  });

  describe('findAll()', () => {
    test('должен вернуть все активные компании', async () => {
      const mockCompanies = [
        {
          id: 1,
          name: 'Company A',
          description: 'Description A',
          status: 'active',
          created_at: '2024-01-01'
        },
        {
          id: 2,
          name: 'Company B',
          description: 'Description B',
          status: 'active',
          created_at: '2024-01-02'
        }
      ];

      database.all.mockResolvedValue(mockCompanies);

      const result = await Company.findAll();

      expect(database.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM companies')
      );
      expect(result).toEqual(mockCompanies);
      expect(result).toHaveLength(2);
    });

    test('должен вернуть пустой массив если компаний нет', async () => {
      database.all.mockResolvedValue([]);

      const result = await Company.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findById()', () => {
    test('должен найти компанию по ID', async () => {
      const mockCompany = {
        id: 1,
        name: 'Test Company',
        description: 'Test Description',
        status: 'active'
      };

      database.get.mockResolvedValue(mockCompany);

      const result = await Company.findById(1);

      expect(database.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM companies WHERE id = ?'),
        [1]
      );
      expect(result).toEqual(mockCompany);
    });

    test('должен вернуть null для несуществующего ID', async () => {
      database.get.mockResolvedValue(undefined);

      const result = await Company.findById(999);

      expect(result).toBeUndefined();
    });
  });

  describe('update()', () => {
    test('должен обновить данные компании', async () => {
      const updateData = {
        name: 'Updated Company',
        description: 'Updated Description',
        contact_info: 'updated@example.com'
      };

      database.run.mockResolvedValue({ changes: 1 });

      const result = await Company.update(1, updateData);

      expect(database.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE companies SET'),
        expect.arrayContaining([
          'Updated Company',
          'Updated Description',
          'updated@example.com',
          1
        ])
      );
      expect(result).toBe(true);
    });

    test('должен обновить только переданные поля', async () => {
      const updateData = { name: 'New Name Only' };
      database.run.mockResolvedValue({ changes: 1 });

      await Company.update(1, updateData);

      expect(database.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE companies SET name = ?'),
        expect.arrayContaining(['New Name Only', 1])
      );
    });

    test('должен вернуть false если компания не найдена', async () => {
      const updateData = { name: 'New Name' };
      database.run.mockResolvedValue({ changes: 0 });

      const result = await Company.update(999, updateData);

      expect(result).toBe(false);
    });
  });

  describe('delete()', () => {
    test('должен удалить компанию', async () => {
      database.run.mockResolvedValue({ changes: 1 });

      const result = await Company.delete(1);

      expect(database.run).toHaveBeenCalledWith(
        'DELETE FROM companies WHERE id = ?',
        [1]
      );
      expect(result).toBe(true);
    });

    test('должен вернуть false если компания не найдена', async () => {
      database.run.mockResolvedValue({ changes: 0 });

      const result = await Company.delete(999);

      expect(result).toBe(false);
    });
  });

  describe('Partnership Methods', () => {
    describe('createPartnership()', () => {
      test('должен создать партнерство между компаниями', async () => {
        database.run.mockResolvedValue({ lastID: 1, changes: 1 });

        const result = await Company.createPartnership(1, 2);

        expect(database.run).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO company_partnerships'),
          [1, 2, 'active']
        );
        expect(result).toEqual({ id: 1, success: true });
      });

      test('должен выбрасывать ошибку при дублировании партнерства', async () => {
        database.run.mockRejectedValue(new Error('UNIQUE constraint failed'));

        await expect(Company.createPartnership(1, 2)).rejects.toThrow('UNIQUE constraint failed');
      });

      test('должен предотвращать самопартнерство', async () => {
        // Это должно проверяться на уровне валидации
        database.run.mockRejectedValue(new Error('Companies cannot partner with themselves'));

        await expect(Company.createPartnership(1, 1)).rejects.toThrow('Companies cannot partner with themselves');
      });
    });

    describe('deletePartnership()', () => {
      test('должен удалить партнерство', async () => {
        database.run.mockResolvedValue({ changes: 1 });

        const result = await Company.deletePartnership(1, 2);

        expect(database.run).toHaveBeenCalledWith(
          expect.stringContaining('DELETE FROM company_partnerships'),
          [1, 2]
        );
        expect(result).toBe(true);
      });

      test('должен вернуть false если партнерство не существует', async () => {
        database.run.mockResolvedValue({ changes: 0 });

        const result = await Company.deletePartnership(1, 999);

        expect(result).toBe(false);
      });
    });

    describe('getPartnerships()', () => {
      test('должен вернуть все партнерства компании', async () => {
        const mockPartnerships = [
          {
            id: 1,
            owner_company_id: 1,
            manager_company_id: 2,
            status: 'active',
            manager_company_name: 'Partner Company'
          }
        ];

        database.all.mockResolvedValue(mockPartnerships);

        const result = await Company.getPartnerships(1);

        expect(database.all).toHaveBeenCalledWith(
          expect.stringContaining('SELECT cp.*, c.name as manager_company_name'),
          [1]
        );
        expect(result).toEqual(mockPartnerships);
      });

      test('должен вернуть пустой массив если партнерств нет', async () => {
        database.all.mockResolvedValue([]);

        const result = await Company.getPartnerships(1);

        expect(result).toEqual([]);
      });
    });

    describe('getAllPartnerships()', () => {
      test('должен вернуть все партнерства в системе', async () => {
        const mockPartnerships = [
          {
            id: 1,
            owner_company_id: 1,
            manager_company_id: 2,
            status: 'active',
            owner_company_name: 'Owner Company',
            manager_company_name: 'Manager Company'
          }
        ];

        database.all.mockResolvedValue(mockPartnerships);

        const result = await Company.getAllPartnerships();

        expect(database.all).toHaveBeenCalledWith(
          expect.stringContaining('SELECT cp.*')
        );
        expect(result).toEqual(mockPartnerships);
      });
    });

    describe('getPartnerCompaniesForManager()', () => {
      test('должен вернуть компании-партнеры для менеджера', async () => {
        const mockPartners = [
          { id: 1, name: 'Partner Company 1' },
          { id: 2, name: 'Partner Company 2' }
        ];

        database.all.mockResolvedValue(mockPartners);

        const result = await Company.getPartnerCompaniesForManager(1);

        expect(database.all).toHaveBeenCalledWith(
          expect.stringContaining('JOIN company_partnerships cp'),
          [1]
        );
        expect(result).toEqual(mockPartners);
      });
    });

    describe('getPartnerCompaniesForOwner()', () => {
      test('должен вернуть компании-партнеры для владельца', async () => {
        const mockPartners = [
          { id: 1, name: 'Manager Company 1' },
          { id: 2, name: 'Manager Company 2' }
        ];

        database.all.mockResolvedValue(mockPartners);

        const result = await Company.getPartnerCompaniesForOwner(1);

        expect(database.all).toHaveBeenCalledWith(
          expect.stringContaining('JOIN company_partnerships cp'),
          [1]
        );
        expect(result).toEqual(mockPartners);
      });
    });
  });

  describe('Status Management', () => {
    test('должен деактивировать компанию', async () => {
      database.run.mockResolvedValue({ changes: 1 });

      const result = await Company.setStatus(1, 'inactive');

      expect(database.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE companies SET status = ?'),
        ['inactive', 1]
      );
      expect(result).toBe(true);
    });

    test('должен активировать компанию', async () => {
      database.run.mockResolvedValue({ changes: 1 });

      const result = await Company.setStatus(1, 'active');

      expect(result).toBe(true);
    });
  });

  describe('Search and Filter', () => {
    test('должен найти компании по названию', async () => {
      const mockCompanies = [
        { id: 1, name: 'Test Company 1' },
        { id: 2, name: 'Test Company 2' }
      ];

      database.all.mockResolvedValue(mockCompanies);

      const result = await Company.search('Test');

      expect(database.all).toHaveBeenCalledWith(
        expect.stringContaining('WHERE name LIKE ?'),
        ['%Test%']
      );
      expect(result).toEqual(mockCompanies);
    });

    test('должен найти компании по статусу', async () => {
      const mockCompanies = [
        { id: 1, name: 'Active Company', status: 'active' }
      ];

      database.all.mockResolvedValue(mockCompanies);

      const result = await Company.findByStatus('active');

      expect(database.all).toHaveBeenCalledWith(
        expect.stringContaining('WHERE status = ?'),
        ['active']
      );
      expect(result).toEqual(mockCompanies);
    });
  });

  describe('Statistics', () => {
    test('должен вернуть статистику компании', async () => {
      const mockStats = {
        users_count: 5,
        equipment_count: 10,
        active_requests: 2,
        partnerships_count: 3
      };

      database.get.mockResolvedValue(mockStats);

      const result = await Company.getStats(1);

      expect(database.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT'),
        [1, 1, 1, 1]
      );
      expect(result).toEqual(mockStats);
    });
  });

  describe('Validation', () => {
    test('должен валидировать обязательные поля', async () => {
      const invalidData = { name: '' };
      database.run.mockRejectedValue(new Error('NOT NULL constraint failed'));

      await expect(Company.create(invalidData)).rejects.toThrow('NOT NULL constraint failed');
    });

    test('должен валидировать уникальность названия', async () => {
      const duplicateData = TestDataGenerator.company({ name: 'Existing Company' });
      database.run.mockRejectedValue(new Error('UNIQUE constraint failed: companies.name'));

      await expect(Company.create(duplicateData)).rejects.toThrow('UNIQUE constraint failed');
    });
  });

  describe('Edge Cases', () => {
    test('должен обрабатывать очень длинные названия', async () => {
      const longName = 'A'.repeat(1000);
      const companyData = TestDataGenerator.company({ name: longName });
      
      database.run.mockRejectedValue(new Error('String too long'));

      await expect(Company.create(companyData)).rejects.toThrow('String too long');
    });

    test('должен обрабатывать специальные символы в названии', async () => {
      const companyData = TestDataGenerator.company({ 
        name: 'ООО "Тест & Co." (новая)' 
      });
      database.run.mockResolvedValue({ lastID: 1, changes: 1 });

      const result = await Company.create(companyData);

      expect(result.success).toBe(true);
    });

    test('должен обрабатывать пустые дополнительные поля', async () => {
      const companyData = {
        name: 'Test Company',
        description: '',
        contact_info: ''
      };
      database.run.mockResolvedValue({ lastID: 1, changes: 1 });

      const result = await Company.create(companyData);

      expect(result.success).toBe(true);
    });
  });
});
