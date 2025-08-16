// Тесты API маршрутов аутентификации
const request = require('supertest');
const express = require('express');
const session = require('express-session');
const authRoutes = require('../../../backend/routes/auth');
const User = require('../../../backend/models/User');
const bcrypt = require('bcrypt');

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
  app.use('/api/auth', authRoutes);
  
  // Middleware для ошибок
  app.use((err, req, res, next) => {
    res.status(500).json({ success: false, message: err.message });
  });
  
  return app;
}

// Мок для модели User
jest.mock('../../../backend/models/User');

describe('Auth Routes', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    test('должен успешно авторизовать пользователя с правильными данными', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        phone: '+1234567890',
        role: 'owner',
        company_id: 1
      };

      User.findByPhone.mockResolvedValue(mockUser);
      User.verifyPassword.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '+1234567890',
          password: 'correctpassword'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Вход выполнен успешно',
        user: {
          id: 1,
          name: 'Test User',
          role: 'owner'
        }
      });

      expect(User.findByPhone).toHaveBeenCalledWith('+1234567890');
      expect(User.verifyPassword).toHaveBeenCalledWith(1, 'correctpassword');
    });

    test('должен отклонить вход с неправильным паролем', async () => {
      const mockUser = {
        id: 1,
        phone: '+1234567890'
      };

      User.findByPhone.mockResolvedValue(mockUser);
      User.verifyPassword.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '+1234567890',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        message: 'Неверный телефон или пароль'
      });
    });

    test('должен отклонить вход с несуществующим пользователем', async () => {
      User.findByPhone.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '+9999999999',
          password: 'anypassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        message: 'Неверный телефон или пароль'
      });
    });

    test('должен валидировать обязательные поля', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('обязательно');
    });

    test('должен валидировать формат телефона', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: 'invalid-phone',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('формат телефона');
    });

    test('должен валидировать минимальную длину пароля', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '+1234567890',
          password: '123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('минимум 6 символов');
    });

    test('должен устанавливать сессию при успешном входе', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        role: 'owner'
      };

      User.findByPhone.mockResolvedValue(mockUser);
      User.verifyPassword.mockResolvedValue(true);

      const agent = request.agent(app);
      
      const response = await agent
        .post('/api/auth/login')
        .send({
          phone: '+1234567890',
          password: 'correctpassword'
        });

      expect(response.status).toBe(200);
      
      // Проверяем что сессия установлена (cookie должен быть установлен)
      expect(response.headers['set-cookie']).toBeDefined();
    });

    test('должен обрабатывать ошибки базы данных', async () => {
      User.findByPhone.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '+1234567890',
          password: 'password123'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Внутренняя ошибка сервера');
    });
  });

  describe('POST /api/auth/logout', () => {
    test('должен успешно завершить сессию', async () => {
      const agent = request.agent(app);
      
      // Сначала авторизуемся
      const mockUser = { id: 1, name: 'Test User', role: 'owner' };
      User.findByPhone.mockResolvedValue(mockUser);
      User.verifyPassword.mockResolvedValue(true);

      await agent
        .post('/api/auth/login')
        .send({
          phone: '+1234567890',
          password: 'password123'
        });

      // Затем выходим
      const response = await agent
        .post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Выход выполнен успешно'
      });
    });

    test('должен работать даже если пользователь не авторизован', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/auth/me', () => {
    test('должен вернуть данные авторизованного пользователя', async () => {
      const agent = request.agent(app);
      
      // Сначала авторизуемся
      const mockUser = {
        id: 1,
        name: 'Test User',
        phone: '+1234567890',
        role: 'owner',
        company_id: 1
      };
      
      User.findByPhone.mockResolvedValue(mockUser);
      User.verifyPassword.mockResolvedValue(true);
      User.findById.mockResolvedValue(mockUser);

      await agent
        .post('/api/auth/login')
        .send({
          phone: '+1234567890',
          password: 'password123'
        });

      // Получаем данные пользователя
      const response = await agent
        .get('/api/auth/me');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toEqual({
        id: 1,
        name: 'Test User',
        phone: '+1234567890',
        role: 'owner',
        company_id: 1
      });
    });

    test('должен вернуть ошибку для неавторизованного пользователя', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        message: 'Требуется авторизация'
      });
    });

    test('должен обрабатывать случай когда пользователь удален', async () => {
      const agent = request.agent(app);
      
      // Авторизуемся
      const mockUser = { id: 1, name: 'Test User', role: 'owner' };
      User.findByPhone.mockResolvedValue(mockUser);
      User.verifyPassword.mockResolvedValue(true);

      await agent
        .post('/api/auth/login')
        .send({
          phone: '+1234567890',
          password: 'password123'
        });

      // Пользователь удален из БД
      User.findById.mockResolvedValue(null);

      const response = await agent
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        message: 'Пользователь не найден'
      });
    });
  });

  describe('Security', () => {
    test('должен предотвращать SQL инъекции в телефоне', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: "'; DROP TABLE users; --",
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('должен предотвращать чрезмерно длинные пароли', async () => {
      const longPassword = 'a'.repeat(1000);
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '+1234567890',
          password: longPassword
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('должен безопасно обрабатывать специальные символы', async () => {
      User.findByPhone.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '+1234567890',
          password: '<script>alert("xss")</script>'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).not.toContain('<script>');
    });
  });

  describe('Rate Limiting Simulation', () => {
    test('должен обрабатывать множественные запросы', async () => {
      User.findByPhone.mockResolvedValue(null);

      const requests = Array(5).fill().map(() =>
        request(app)
          .post('/api/auth/login')
          .send({
            phone: '+1234567890',
            password: 'wrongpassword'
          })
      );

      const responses = await Promise.all(requests);

      // Все запросы должны вернуть 401
      responses.forEach(response => {
        expect(response.status).toBe(401);
      });
    });
  });

  describe('Session Management', () => {
    test('сессия должна сохраняться между запросами', async () => {
      const agent = request.agent(app);
      
      const mockUser = {
        id: 1,
        name: 'Test User',
        role: 'owner'
      };
      
      User.findByPhone.mockResolvedValue(mockUser);
      User.verifyPassword.mockResolvedValue(true);
      User.findById.mockResolvedValue(mockUser);

      // Авторизуемся
      await agent
        .post('/api/auth/login')
        .send({
          phone: '+1234567890',
          password: 'password123'
        });

      // Делаем запрос от того же агента
      const response = await agent
        .get('/api/auth/me');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('разные сессии должны быть изолированы', async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);
      
      const mockUser = { id: 1, name: 'Test User', role: 'owner' };
      User.findByPhone.mockResolvedValue(mockUser);
      User.verifyPassword.mockResolvedValue(true);

      // Авторизуемся только первым агентом
      await agent1
        .post('/api/auth/login')
        .send({
          phone: '+1234567890',
          password: 'password123'
        });

      // Второй агент не должен быть авторизован
      const response = await agent2
        .get('/api/auth/me');

      expect(response.status).toBe(401);
    });
  });

  describe('Edge Cases', () => {
    test('должен обрабатывать пустые строки', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '',
          password: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('должен обрабатывать null значения', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: null,
          password: null
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('должен обрабатывать отсутствующие поля', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '+1234567890'
          // password отсутствует
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
