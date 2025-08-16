/**
 * Конфигурация базы данных для разных сред - РОСТЕХНОПОИСК
 */

const path = require('path');

// Базовые настройки для разных сред
const environments = {
  local: {
    type: 'sqlite',
    database: path.join(__dirname, '../database/rostechnopolsk.db'),
    logging: true,
    backup: {
      enabled: false,
      frequency: 'daily',
      retention: 7
    },
    pool: {
      min: 1,
      max: 1
    }
  },
  
  development: {
    type: 'sqlite',
    database: path.join(__dirname, '../database/rostechnopolsk-dev.db'),
    logging: true,
    backup: {
      enabled: false,
      frequency: 'daily',
      retention: 3
    },
    pool: {
      min: 1,
      max: 2
    }
  },
  
  test: {
    type: 'sqlite',
    database: ':memory:', // В памяти для тестов
    logging: false,
    backup: {
      enabled: false
    },
    pool: {
      min: 1,
      max: 1
    }
  },
  
  production: {
    type: 'sqlite',
    database: process.env.DB_PATH || '/var/lib/rostechnopoisk/database/rostechnopolsk.db',
    logging: false,
    backup: {
      enabled: true,
      frequency: 'daily',
      retention: 30,
      path: process.env.BACKUP_PATH || '/var/backups/rostechnopoisk'
    },
    pool: {
      min: 1,
      max: 3
    },
    security: {
      readOnly: false,
      encryption: false // SQLite не поддерживает нативное шифрование
    },
    monitoring: {
      enabled: true,
      maxSize: '500MB',
      alertThreshold: '400MB'
    }
  }
};

// Получение конфигурации для текущей среды
function getDatabaseConfig() {
  const env = process.env.NODE_ENV || 'local';
  const config = environments[env];
  
  if (!config) {
    throw new Error(`Неизвестная среда: ${env}. Доступные: ${Object.keys(environments).join(', ')}`);
  }
  
  // Применяем переопределения из переменных окружения
  const finalConfig = {
    ...config,
    database: process.env.DB_PATH || config.database,
    logging: process.env.DB_LOGGING === 'true' || config.logging
  };
  
  // Валидация конфигурации
  validateConfig(finalConfig, env);
  
  return finalConfig;
}

// Валидация конфигурации
function validateConfig(config, env) {
  if (!config.database) {
    throw new Error('Не указан путь к базе данных');
  }
  
  // Для продакшена - дополнительные проверки
  if (env === 'production') {
    if (config.database.includes(':memory:')) {
      throw new Error('В продакшене нельзя использовать базу данных в памяти');
    }
    
    if (!path.isAbsolute(config.database)) {
      throw new Error('В продакшене путь к БД должен быть абсолютным');
    }
    
    // Проверяем, что каталог существует или может быть создан
    const dbDir = path.dirname(config.database);
    try {
      const fs = require('fs');
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
    } catch (error) {
      throw new Error(`Не удается создать каталог для БД: ${dbDir} - ${error.message}`);
    }
  }
}

// Получение настроек подключения для SQLite
function getConnectionOptions(config) {
  const options = {
    filename: config.database
  };
  
  // Настройки производительности для продакшена
  if (process.env.NODE_ENV === 'production') {
    options.pragma = {
      journal_mode: 'WAL',
      synchronous: 'NORMAL',
      cache_size: 10000,
      foreign_keys: true,
      busy_timeout: 5000
    };
  } else {
    options.pragma = {
      foreign_keys: true,
      busy_timeout: 3000
    };
  }
  
  return options;
}

// Настройки мониторинга
function getMonitoringConfig() {
  const config = getDatabaseConfig();
  
  if (!config.monitoring?.enabled) {
    return null;
  }
  
  return {
    enabled: true,
    checkInterval: 60000, // Проверка каждую минуту
    maxSize: config.monitoring.maxSize || '500MB',
    alertThreshold: config.monitoring.alertThreshold || '400MB',
    metrics: {
      connections: true,
      queries: true,
      performance: true
    }
  };
}

// Настройки резервного копирования
function getBackupConfig() {
  const config = getDatabaseConfig();
  
  if (!config.backup?.enabled) {
    return null;
  }
  
  return {
    enabled: true,
    frequency: config.backup.frequency || 'daily',
    retention: config.backup.retention || 7,
    path: config.backup.path || path.join(__dirname, '../../backups'),
    compression: true,
    notification: process.env.NODE_ENV === 'production'
  };
}

// Проверка совместимости версий
function checkDatabaseVersion() {
  const config = getDatabaseConfig();
  
  try {
    const sqlite3 = require('sqlite3');
    console.log(`📊 SQLite версия: ${sqlite3.VERSION}`);
    
    // Минимальная требуемая версия
    const minVersion = '3.8.0';
    if (sqlite3.VERSION < minVersion) {
      console.warn(`⚠️  Рекомендуется обновить SQLite до версии ${minVersion} или выше`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка проверки версии SQLite:', error.message);
    return false;
  }
}

// Получение информации о состоянии БД
async function getDatabaseStatus() {
  const config = getDatabaseConfig();
  const fs = require('fs');
  
  const status = {
    environment: process.env.NODE_ENV || 'local',
    database: config.database,
    exists: false,
    size: 0,
    accessible: false,
    lastModified: null
  };
  
  try {
    if (config.database !== ':memory:' && fs.existsSync(config.database)) {
      const stats = fs.statSync(config.database);
      status.exists = true;
      status.size = stats.size;
      status.lastModified = stats.mtime;
      status.accessible = true;
    }
  } catch (error) {
    status.error = error.message;
  }
  
  return status;
}

module.exports = {
  getDatabaseConfig,
  getConnectionOptions,
  getMonitoringConfig,
  getBackupConfig,
  checkDatabaseVersion,
  getDatabaseStatus,
  environments
};
