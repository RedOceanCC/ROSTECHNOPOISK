// Тесты API маршрутов компаний
const request = require('supertest');
const express = require('express');
const session = require('express-session');
const companiesRoutes = require('../../../backend/routes/companies');
const Company = require('../../../backend/models/Company');
const { createMockReq, createMockRes, TestDataGenerator } = require('../../config/test-helpers');

// Создаем тестовое приложение
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
  }));
  
  // Мок middleware авторизации
  app.use((req, res, next) => {
    req.user = req.headers.authorization ? {
      id: 1,
      role: req.headers.authorization.split(' ')[1] || 'admin'
    } : null;
    next();
  });
  
  app.use('/api/companies', companiesRoutes);
  
  // Middleware для ошибок
  app.use((err, req, res, next) => {
    res.status(500).json({ success: false, message: err.message });
  });
  
  return app;
}

// Мок для модели Company
jest.mock('../../../backend/models/Company');

describe('Companies Routes', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('GET /api/companies', () => {
    test('должен вернуть список всех компаний для админа', async () => {
      const mockCompanies = [
        {
          id: 1,
          name: 'Company A',
          description: 'Description A',
          status: 'active'
        },
        {
          id: 2,
          name: 'Company B',
          description: 'Description B',
          status: 'active'
        }
      ];

      Company.findAll.mockResolvedValue(mockCompanies);

      const response = await request(app)
        .get('/api/companies')
        .set('Authorization', 'Bearer admin');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        companies: mockCompanies
      });
      expect(Company.findAll).toHaveBeenCalled();
    });

    test('должен требовать авторизацию', async () => {
      const response = await request(app)
        .get('/api/companies');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        message: 'Требуется авторизация'
      });
    });

    test('должен требовать роль админа', async () => {
      const response = await request(app)
        .get('/api/companies')
        .set('Authorization', 'Bearer owner');

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        success: false,
        message: 'Доступ запрещен'
      });
    });

    test('должен обрабатывать ошибки базы данных', async () => {
      Company.findAll.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/companies')
        .set('Authorization', 'Bearer admin');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    test('должен вернуть пустой массив если компаний нет', async () => {
      Company.findAll.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/companies')
        .set('Authorization', 'Bearer admin');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        companies: []
      });
    });
  });

  describe('GET /api/companies/:id', () => {
    test('должен вернуть компанию по ID', async () => {
      const mockCompany = {
        id: 1,
        name: 'Test Company',
        description: 'Test Description',
        status: 'active'
      };

      Company.findById.mockResolvedValue(mockCompany);

      const response = await request(app)
        .get('/api/companies/1')
        .set('Authorization', 'Bearer admin');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        company: mockCompany
      });
      expect(Company.findById).toHaveBeenCalledWith(1);
    });

    test('должен вернуть 404 для несуществующей компании', async () => {
      Company.findById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/companies/999')
        .set('Authorization', 'Bearer admin');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        message: 'Компания не найдена'
      });
    });

    test('должен валидировать числовой ID', async () => {
      const response = await request(app)
        .get('/api/companies/invalid-id')
        .set('Authorization', 'Bearer admin');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'Некорректный ID компании'
      });
    });
  });

  describe('POST /api/companies', () => {
    test('должен создать новую компанию', async () => {
      const newCompanyData = TestDataGenerator.company({
        name: 'New Company',
        description: 'New Description',
        contact_info: 'contact@new.com'
      });

      Company.create.mockResolvedValue({ id: 1, success: true });

      const response = await request(app)
        .post('/api/companies')
        .set('Authorization', 'Bearer admin')
        .send(newCompanyData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        message: 'Компания создана успешно',
        company_id: 1
      });
      expect(Company.create).toHaveBeenCalledWith(newCompanyData);
    });

    test('должен валидировать обязательные поля', async () => {
      const invalidData = {};

      const response = await request(app)
        .post('/api/companies')
        .set('Authorization', 'Bearer admin')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('обязательно');
    });

    test('должен валидировать длину названия', async () => {
      const invalidData = {
        name: 'AB' // слишком короткое
      };

      const response = await request(app)
        .post('/api/companies')
        .set('Authorization', 'Bearer admin')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('минимум 3 символа');
    });

    test('должен обрабатывать дублирование названия', async () => {
      const companyData = TestDataGenerator.company();
      Company.create.mockRejectedValue(new Error('UNIQUE constraint failed: companies.name'));

      const response = await request(app)
        .post('/api/companies')
        .set('Authorization', 'Bearer admin')
        .send(companyData);

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        success: false,
        message: 'Компания с таким названием уже существует'
      });
    });

    test('должен обрезать лишние пробелы', async () => {
      const companyData = {
        name: '  Test Company  ',
        description: '  Test Description  '
      };

      Company.create.mockResolvedValue({ id: 1, success: true });

      await request(app)
        .post('/api/companies')
        .set('Authorization', 'Bearer admin')
        .send(companyData);

      expect(Company.create).toHaveBeenCalledWith({
        name: 'Test Company',
        description: 'Test Description'
      });
    });
  });

  describe('PUT /api/companies/:id', () => {
    test('должен обновить данные компании', async () => {
      const updateData = {
        name: 'Updated Company',
        description: 'Updated Description'
      };

      Company.update.mockResolvedValue(true);

      const response = await request(app)
        .put('/api/companies/1')
        .set('Authorization', 'Bearer admin')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Компания обновлена успешно'
      });
      expect(Company.update).toHaveBeenCalledWith(1, updateData);
    });

    test('должен вернуть 404 для несуществующей компании', async () => {
      const updateData = { name: 'Updated Name' };
      Company.update.mockResolvedValue(false);

      const response = await request(app)
        .put('/api/companies/999')
        .set('Authorization', 'Bearer admin')
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        message: 'Компания не найдена'
      });
    });

    test('должен валидировать данные для обновления', async () => {
      const invalidData = {
        name: '' // пустое название
      };

      const response = await request(app)
        .put('/api/companies/1')
        .set('Authorization', 'Bearer admin')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/companies/:id', () => {
    test('должен удалить компанию', async () => {
      Company.delete.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/companies/1')
        .set('Authorization', 'Bearer admin');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Компания удалена успешно'
      });
      expect(Company.delete).toHaveBeenCalledWith(1);
    });

    test('должен вернуть 404 для несуществующей компании', async () => {
      Company.delete.mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/companies/999')
        .set('Authorization', 'Bearer admin');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        message: 'Компания не найдена'
      });
    });

    test('должен обрабатывать ошибки связанных данных', async () => {
      Company.delete.mockRejectedValue(new Error('FOREIGN KEY constraint failed'));

      const response = await request(app)
        .delete('/api/companies/1')
        .set('Authorization', 'Bearer admin');

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        success: false,
        message: 'Невозможно удалить компанию с привязанными пользователями или техникой'
      });
    });
  });

  describe('Partnership Routes', () => {
    describe('GET /api/companies/:id/partnerships', () => {
      test('должен вернуть партнерства компании', async () => {
        const mockPartnerships = [
          {
            id: 1,
            owner_company_id: 1,
            manager_company_id: 2,
            status: 'active',
            manager_company_name: 'Partner Company'
          }
        ];

        Company.getPartnerships.mockResolvedValue(mockPartnerships);

        const response = await request(app)
          .get('/api/companies/1/partnerships')
          .set('Authorization', 'Bearer admin');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          success: true,
          partnerships: mockPartnerships
        });
        expect(Company.getPartnerships).toHaveBeenCalledWith(1);
      });
    });

    describe('POST /api/companies/:id/partnerships', () => {
      test('должен создать партнерство', async () => {
        const partnershipData = { manager_company_id: 2 };
        Company.createPartnership.mockResolvedValue({ id: 1, success: true });

        const response = await request(app)
          .post('/api/companies/1/partnerships')
          .set('Authorization', 'Bearer admin')
          .send(partnershipData);

        expect(response.status).toBe(201);
        expect(response.body).toEqual({
          success: true,
          message: 'Партнерство создано успешно',
          partnership_id: 1
        });
        expect(Company.createPartnership).toHaveBeenCalledWith(1, 2);
      });

      test('должен предотвращать самопартнерство', async () => {
        const partnershipData = { manager_company_id: 1 };

        const response = await request(app)
          .post('/api/companies/1/partnerships')
          .set('Authorization', 'Bearer admin')
          .send(partnershipData);

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          success: false,
          message: 'Компания не может создать партнерство с самой собой'
        });
      });

      test('должен обрабатывать дублирование партнерства', async () => {
        const partnershipData = { manager_company_id: 2 };
        Company.createPartnership.mockRejectedValue(new Error('UNIQUE constraint failed'));

        const response = await request(app)
          .post('/api/companies/1/partnerships')
          .set('Authorization', 'Bearer admin')
          .send(partnershipData);

        expect(response.status).toBe(409);
        expect(response.body).toEqual({
          success: false,
          message: 'Партнерство уже существует'
        });
      });
    });

    describe('DELETE /api/companies/:id/partnerships/:partnerId', () => {
      test('должен удалить партнерство', async () => {
        Company.deletePartnership.mockResolvedValue(true);

        const response = await request(app)
          .delete('/api/companies/1/partnerships/2')
          .set('Authorization', 'Bearer admin');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          success: true,
          message: 'Партнерство удалено успешно'
        });
        expect(Company.deletePartnership).toHaveBeenCalledWith(1, 2);
      });

      test('должен вернуть 404 для несуществующего партнерства', async () => {
        Company.deletePartnership.mockResolvedValue(false);

        const response = await request(app)
          .delete('/api/companies/1/partnerships/999')
          .set('Authorization', 'Bearer admin');

        expect(response.status).toBe(404);
        expect(response.body).toEqual({
          success: false,
          message: 'Партнерство не найдено'
        });
      });
    });

    describe('GET /api/companies/partnerships', () => {
      test('должен вернуть все партнерства', async () => {
        const mockPartnerships = [
          {
            id: 1,
            owner_company_id: 1,
            manager_company_id: 2,
            status: 'active'
          }
        ];

        Company.getAllPartnerships.mockResolvedValue(mockPartnerships);

        const response = await request(app)
          .get('/api/companies/partnerships')
          .set('Authorization', 'Bearer admin');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          success: true,
          partnerships: mockPartnerships
        });
      });
    });
  });

  describe('Access Control', () => {
    test('только админы должны создавать компании', async () => {
      const companyData = TestDataGenerator.company();

      const response = await request(app)
        .post('/api/companies')
        .set('Authorization', 'Bearer manager')
        .send(companyData);

      expect(response.status).toBe(403);
    });

    test('только админы должны удалять компании', async () => {
      const response = await request(app)
        .delete('/api/companies/1')
        .set('Authorization', 'Bearer owner');

      expect(response.status).toBe(403);
    });

    test('только админы должны управлять партнерствами', async () => {
      const response = await request(app)
        .post('/api/companies/1/partnerships')
        .set('Authorization', 'Bearer manager')
        .send({ manager_company_id: 2 });

      expect(response.status).toBe(403);
    });
  });

  describe('Input Sanitization', () => {
    test('должен санитизировать HTML в названии', async () => {
      const companyData = {
        name: '<script>alert("xss")</script>Test Company',
        description: '<b>Bold</b> description'
      };

      Company.create.mockResolvedValue({ id: 1, success: true });

      await request(app)
        .post('/api/companies')
        .set('Authorization', 'Bearer admin')
        .send(companyData);

      const callArgs = Company.create.mock.calls[0][0];
      expect(callArgs.name).not.toContain('<script>');
      expect(callArgs.description).not.toContain('<b>');
    });

    test('должен обрабатывать специальные символы в названии', async () => {
      const companyData = {
        name: 'ООО "Тест & Co." (новая)'
      };

      Company.create.mockResolvedValue({ id: 1, success: true });

      const response = await request(app)
        .post('/api/companies')
        .set('Authorization', 'Bearer admin')
        .send(companyData);

      expect(response.status).toBe(201);
    });
  });

  describe('Edge Cases', () => {
    test('должен обрабатывать очень длинные названия', async () => {
      const companyData = {
        name: 'A'.repeat(1000)
      };

      const response = await request(app)
        .post('/api/companies')
        .set('Authorization', 'Bearer admin')
        .send(companyData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('слишком длинное');
    });

    test('должен обрабатывать пустые дополнительные поля', async () => {
      const companyData = {
        name: 'Test Company',
        description: '',
        contact_info: ''
      };

      Company.create.mockResolvedValue({ id: 1, success: true });

      const response = await request(app)
        .post('/api/companies')
        .set('Authorization', 'Bearer admin')
        .send(companyData);

      expect(response.status).toBe(201);
    });
  });
});
