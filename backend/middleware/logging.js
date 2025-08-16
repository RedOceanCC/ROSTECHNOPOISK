const logger = require('../utils/logger');

// Middleware для логирования всех HTTP запросов
function requestLogger(req, res, next) {
  const startTime = Date.now();
  const originalSend = res.send;
  
  // Логируем входящий запрос
  logger.debug(`Входящий запрос: ${req.method} ${req.path}`, {
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    query: req.query,
    body: req.method !== 'GET' ? req.body : undefined,
    headers: {
      'user-agent': req.get('user-agent'),
      'content-type': req.get('content-type'),
      'origin': req.get('origin'),
      'referer': req.get('referer')
    },
    ip: req.ip || req.connection.remoteAddress,
    user: req.user ? {
      id: req.user.id,
      name: req.user.name,
      role: req.user.role
    } : null
  });

  // Перехватываем отправку ответа
  res.send = function(data) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // Определяем уровень логирования на основе статуса
    let logLevel = 'info';
    if (statusCode >= 500) {
      logLevel = 'error';
    } else if (statusCode >= 400) {
      logLevel = 'warn';
    } else if (duration > 1000) {
      logLevel = 'warn'; // Медленные запросы
    }

    // Логируем ответ
    logger[logLevel](`Ответ: ${req.method} ${req.path} - ${statusCode} (${duration}ms)`, {
      method: req.method,
      url: req.originalUrl,
      statusCode,
      duration,
      responseSize: data ? Buffer.byteLength(data, 'utf8') : 0,
      user: req.user ? {
        id: req.user.id,
        name: req.user.name,
        role: req.user.role
      } : null,
      ip: req.ip || req.connection.remoteAddress
    });

    // Логируем в API лог
    logger.api(req.method, req.originalUrl, req.user, statusCode, duration, {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      responseSize: data ? Buffer.byteLength(data, 'utf8') : 0
    });

    // Отправляем оригинальный ответ
    originalSend.call(this, data);
  };

  next();
}

// Middleware для логирования ошибок
function errorLogger(err, req, res, next) {
  const context = {
    method: req.method,
    url: req.originalUrl,
    body: req.body,
    query: req.query,
    params: req.params,
    user: req.user ? {
      id: req.user.id,
      name: req.user.name,
      role: req.user.role
    } : null,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    stack: err.stack
  };

  // Определяем тип ошибки для более точного логирования
  if (err.code === 'SQLITE_ERROR' || err.code === 'SQLITE_CONSTRAINT') {
    logger.error(`Ошибка базы данных: ${err.message}`, {
      errorCode: err.code,
      errno: err.errno,
      ...context
    });
  } else if (err.name === 'ValidationError') {
    logger.validation('Ошибка валидации', err.message, err.value, context);
  } else if (err.name === 'UnauthorizedError') {
    logger.security(`Неавторизованный доступ: ${err.message}`, context);
  } else {
    logger.error(`Общая ошибка: ${err.message}`, context);
  }

  next(err);
}

// Middleware для логирования действий пользователей
function userActionLogger(action) {
  return (req, res, next) => {
    if (req.user) {
      const details = {
        method: req.method,
        url: req.originalUrl,
        body: req.body,
        query: req.query,
        params: req.params,
        ip: req.ip || req.connection.remoteAddress
      };
      
      logger.userAction(req.user, action, details);
    }
    next();
  };
}

// Middleware для аудита изменений данных
function auditLogger(entityType) {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        let action = 'unknown';
        let entityId = 'unknown';
        
        // Определяем действие по HTTP методу
        switch (req.method) {
          case 'POST':
            action = 'создание';
            break;
          case 'PUT':
          case 'PATCH':
            action = 'обновление';
            entityId = req.params.id || 'unknown';
            break;
          case 'DELETE':
            action = 'удаление';
            entityId = req.params.id || 'unknown';
            break;
        }
        
        if (action !== 'unknown') {
          logger.audit(req.user, action, entityType, entityId, {
            requestBody: req.body,
            response: data
          });
        }
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
}

// Middleware для логирования производительности
function performanceLogger(operationName) {
  return (req, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      logger.performance(operationName || `${req.method} ${req.path}`, duration, {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        user: req.user ? req.user.id : null
      });
    });
    
    next();
  };
}

// Middleware для логирования бизнес-операций
function businessLogger(operation) {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        logger.business(operation, req.user, {
          requestData: req.body,
          responseData: data,
          method: req.method,
          url: req.originalUrl
        });
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
}

module.exports = {
  requestLogger,
  errorLogger,
  userActionLogger,
  auditLogger,
  performanceLogger,
  businessLogger
};
