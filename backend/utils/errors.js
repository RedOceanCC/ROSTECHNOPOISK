// Кастомные классы ошибок для лучшей обработки

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

module.exports = {
  ValidationError,
  BusinessLogicError,
  NotFoundError,
  AuthorizationError
};
