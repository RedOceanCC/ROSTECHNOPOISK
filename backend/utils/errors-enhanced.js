// Расширенные кастомные классы ошибок для лучшей обработки

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

class BusinessLogicError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BusinessLogicError';
    this.statusCode = 409; // Conflict
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

class AuthorizationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = 403;
  }
}

class DatabaseError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'DatabaseError';
    this.statusCode = 500;
    this.originalError = originalError;
  }
}

class TelegramError extends Error {
  constructor(message, telegramId = null) {
    super(message);
    this.name = 'TelegramError';
    this.statusCode = 502; // Bad Gateway
    this.telegramId = telegramId;
  }
}

class RateLimitError extends Error {
  constructor(message, retryAfter = null) {
    super(message);
    this.name = 'RateLimitError';
    this.statusCode = 429; // Too Many Requests
    this.retryAfter = retryAfter;
  }
}

// Функция для обработки ошибок базы данных
function handleDatabaseError(error, operation) {
  console.error(`Database error during ${operation}:`, error);
  
  if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return new BusinessLogicError('Запись с такими данными уже существует');
  }
  
  if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    return new ValidationError('Ссылка на несуществующую запись');
  }
  
  if (error.code === 'SQLITE_CONSTRAINT_CHECK') {
    return new ValidationError('Данные не соответствуют ограничениям');
  }
  
  if (error.code === 'SQLITE_BUSY') {
    return new DatabaseError('База данных временно заблокирована, попробуйте позже', error);
  }
  
  return new DatabaseError(`Ошибка базы данных при выполнении операции: ${operation}`, error);
}

// Функция для обработки ошибок Telegram API
function handleTelegramError(error, telegramId = null) {
  console.error('Telegram API error:', error.message);
  
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;
    
    if (status === 429) {
      const retryAfter = data.parameters?.retry_after || 60;
      return new RateLimitError(`Превышен лимит запросов Telegram API. Повторите через ${retryAfter} секунд`, retryAfter);
    }
    
    if (status === 403) {
      return new TelegramError('Бот заблокирован пользователем или в чате', telegramId);
    }
    
    if (status === 400) {
      return new TelegramError(`Неверный запрос к Telegram API: ${data.description}`, telegramId);
    }
  }
  
  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    return new TelegramError('Нет подключения к Telegram API', telegramId);
  }
  
  return new TelegramError(`Ошибка Telegram API: ${error.message}`, telegramId);
}

// Функция для логирования ошибок с контекстом
function logError(error, context = {}) {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    name: error.name,
    message: error.message,
    statusCode: error.statusCode || 500,
    stack: error.stack,
    context
  };
  
  // Добавляем специфичную информацию для разных типов ошибок
  if (error instanceof TelegramError && error.telegramId) {
    errorInfo.telegramId = error.telegramId;
  }
  
  if (error instanceof RateLimitError && error.retryAfter) {
    errorInfo.retryAfter = error.retryAfter;
  }
  
  if (error instanceof DatabaseError && error.originalError) {
    errorInfo.originalError = {
      message: error.originalError.message,
      code: error.originalError.code
    };
  }
  
  console.error('Application Error:', JSON.stringify(errorInfo, null, 2));
  
  return errorInfo;
}

// Функция для создания стандартного ответа об ошибке
function createErrorResponse(error, req = null) {
  const errorInfo = logError(error, {
    url: req?.originalUrl,
    method: req?.method,
    userId: req?.user?.id,
    userAgent: req?.headers['user-agent']
  });
  
  // Не раскрываем детали системных ошибок пользователю
  const userMessage = error.statusCode < 500 ? error.message : 'Внутренняя ошибка сервера';
  
  return {
    success: false,
    error: userMessage,
    timestamp: errorInfo.timestamp,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  };
}

module.exports = {
  ValidationError,
  BusinessLogicError,
  NotFoundError,
  AuthorizationError,
  DatabaseError,
  TelegramError,
  RateLimitError,
  handleDatabaseError,
  handleTelegramError,
  logError,
  createErrorResponse
};
