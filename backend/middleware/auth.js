// Middleware для проверки авторизации и ролей

// Проверка авторизации
const requireAuth = (req, res, next) => {
  // Отладочное логирование
  const logger = require('../utils/logger');
  logger.debug('Auth check', {
    hasSession: !!req.session,
    hasUser: !!(req.session && req.session.user),
    sessionId: req.sessionID,
    cookies: req.headers.cookie,
    userAgent: req.headers['user-agent']
  });
  
  if (!req.session || !req.session.user) {
    logger.warn('Authorization failed - no session or user', {
      hasSession: !!req.session,
      sessionId: req.sessionID,
      url: req.originalUrl,
      method: req.method
    });
    
    return res.status(401).json({
      success: false,
      message: 'Необходима авторизация'
    });
  }
  
  // Добавляем пользователя в объект запроса для удобства
  req.user = req.session.user;
  next();
};

// Проверка роли пользователя
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Необходима авторизация'
      });
    }
    
    // Если roles - строка, преобразуем в массив
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Недостаточно прав доступа'
      });
    }
    
    next();
  };
};

// Проверка, что пользователь является админом
const requireAdmin = requireRole('admin');

// Проверка, что пользователь является владельцем техники
const requireOwner = requireRole('owner');

// Проверка, что пользователь является менеджером
const requireManager = requireRole('manager');

// Проверка, что пользователь является владельцем или менеджером
const requireOwnerOrManager = requireRole(['owner', 'manager']);

// Проверка доступа к ресурсу владельца
const requireOwnerAccess = (req, res, next) => {
  const resourceOwnerId = parseInt(req.params.ownerId) || parseInt(req.body.owner_id);
  
  if (req.user.role === 'admin') {
    // Админ имеет доступ ко всем ресурсам
    return next();
  }
  
  if (req.user.role === 'owner' && req.user.id === resourceOwnerId) {
    // Владелец имеет доступ к своим ресурсам
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'Доступ запрещен'
  });
};

// Проверка доступа к ресурсу менеджера
const requireManagerAccess = (req, res, next) => {
  const resourceManagerId = parseInt(req.params.managerId) || parseInt(req.body.manager_id);
  
  if (req.user.role === 'admin') {
    // Админ имеет доступ ко всем ресурсам
    return next();
  }
  
  if (req.user.role === 'manager' && req.user.id === resourceManagerId) {
    // Менеджер имеет доступ к своим ресурсам
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'Доступ запрещен'
  });
};

// Middleware для логирования запросов
const logRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const user = req.session?.user ? `${req.session.user.name} (${req.session.user.role})` : 'Гость';
  
  console.log(`[${timestamp}] ${req.method} ${req.path} - ${user}`);
  next();
};

// Middleware для обработки ошибок
const errorHandler = (err, req, res, next) => {
  console.error('Ошибка сервера:', err);
  
  // Если ответ уже отправлен, передаем ошибку дальше
  if (res.headersSent) {
    return next(err);
  }
  
  // Определяем статус код
  let statusCode = 500;
  let message = 'Внутренняя ошибка сервера';
  
  if (err.message.includes('не найден')) {
    statusCode = 404;
    message = err.message;
  } else if (err.message.includes('уже существует') || err.message.includes('Партнерство уже существует')) {
    statusCode = 409;
    message = err.message;
  } else if (err.message.includes('Недостаточно прав') || err.message.includes('Доступ запрещен')) {
    statusCode = 403;
    message = err.message;
  } else if (err.message.includes('Необходима авторизация')) {
    statusCode = 401;
    message = err.message;
  } else if (err.message.includes('Неверный') || err.message.includes('не может быть')) {
    statusCode = 400;
    message = err.message;
  }
  
  res.status(statusCode).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Middleware для Telegram авторизации
const requireTelegramAuth = async (req, res, next) => {
  const logger = require('../utils/logger');
  
  try {
    // Проверяем разные способы передачи Telegram ID
    let telegramId = null;
    
    // 1. Из query параметров (для GET запросов)
    if (req.query.userId) {
      telegramId = req.query.userId;
    }
    // 2. Из body (для POST запросов)
    else if (req.body.userId) {
      telegramId = req.body.userId;
    }
    // 3. Из заголовков
    else if (req.headers['x-telegram-user-id']) {
      telegramId = req.headers['x-telegram-user-id'];
    }
    
    if (!telegramId) {
      logger.warn('Telegram авторизация не удалась - отсутствует Telegram ID', {
        url: req.originalUrl,
        method: req.method,
        hasQuery: !!req.query.userId,
        hasBody: !!req.body.userId,
        hasHeader: !!req.headers['x-telegram-user-id']
      });
      
      return res.status(401).json({
        success: false,
        message: 'Необходима Telegram авторизация'
      });
    }
    
    // Ищем пользователя по Telegram ID
    const User = require('../models/User');
    const user = await User.findByTelegramId(telegramId);
    
    if (!user) {
      logger.warn('Telegram авторизация не удалась - пользователь не найден', {
        telegramId,
        url: req.originalUrl,
        method: req.method
      });
      
      return res.status(403).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }
    
    // Добавляем пользователя в объект запроса
    req.user = user;
    
    logger.debug('Telegram авторизация успешна', {
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      telegramId,
      url: req.originalUrl
    });
    
    next();
    
  } catch (error) {
    logger.error('Ошибка Telegram авторизации', {
      error: error.message,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method
    });
    
    return res.status(500).json({
      success: false,
      message: 'Ошибка авторизации'
    });
  }
};

// Комбинированный middleware - проверяет как веб-сессию, так и Telegram авторизацию
const requireAuthOrTelegram = async (req, res, next) => {
  const logger = require('../utils/logger');
  
  // Сначала проверяем обычную веб-авторизацию
  if (req.session && req.session.user) {
    req.user = req.session.user;
    logger.debug('Авторизация через веб-сессию', {
      userId: req.user.id,
      userName: req.user.name,
      url: req.originalUrl
    });
    return next();
  }
  
  // Если веб-авторизации нет, пробуем Telegram
  return requireTelegramAuth(req, res, next);
};

// Middleware для валидации данных
const validateRequired = (fields) => {
  return (req, res, next) => {
    const missingFields = [];
    
    for (const field of fields) {
      if (!req.body[field] && req.body[field] !== 0 && req.body[field] !== false) {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Отсутствуют обязательные поля: ${missingFields.join(', ')}`
      });
    }
    
    next();
  };
};

module.exports = {
  requireAuth,
  requireTelegramAuth,
  requireAuthOrTelegram,
  requireRole,
  requireAdmin,
  requireOwner,
  requireManager,
  requireOwnerOrManager,
  requireOwnerAccess,
  requireManagerAccess,
  logRequest,
  errorHandler,
  validateRequired
};
