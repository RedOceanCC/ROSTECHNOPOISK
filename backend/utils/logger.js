const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.ensureLogDir();
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.maxLogSize = 10 * 1024 * 1024; // 10MB
    this.maxLogFiles = 5;
  }

  ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  formatMessage(level, message, context = {}) {
    const timestamp = this.getTimestamp();
    const contextStr = Object.keys(context).length > 0 ? `\nКонтекст: ${JSON.stringify(context, null, 2)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}\n`;
  }

  writeToFile(filename, message) {
    const logPath = path.join(this.logDir, filename);
    
    // Проверяем размер файла и ротируем при необходимости
    if (fs.existsSync(logPath)) {
      const stats = fs.statSync(logPath);
      if (stats.size > this.maxLogSize) {
        this.rotateLogFile(filename);
      }
    }
    
    fs.appendFileSync(logPath, message);
  }

  rotateLogFile(filename) {
    const baseName = path.basename(filename, '.log');
    const logPath = path.join(this.logDir, filename);
    
    // Сдвигаем старые файлы
    for (let i = this.maxLogFiles - 1; i >= 1; i--) {
      const oldFile = path.join(this.logDir, `${baseName}.${i}.log`);
      const newFile = path.join(this.logDir, `${baseName}.${i + 1}.log`);
      
      if (fs.existsSync(oldFile)) {
        if (i === this.maxLogFiles - 1) {
          fs.unlinkSync(oldFile); // Удаляем самый старый
        } else {
          fs.renameSync(oldFile, newFile);
        }
      }
    }
    
    // Переименовываем текущий файл
    if (fs.existsSync(logPath)) {
      const archivedFile = path.join(this.logDir, `${baseName}.1.log`);
      fs.renameSync(logPath, archivedFile);
    }
  }

  // Основные методы логирования
  error(message, context = {}) {
    const formatted = this.formatMessage('error', message, context);
    console.error(`🔴 ${formatted.trim()}`);
    this.writeToFile('error.log', formatted);
    this.writeToFile('combined.log', formatted);
  }

  warn(message, context = {}) {
    const formatted = this.formatMessage('warn', message, context);
    console.warn(`🟡 ${formatted.trim()}`);
    this.writeToFile('warn.log', formatted);
    this.writeToFile('combined.log', formatted);
  }

  info(message, context = {}) {
    const formatted = this.formatMessage('info', message, context);
    console.log(`🔵 ${formatted.trim()}`);
    this.writeToFile('info.log', formatted);
    this.writeToFile('combined.log', formatted);
  }

  debug(message, context = {}) {
    if (this.logLevel === 'debug') {
      const formatted = this.formatMessage('debug', message, context);
      console.log(`🔍 ${formatted.trim()}`);
      this.writeToFile('debug.log', formatted);
      this.writeToFile('combined.log', formatted);
    }
  }

  // Специализированные методы логирования
  auth(action, user, details = {}) {
    this.info(`Авторизация: ${action}`, {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      ...details
    });
    this.writeToFile('auth.log', this.formatMessage('auth', `${action}`, {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      ...details
    }));
  }

  api(method, url, user, statusCode, duration, details = {}) {
    const message = `${method} ${url} - ${statusCode} (${duration}ms)`;
    this.info(`API: ${message}`, {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      userAgent: details.userAgent,
      ip: details.ip,
      ...details
    });
    this.writeToFile('api.log', this.formatMessage('api', message, {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      ...details
    }));
  }

  database(operation, table, details = {}) {
    this.debug(`БД: ${operation} в таблице ${table}`, details);
    this.writeToFile('database.log', this.formatMessage('database', `${operation} - ${table}`, details));
  }

  validation(field, error, value, context = {}) {
    this.warn(`Валидация: ошибка в поле "${field}" - ${error}`, {
      invalidValue: value,
      ...context
    });
    this.writeToFile('validation.log', this.formatMessage('validation', `${field}: ${error}`, {
      invalidValue: value,
      ...context
    }));
  }

  business(action, user, details = {}) {
    this.info(`Бизнес-логика: ${action}`, {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      ...details
    });
    this.writeToFile('business.log', this.formatMessage('business', action, {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      ...details
    }));
  }

  security(event, details = {}) {
    this.warn(`Безопасность: ${event}`, details);
    this.writeToFile('security.log', this.formatMessage('security', event, details));
  }

  // Метрики производительности
  performance(operation, duration, details = {}) {
    const level = duration > 1000 ? 'warn' : 'info';
    this[level](`Производительность: ${operation} выполнено за ${duration}ms`, details);
    this.writeToFile('performance.log', this.formatMessage('performance', `${operation} - ${duration}ms`, details));
  }

  // Логирование действий пользователей
  userAction(user, action, details = {}) {
    this.info(`Действие пользователя: ${action}`, {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      timestamp: this.getTimestamp(),
      ...details
    });
    this.writeToFile('user-actions.log', this.formatMessage('user-action', action, {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      ...details
    }));
  }

  // Аудит изменений данных
  audit(user, action, entityType, entityId, changes = {}) {
    const message = `${action} ${entityType} ID:${entityId}`;
    this.info(`Аудит: ${message}`, {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      changes,
      timestamp: this.getTimestamp()
    });
    this.writeToFile('audit.log', this.formatMessage('audit', message, {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      changes
    }));
  }

  // Получение статистики логов
  getLogStats() {
    const stats = {};
    const logFiles = ['error.log', 'warn.log', 'info.log', 'api.log', 'auth.log', 'user-actions.log'];
    
    logFiles.forEach(file => {
      const filePath = path.join(this.logDir, file);
      if (fs.existsSync(filePath)) {
        const fileStats = fs.statSync(filePath);
        stats[file] = {
          size: fileStats.size,
          modified: fileStats.mtime,
          lines: this.countLines(filePath)
        };
      }
    });
    
    return stats;
  }

  countLines(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return content.split('\n').length - 1;
    } catch (error) {
      return 0;
    }
  }

  // Очистка старых логов
  cleanup(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const files = fs.readdirSync(this.logDir);
    let deletedCount = 0;
    
    files.forEach(file => {
      const filePath = path.join(this.logDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime < cutoffDate) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    });
    
    this.info(`Очистка логов: удалено ${deletedCount} старых файлов`);
    return deletedCount;
  }
}

// Создаем единственный экземпляр логгера
const logger = new Logger();

module.exports = logger;
