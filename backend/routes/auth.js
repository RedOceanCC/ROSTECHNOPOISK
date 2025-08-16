const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { logRequest } = require('../middleware/auth');
const logger = require('../utils/logger');
const { validate } = require('../utils/validation');
const { userActionLogger, businessLogger } = require('../middleware/logging');

// Применяем логирование ко всем роутам
router.use(logRequest);

// POST /api/auth/login - Авторизация по паролю
router.post('/login', businessLogger('Попытка авторизации'), async (req, res, next) => {
  try {
    const { password } = req.body;
    const clientInfo = {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      origin: req.get('origin')
    };
    
    logger.info('Попытка авторизации', {
      ...clientInfo,
      timestamp: new Date().toISOString()
    });
    
    // Валидация входных данных
    const validation = validate('auth', 'login', { password });
    
    if (!validation.isValid) {
      const firstError = validation.firstError;
      logger.warn('Ошибка валидации при авторизации', {
        errors: validation.errors,
        ...clientInfo
      });
      
      return res.status(400).json({
        success: false,
        message: firstError.message,
        field: firstError.field,
        errors: validation.errors
      });
    }
    
    // Ищем пользователя по паролю
    logger.debug('Поиск пользователя по паролю');
    const user = await User.findByPassword(password);
    
    if (!user) {
      logger.security('Неудачная попытка авторизации - неверный пароль', {
        password: '***',
        ...clientInfo
      });
      
      return res.status(401).json({
        success: false,
        message: 'Неверный пароль. Проверьте правильность ввода.'
      });
    }
    
    // Проверяем статус пользователя
    if (user.status === 'inactive') {
      logger.security('Попытка авторизации заблокированным пользователем', {
        userId: user.id,
        userName: user.name,
        ...clientInfo
      });
      
      return res.status(403).json({
        success: false,
        message: 'Ваш аккаунт заблокирован. Обратитесь к администратору.'
      });
    }
    
    // Сохраняем пользователя в сессии
    req.session.user = user;
    
    // Отладочное логирование сессии
    logger.debug('Session после логина', {
      sessionId: req.sessionID,
      hasUser: !!req.session.user,
      userId: user.id,
      userName: user.name,
      userRole: user.role
    });
    
    // Логируем успешную авторизацию
    logger.auth('Успешная авторизация', user, {
      ...clientInfo,
      sessionId: req.sessionID
    });
    
    logger.userAction(user, 'Вход в систему', {
      ...clientInfo
    });
    
    res.json({
      success: true,
      message: 'Авторизация успешна',
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        phone: user.phone,
        telegram_id: user.telegram_id,
        company_id: user.company_id,
        company_name: user.company_name
      }
    });
    
  } catch (error) {
    logger.error('Ошибка при авторизации', {
      error: error.message,
      stack: error.stack,
      requestBody: req.body,
      ip: req.ip || req.connection.remoteAddress
    });
    next(error);
  }
});

// POST /api/auth/logout - Выход из системы
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Ошибка при выходе из системы'
      });
    }
    
    res.json({
      success: true,
      message: 'Выход выполнен успешно'
    });
  });
});

// GET /api/auth/me - Получение информации о текущем пользователе
router.get('/me', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      success: false,
      message: 'Пользователь не авторизован'
    });
  }
  
  res.json({
    success: true,
    user: req.session.user
  });
});

// POST /api/auth/check-session - Проверка активности сессии
router.post('/check-session', (req, res) => {
  if (req.session && req.session.user) {
    res.json({
      success: true,
      authenticated: true,
      user: req.session.user
    });
  } else {
    res.json({
      success: true,
      authenticated: false
    });
  }
});

module.exports = router;
