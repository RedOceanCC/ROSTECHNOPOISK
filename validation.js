// Клиентская валидация форм
class ClientValidator {
  constructor() {
    this.errors = new Map();
  }

  // Очистка ошибок
  clearErrors() {
    this.errors.clear();
    this.hideAllErrors();
  }

  // Добавление ошибки
  addError(field, message) {
    this.errors.set(field, message);
    this.showError(field, message);
  }

  // Проверка наличия ошибок
  hasErrors() {
    return this.errors.size > 0;
  }

  // Получение всех ошибок
  getErrors() {
    return Object.fromEntries(this.errors);
  }

  // Показать ошибку для конкретного поля
  showError(field, message) {
    const input = document.getElementById(field);
    if (!input) return;

    // Удаляем старые ошибки
    this.hideError(field);

    // Добавляем класс ошибки к полю
    input.classList.add('error');

    // Создаем элемент с ошибкой
    const errorElement = document.createElement('div');
    errorElement.className = 'field-error';
    errorElement.textContent = message;
    errorElement.id = `${field}-error`;

    // Вставляем ошибку после поля
    input.parentNode.insertBefore(errorElement, input.nextSibling);
  }

  // Скрыть ошибку для конкретного поля
  hideError(field) {
    const input = document.getElementById(field);
    if (input) {
      input.classList.remove('error');
    }

    const errorElement = document.getElementById(`${field}-error`);
    if (errorElement) {
      errorElement.remove();
    }
  }

  // Скрыть все ошибки
  hideAllErrors() {
    document.querySelectorAll('.field-error').forEach(el => el.remove());
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
  }

  // Показать общую ошибку формы
  showFormError(form, message) {
    this.hideFormError(form);

    const errorElement = document.createElement('div');
    errorElement.className = 'form-error';
    errorElement.textContent = message;
    errorElement.id = `${form.id}-form-error`;

    form.insertBefore(errorElement, form.firstChild);
  }

  // Скрыть общую ошибку формы
  hideFormError(form) {
    const errorElement = document.getElementById(`${form.id}-form-error`);
    if (errorElement) {
      errorElement.remove();
    }
  }

  // Базовые валидаторы
  required(value, field, customMessage) {
    if (!value || value.trim() === '') {
      this.addError(field, customMessage || `Поле обязательно для заполнения`);
      return false;
    }
    return true;
  }

  minLength(value, field, min, customMessage) {
    if (value && value.length < min) {
      this.addError(field, customMessage || `Минимум ${min} символов`);
      return false;
    }
    return true;
  }

  maxLength(value, field, max, customMessage) {
    if (value && value.length > max) {
      this.addError(field, customMessage || `Максимум ${max} символов`);
      return false;
    }
    return true;
  }

  email(value, field, customMessage) {
    if (value) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(value)) {
        this.addError(field, customMessage || 'Введите корректный email адрес');
        return false;
      }
    }
    return true;
  }

  phone(value, field, customMessage) {
    if (value) {
      // Российский номер телефона
      const cleanPhone = value.replace(/[\s\-\(\)]/g, '');
      const phonePattern = /^(\+7|7|8)?[489][0-9]{9}$/;
      if (!phonePattern.test(cleanPhone)) {
        this.addError(field, customMessage || 'Введите корректный номер телефона');
        return false;
      }
    }
    return true;
  }

  number(value, field, options = {}, customMessage) {
    if (value !== '' && value !== null && value !== undefined) {
      const num = Number(value);
      if (isNaN(num)) {
        this.addError(field, customMessage || 'Введите корректное число');
        return false;
      }

      if (options.min !== undefined && num < options.min) {
        this.addError(field, customMessage || `Минимальное значение: ${options.min}`);
        return false;
      }

      if (options.max !== undefined && num > options.max) {
        this.addError(field, customMessage || `Максимальное значение: ${options.max}`);
        return false;
      }

      if (options.integer && !Number.isInteger(num)) {
        this.addError(field, customMessage || 'Введите целое число');
        return false;
      }
    }
    return true;
  }

  date(value, field, options = {}, customMessage) {
    if (value) {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        this.addError(field, customMessage || 'Введите корректную дату');
        return false;
      }

      if (options.future && date <= new Date()) {
        this.addError(field, customMessage || 'Дата должна быть в будущем');
        return false;
      }

      if (options.past && date >= new Date()) {
        this.addError(field, customMessage || 'Дата должна быть в прошлом');
        return false;
      }
    }
    return true;
  }

  password(value, field, customMessage) {
    if (value) {
      if (value.length < 6) {
        this.addError(field, customMessage || 'Пароль должен содержать минимум 6 символов');
        return false;
      }
      if (value.length > 100) {
        this.addError(field, customMessage || 'Пароль слишком длинный');
        return false;
      }
    }
    return true;
  }

  licensePlate(value, field, customMessage) {
    if (value) {
      const cleanPlate = value.replace(/[\s\-]/g, '');
      const platePattern = /^[АВЕКМНОРСТУХ]\d{3}[АВЕКМНОРСТУХ]{2}\d{2,3}$/i;
      if (!platePattern.test(cleanPlate)) {
        this.addError(field, customMessage || 'Введите корректный номер (например: А123БВ77)');
        return false;
      }
    }
    return true;
  }

  // Валидация дат (окончание после начала)
  dateRange(startValue, endValue, startField, endField, customMessage) {
    if (startValue && endValue) {
      const startDate = new Date(startValue);
      const endDate = new Date(endValue);
      
      if (endDate <= startDate) {
        this.addError(endField, customMessage || 'Дата окончания должна быть позже даты начала');
        return false;
      }
    }
    return true;
  }

  // Кастомная валидация
  custom(value, field, validatorFn, errorMessage) {
    try {
      if (!validatorFn(value)) {
        this.addError(field, errorMessage);
        return false;
      }
    } catch (error) {
      this.addError(field, `Ошибка валидации: ${error.message}`);
      return false;
    }
    return true;
  }
}

// Предустановленные валидаторы для форм
const FormValidators = {
  // Валидация формы авторизации
  validateLoginForm(formData) {
    const validator = new ClientValidator();
    
    validator.required(formData.password, 'password', 'Введите пароль для входа');
    validator.minLength(formData.password, 'password', 1, 'Пароль не может быть пустым');
    
    return validator;
  },

  // Валидация формы создания пользователя
  validateUserForm(formData) {
    const validator = new ClientValidator();
    
    validator.required(formData.password, 'password', 'Введите пароль');
    validator.password(formData.password, 'password');
    
    validator.required(formData.role, 'role', 'Выберите роль пользователя');
    
    validator.required(formData.name, 'name', 'Введите ФИО');
    validator.minLength(formData.name, 'name', 2, 'ФИО должно содержать минимум 2 символа');
    validator.maxLength(formData.name, 'name', 100, 'ФИО слишком длинное');
    
    if (formData.phone) {
      validator.phone(formData.phone, 'phone');
    }
    
    if (formData.company_id) {
      validator.number(formData.company_id, 'company_id', { min: 1, integer: true }, 'Выберите корректную компанию');
    }
    
    return validator;
  },

  // Валидация формы добавления техники
  validateEquipmentForm(formData) {
    const validator = new ClientValidator();
    
    validator.required(formData.name, 'name', 'Введите название техники');
    validator.minLength(formData.name, 'name', 2);
    validator.maxLength(formData.name, 'name', 200);
    
    validator.required(formData.type, 'type', 'Выберите тип техники');
    validator.required(formData.subtype, 'subtype', 'Выберите подтип техники');
    
    validator.required(formData.owner_name, 'owner_name', 'Введите ФИО владельца');
    validator.minLength(formData.owner_name, 'owner_name', 2);
    
    validator.required(formData.phone, 'phone', 'Введите контактный телефон');
    validator.phone(formData.phone, 'phone');
    
    if (formData.license_plate) {
      validator.licensePlate(formData.license_plate, 'license_plate');
    }
    
    if (formData.additional_equipment) {
      validator.maxLength(formData.additional_equipment, 'additional_equipment', 500);
    }
    
    if (formData.description) {
      validator.maxLength(formData.description, 'description', 1000);
    }
    
    if (formData.hourly_rate) {
      validator.number(formData.hourly_rate, 'hourly_rate', { min: 0 }, 'Укажите корректную почасовую ставку');
    }
    
    if (formData.daily_rate) {
      validator.number(formData.daily_rate, 'daily_rate', { min: 0 }, 'Укажите корректную дневную ставку');
    }
    
    if (formData.location) {
      validator.maxLength(formData.location, 'location', 200);
    }
    
    return validator;
  },

  // Валидация формы создания заявки
  validateRequestForm(formData) {
    const validator = new ClientValidator();
    
    validator.required(formData.equipment_type, 'equipment_type', 'Выберите тип техники');
    validator.required(formData.equipment_subtype, 'equipment_subtype', 'Выберите подтип техники');
    
    validator.required(formData.start_date, 'start_date', 'Укажите дату начала работ');
    validator.date(formData.start_date, 'start_date', { future: true }, 'Дата начала должна быть в будущем');
    
    validator.required(formData.end_date, 'end_date', 'Укажите дату окончания работ');
    validator.date(formData.end_date, 'end_date', { future: true }, 'Дата окончания должна быть в будущем');
    
    validator.dateRange(formData.start_date, formData.end_date, 'start_date', 'end_date');
    
    validator.required(formData.location, 'location', 'Укажите место проведения работ');
    validator.minLength(formData.location, 'location', 2);
    validator.maxLength(formData.location, 'location', 200);
    
    if (formData.work_description) {
      validator.maxLength(formData.work_description, 'work_description', 1000);
    }
    
    return validator;
  },

  // Валидация формы подачи ставки
  validateBidForm(formData) {
    const validator = new ClientValidator();
    
    validator.required(formData.equipment_id, 'bid-equipment', 'Выберите технику для заявки');
    validator.number(formData.equipment_id, 'bid-equipment', { min: 1, integer: true });
    
    validator.required(formData.hourly_rate, 'bid-hourly-rate', 'Укажите цену за час');
    validator.number(formData.hourly_rate, 'bid-hourly-rate', { min: 1 }, 'Цена за час должна быть больше 0');
    
    validator.required(formData.daily_rate, 'bid-daily-rate', 'Укажите цену за день');
    validator.number(formData.daily_rate, 'bid-daily-rate', { min: 1 }, 'Цена за день должна быть больше 0');
    
    validator.required(formData.total_price, 'bid-total-price', 'Укажите общую стоимость');
    validator.number(formData.total_price, 'bid-total-price', { min: 1 }, 'Общая стоимость должна быть больше 0');
    
    if (formData.comment) {
      validator.maxLength(formData.comment, 'bid-comment', 1000);
    }
    
    // Проверяем логичность цен
    if (formData.hourly_rate && formData.daily_rate) {
      const hourly = Number(formData.hourly_rate);
      const daily = Number(formData.daily_rate);
      
      if (daily <= hourly) {
        validator.addError('bid-daily-rate', 'Дневная ставка должна быть больше почасовой');
      }
    }
    
    return validator;
  },

  // Валидация формы компании
  validateCompanyForm(formData) {
    const validator = new ClientValidator();
    
    validator.required(formData.name, 'company-name', 'Введите название компании');
    validator.minLength(formData.name, 'company-name', 2);
    validator.maxLength(formData.name, 'company-name', 200);
    
    if (formData.description) {
      validator.maxLength(formData.description, 'company-description', 1000);
    }
    
    if (formData.contact_info) {
      validator.maxLength(formData.contact_info, 'company-contact', 500);
    }
    
    return validator;
  }
};

// Утилита для автоматической валидации форм
function setupFormValidation(formId, validatorName) {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    const validator = FormValidators[validatorName](data);
    
    if (validator.hasErrors()) {
      validator.showFormError(form, 'Пожалуйста, исправьте ошибки в форме');
      return false;
    }
    
    validator.hideFormError(form);
    return true;
  });

  // Валидация при потере фокуса
  const inputs = form.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    input.addEventListener('blur', function() {
      const validator = new ClientValidator();
      const value = this.value;
      const field = this.id;
      
      // Базовая валидация в зависимости от типа поля
      if (this.hasAttribute('required')) {
        validator.required(value, field);
      }
      
      if (this.type === 'email') {
        validator.email(value, field);
      }
      
      if (this.type === 'tel' || field.includes('phone')) {
        validator.phone(value, field);
      }
      
      if (this.type === 'number') {
        const min = this.getAttribute('min');
        const max = this.getAttribute('max');
        validator.number(value, field, { min: min ? Number(min) : undefined, max: max ? Number(max) : undefined });
      }
      
      if (this.type === 'date') {
        validator.date(value, field);
      }
    });
    
    // Очистка ошибок при вводе
    input.addEventListener('input', function() {
      const validator = new ClientValidator();
      validator.hideError(this.id);
    });
  });
}

// Экспорт для использования в основном коде
window.ClientValidator = ClientValidator;
window.FormValidators = FormValidators;
window.setupFormValidation = setupFormValidation;
