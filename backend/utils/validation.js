const logger = require('./logger');

class ValidationError extends Error {
  constructor(field, message, value = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
    this.isValidationError = true;
  }
}

class Validator {
  constructor() {
    this.errors = [];
  }

  // Очистка ошибок
  reset() {
    this.errors = [];
    return this;
  }

  // Добавление ошибки
  addError(field, message, value = null) {
    this.errors.push({
      field,
      message,
      value
    });
    logger.validation(field, message, value);
    return this;
  }

  // Проверка наличия ошибок
  hasErrors() {
    return this.errors.length > 0;
  }

  // Получение всех ошибок
  getErrors() {
    return this.errors;
  }

  // Получение первой ошибки
  getFirstError() {
    return this.errors.length > 0 ? this.errors[0] : null;
  }

  // Выброс исключения если есть ошибки
  throwIfErrors() {
    if (this.hasErrors()) {
      const firstError = this.getFirstError();
      throw new ValidationError(firstError.field, firstError.message, firstError.value);
    }
  }

  // Базовые валидаторы
  required(value, field) {
    if (value === undefined || value === null || value === '') {
      this.addError(field, `Поле "${field}" обязательно для заполнения`, value);
    }
    return this;
  }

  string(value, field, options = {}) {
    if (value !== undefined && value !== null && typeof value !== 'string') {
      this.addError(field, `Поле "${field}" должно быть строкой`, value);
      return this;
    }

    if (value && options.minLength && value.length < options.minLength) {
      this.addError(field, `Поле "${field}" должно содержать минимум ${options.minLength} символов`, value);
    }

    if (value && options.maxLength && value.length > options.maxLength) {
      this.addError(field, `Поле "${field}" должно содержать максимум ${options.maxLength} символов`, value);
    }

    if (value && options.pattern && !options.pattern.test(value)) {
      this.addError(field, `Поле "${field}" имеет неверный формат`, value);
    }

    return this;
  }

  number(value, field, options = {}) {
    if (value !== undefined && value !== null) {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        this.addError(field, `Поле "${field}" должно быть числом`, value);
        return this;
      }

      if (options.min !== undefined && numValue < options.min) {
        this.addError(field, `Поле "${field}" должно быть не менее ${options.min}`, value);
      }

      if (options.max !== undefined && numValue > options.max) {
        this.addError(field, `Поле "${field}" должно быть не более ${options.max}`, value);
      }

      if (options.integer && !Number.isInteger(numValue)) {
        this.addError(field, `Поле "${field}" должно быть целым числом`, value);
      }
    }

    return this;
  }

  email(value, field) {
    if (value) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(value)) {
        this.addError(field, `Поле "${field}" должно быть корректным email адресом`, value);
      }
    }
    return this;
  }

  phone(value, field) {
    if (value) {
      // Российский номер телефона
      const phonePattern = /^(\+7|7|8)?[\s\-]?\(?[489][0-9]{2}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/;
      if (!phonePattern.test(value.replace(/[\s\-\(\)]/g, ''))) {
        this.addError(field, `Поле "${field}" должно быть корректным номером телефона`, value);
      }
    }
    return this;
  }

  date(value, field, options = {}) {
    if (value) {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        this.addError(field, `Поле "${field}" должно быть корректной датой`, value);
        return this;
      }

      if (options.future && date <= new Date()) {
        this.addError(field, `Поле "${field}" должно быть датой в будущем`, value);
      }

      if (options.past && date >= new Date()) {
        this.addError(field, `Поле "${field}" должно быть датой в прошлом`, value);
      }
    }

    return this;
  }

  oneOf(value, field, allowedValues) {
    if (value && !allowedValues.includes(value)) {
      this.addError(field, `Поле "${field}" должно быть одним из: ${allowedValues.join(', ')}`, value);
    }
    return this;
  }

  boolean(value, field) {
    if (value !== undefined && value !== null && typeof value !== 'boolean') {
      this.addError(field, `Поле "${field}" должно быть булевым значением`, value);
    }
    return this;
  }

  array(value, field, options = {}) {
    if (value !== undefined && value !== null && !Array.isArray(value)) {
      this.addError(field, `Поле "${field}" должно быть массивом`, value);
      return this;
    }

    if (value && options.minLength && value.length < options.minLength) {
      this.addError(field, `Поле "${field}" должно содержать минимум ${options.minLength} элементов`, value);
    }

    if (value && options.maxLength && value.length > options.maxLength) {
      this.addError(field, `Поле "${field}" должно содержать максимум ${options.maxLength} элементов`, value);
    }

    return this;
  }

  // Специализированные валидаторы для проекта
  equipmentType(value, field) {
    const validTypes = [
      'Самосвал', 'Автокран (колёсный)', 'Каток', 'Экскаватор (гусеничный)',
      'Экскаватор (колёсный)', 'Экскаватор (неполноповоротный)', 
      'Фронтальный погрузчик', 'Грейдер', 'Бульдозер', 'Скрепер',
      'Дорожная фреза', 'Асфальтоукладчик', 'Автогидроподъёмник',
      'Автовышка', 'Автобетономешалка', 'Автобетононасос',
      'Низкорамный трал', 'Манипулятор', 'Буровая установка'
    ];

    return this.oneOf(value, field, validTypes);
  }

  userRole(value, field) {
    return this.oneOf(value, field, ['admin', 'owner', 'manager']);
  }

  equipmentStatus(value, field) {
    return this.oneOf(value, field, ['available', 'busy', 'maintenance']);
  }

  requestStatus(value, field) {
    return this.oneOf(value, field, ['auction_active', 'auction_closed', 'completed', 'cancelled']);
  }

  bidStatus(value, field) {
    return this.oneOf(value, field, ['pending', 'winner', 'loser']);
  }

  password(value, field) {
    if (value) {
      if (value.length < 6) {
        this.addError(field, `Пароль должен содержать минимум 6 символов`, '***');
      }
      if (value.length > 100) {
        this.addError(field, `Пароль слишком длинный (максимум 100 символов)`, '***');
      }
    }
    return this;
  }

  licensePlate(value, field) {
    if (value) {
      // Российские номерные знаки
      const platePattern = /^[АВЕКМНОРСТУХ]\d{3}[АВЕКМНОРСТУХ]{2}\d{2,3}$/i;
      if (!platePattern.test(value.replace(/[\s\-]/g, ''))) {
        this.addError(field, `Поле "${field}" должно быть корректным номером (например: А123БВ77)`, value);
      }
    }
    return this;
  }

  // Кастомная валидация
  custom(value, field, validatorFn, errorMessage) {
    try {
      if (!validatorFn(value)) {
        this.addError(field, errorMessage || `Поле "${field}" не прошло валидацию`, value);
      }
    } catch (error) {
      this.addError(field, `Ошибка валидации поля "${field}": ${error.message}`, value);
    }
    return this;
  }
}

// Предустановленные схемы валидации
const validationSchemas = {
  user: {
    create: (data) => new Validator()
      .required(data.password, 'password')
      .password(data.password, 'password')
      .required(data.role, 'role')
      .userRole(data.role, 'role')
      .required(data.name, 'name')
      .string(data.name, 'name', { minLength: 2, maxLength: 100 })
      .phone(data.phone, 'phone')
      .number(data.company_id, 'company_id', { integer: true, min: 1 }),
    
    update: (data) => new Validator()
      .password(data.password, 'password')
      .userRole(data.role, 'role')
      .string(data.name, 'name', { minLength: 2, maxLength: 100 })
      .phone(data.phone, 'phone')
      .number(data.company_id, 'company_id', { integer: true, min: 1 })
  },

  equipment: {
    create: (data) => new Validator()
      .required(data.name, 'name')
      .string(data.name, 'name', { minLength: 2, maxLength: 200 })
      .required(data.type, 'type')
      .equipmentType(data.type, 'type')
      .required(data.subtype, 'subtype')
      .string(data.subtype, 'subtype', { minLength: 1, maxLength: 100 })
      .required(data.owner_name, 'owner_name')
      .string(data.owner_name, 'owner_name', { minLength: 2, maxLength: 100 })
      .required(data.phone, 'phone')
      .phone(data.phone, 'phone')
      .licensePlate(data.license_plate, 'license_plate')
      .boolean(data.is_off_road, 'is_off_road')
      .string(data.additional_equipment, 'additional_equipment', { maxLength: 500 })
      .string(data.description, 'description', { maxLength: 1000 })
      .number(data.hourly_rate, 'hourly_rate', { min: 0 })
      .number(data.daily_rate, 'daily_rate', { min: 0 })
      .string(data.location, 'location', { maxLength: 200 }),

    update: (data) => new Validator()
      .string(data.name, 'name', { minLength: 2, maxLength: 200 })
      .equipmentType(data.type, 'type')
      .string(data.subtype, 'subtype', { minLength: 1, maxLength: 100 })
      .string(data.owner_name, 'owner_name', { minLength: 2, maxLength: 100 })
      .phone(data.phone, 'phone')
      .licensePlate(data.license_plate, 'license_plate')
      .boolean(data.is_off_road, 'is_off_road')
      .string(data.additional_equipment, 'additional_equipment', { maxLength: 500 })
      .string(data.description, 'description', { maxLength: 1000 })
      .number(data.hourly_rate, 'hourly_rate', { min: 0 })
      .number(data.daily_rate, 'daily_rate', { min: 0 })
      .string(data.location, 'location', { maxLength: 200 })
      .equipmentStatus(data.status, 'status')
  },

  rentalRequest: {
    create: (data) => new Validator()
      .required(data.equipment_type, 'equipment_type')
      .equipmentType(data.equipment_type, 'equipment_type')
      .required(data.equipment_subtype, 'equipment_subtype')
      .string(data.equipment_subtype, 'equipment_subtype', { minLength: 1, maxLength: 100 })
      .required(data.start_date, 'start_date')
      .date(data.start_date, 'start_date', { future: true })
      .required(data.end_date, 'end_date')
      .date(data.end_date, 'end_date', { future: true })
      .required(data.location, 'location')
      .string(data.location, 'location', { minLength: 2, maxLength: 200 })
      .string(data.work_description, 'work_description', { maxLength: 1000 })
      .custom(data, 'end_date', (data) => {
        if (data.start_date && data.end_date) {
          return new Date(data.end_date) > new Date(data.start_date);
        }
        return true;
      }, 'Дата окончания должна быть позже даты начала'),

    update: (data) => new Validator()
      .equipmentType(data.equipment_type, 'equipment_type')
      .string(data.equipment_subtype, 'equipment_subtype', { minLength: 1, maxLength: 100 })
      .date(data.start_date, 'start_date', { future: true })
      .date(data.end_date, 'end_date', { future: true })
      .string(data.location, 'location', { minLength: 2, maxLength: 200 })
      .string(data.work_description, 'work_description', { maxLength: 1000 })
      .requestStatus(data.status, 'status')
  },

  rentalBid: {
    create: (data) => new Validator()
      .required(data.request_id, 'request_id')
      .number(data.request_id, 'request_id', { integer: true, min: 1 })
      .required(data.equipment_id, 'equipment_id')
      .number(data.equipment_id, 'equipment_id', { integer: true, min: 1 })
      .required(data.hourly_rate, 'hourly_rate')
      .number(data.hourly_rate, 'hourly_rate', { min: 1 })
      .required(data.daily_rate, 'daily_rate')
      .number(data.daily_rate, 'daily_rate', { min: 1 })
      .required(data.total_price, 'total_price')
      .number(data.total_price, 'total_price', { min: 1 })
      .string(data.comment, 'comment', { maxLength: 1000 }),

    update: (data) => new Validator()
      .number(data.hourly_rate, 'hourly_rate', { min: 1 })
      .number(data.daily_rate, 'daily_rate', { min: 1 })
      .number(data.total_price, 'total_price', { min: 1 })
      .string(data.comment, 'comment', { maxLength: 1000 })
      .bidStatus(data.status, 'status')
  },

  company: {
    create: (data) => new Validator()
      .required(data.name, 'name')
      .string(data.name, 'name', { minLength: 2, maxLength: 200 })
      .string(data.description, 'description', { maxLength: 1000 })
      .string(data.contact_info, 'contact_info', { maxLength: 500 }),

    update: (data) => new Validator()
      .string(data.name, 'name', { minLength: 2, maxLength: 200 })
      .string(data.description, 'description', { maxLength: 1000 })
      .string(data.contact_info, 'contact_info', { maxLength: 500 })
      .oneOf(data.status, 'status', ['active', 'inactive'])
  },

  auth: {
    login: (data) => new Validator()
      .required(data.password, 'password')
      .string(data.password, 'password', { minLength: 1, maxLength: 100 })
  }
};

// Функция для валидации данных по схеме
function validate(schema, operation, data) {
  if (!validationSchemas[schema] || !validationSchemas[schema][operation]) {
    throw new Error(`Схема валидации ${schema}.${operation} не найдена`);
  }

  const validator = validationSchemas[schema][operation](data);
  
  if (validator.hasErrors()) {
    const errors = validator.getErrors();
    logger.validation('Схема валидации', `${schema}.${operation} - найдено ${errors.length} ошибок`, data, { errors });
    return {
      isValid: false,
      errors: errors,
      firstError: validator.getFirstError()
    };
  }

  return {
    isValid: true,
    errors: [],
    firstError: null
  };
}

module.exports = {
  Validator,
  ValidationError,
  validationSchemas,
  validate
};
