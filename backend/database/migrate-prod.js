#!/usr/bin/env node
/**
 * Система безопасных миграций для продакшена - РОСТЕХНОПОИСК
 * Обеспечивает сохранность данных при обновлениях
 */

const fs = require('fs');
const path = require('path');
const database = require('../models/Database');
const logger = require('../utils/logger');

// Создание бэкапа базы данных перед миграциями
async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dbPath = process.env.DB_PATH || path.join(__dirname, '../database/rostechnopolsk.db');
  const backupDir = process.env.BACKUP_PATH || path.join(__dirname, '../../backups');
  const backupPath = path.join(backupDir, `rostechnopolsk-backup-${timestamp}.db`);
  
  try {
    // Создаем папку для бэкапов
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Копируем файл БД
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
      logger.info('Создан бэкап базы данных', { 
        source: dbPath, 
        backup: backupPath,
        size: fs.statSync(backupPath).size 
      });
      return backupPath;
    } else {
      logger.warn('Файл базы данных не найден для бэкапа', { path: dbPath });
      return null;
    }
  } catch (error) {
    logger.error('Ошибка создания бэкапа', { error: error.message });
    throw error;
  }
}

// Проверка целостности базы данных
async function checkDatabaseIntegrity() {
  try {
    await database.connect();
    
    // PRAGMA integrity_check
    const integrityResult = await database.get('PRAGMA integrity_check');
    if (integrityResult && integrityResult.integrity_check !== 'ok') {
      throw new Error(`Проверка целостности БД провалена: ${integrityResult.integrity_check}`);
    }
    
    // Проверяем ключевые таблицы
    const tables = ['users', 'companies', 'equipment', 'rental_requests', 'rental_bids'];
    for (const table of tables) {
      try {
        await database.get(`SELECT COUNT(*) as count FROM ${table}`);
      } catch (error) {
        logger.warn(`Таблица ${table} недоступна или не существует`, { error: error.message });
      }
    }
    
    logger.info('Проверка целостности БД пройдена успешно');
    return true;
  } catch (error) {
    logger.error('Ошибка проверки целостности БД', { error: error.message });
    throw error;
  }
}

// Получение статистики данных (для сравнения до/после миграции)
async function getDataStats() {
  try {
    const stats = {};
    const tables = ['users', 'companies', 'equipment', 'rental_requests', 'rental_bids', 'equipment_types'];
    
    for (const table of tables) {
      try {
        const result = await database.get(`SELECT COUNT(*) as count FROM ${table}`);
        stats[table] = result ? result.count : 0;
      } catch (error) {
        stats[table] = 'N/A';
      }
    }
    
    return stats;
  } catch (error) {
    logger.error('Ошибка получения статистики данных', { error: error.message });
    return {};
  }
}

// Безопасное выполнение миграций с откатом
async function runSafeMigrations() {
  let backupPath = null;
  let preStats = {};
  let postStats = {};
  
  try {
    logger.info('🔄 Запуск безопасных миграций для продакшена');
    
    // 1. Создаем бэкап
    logger.info('📦 Создание бэкапа базы данных...');
    backupPath = await createBackup();
    
    // 2. Проверяем целостность
    logger.info('🔍 Проверка целостности базы данных...');
    await checkDatabaseIntegrity();
    
    // 3. Получаем статистику до миграции
    logger.info('📊 Получение статистики данных до миграции...');
    preStats = await getDataStats();
    logger.info('Статистика до миграции', preStats);
    
    // 4. Выполняем миграции
    logger.info('⚙️ Выполнение миграций...');
    const { runMigrations } = require('./migrate');
    await runMigrations();
    
    // 5. Проверяем целостность после миграций
    logger.info('🔍 Проверка целостности после миграций...');
    await checkDatabaseIntegrity();
    
    // 6. Получаем статистику после миграции
    logger.info('📊 Получение статистики данных после миграции...');
    postStats = await getDataStats();
    logger.info('Статистика после миграции', postStats);
    
    // 7. Проверяем, что данные не потеряны
    await validateDataConsistency(preStats, postStats);
    
    logger.info('✅ Миграции выполнены успешно!', {
      backup: backupPath,
      preStats,
      postStats
    });
    
    // 8. Очищаем старые бэкапы (оставляем последние 5)
    await cleanupOldBackups();
    
    return {
      success: true,
      backup: backupPath,
      preStats,
      postStats
    };
    
  } catch (error) {
    logger.error('❌ Ошибка выполнения миграций', { error: error.message, stack: error.stack });
    
    // Пытаемся восстановить из бэкапа
    if (backupPath && fs.existsSync(backupPath)) {
      logger.info('🔄 Попытка восстановления из бэкапа...');
      try {
        await restoreFromBackup(backupPath);
        logger.info('✅ База данных восстановлена из бэкапа');
      } catch (restoreError) {
        logger.error('❌ Критическая ошибка: не удалось восстановить из бэкапа', { 
          error: restoreError.message 
        });
      }
    }
    
    throw error;
  }
}

// Проверка консистентности данных
async function validateDataConsistency(preStats, postStats) {
  const issues = [];
  
  for (const table in preStats) {
    const preBefore = preStats[table];
    const preAfter = postStats[table];
    
    if (typeof preBefore === 'number' && typeof preAfter === 'number') {
      if (preAfter < preBefore) {
        issues.push(`В таблице ${table} количество записей уменьшилось с ${preBefore} до ${preAfter}`);
      }
    }
  }
  
  if (issues.length > 0) {
    logger.warn('Обнаружены потенциальные проблемы с данными', { issues });
    
    // В продакшене лучше прерывать при потере данных
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Обнаружена потеря данных: ${issues.join(', ')}`);
    }
  }
  
  logger.info('✅ Проверка консистентности данных пройдена');
}

// Восстановление из бэкапа
async function restoreFromBackup(backupPath) {
  const dbPath = process.env.DB_PATH || path.join(__dirname, '../database/rostechnopolsk.db');
  
  try {
    // Закрываем соединение с БД
    await database.close();
    
    // Копируем бэкап обратно
    fs.copyFileSync(backupPath, dbPath);
    
    // Переподключаемся
    await database.connect();
    
    logger.info('База данных восстановлена из бэкапа', { 
      backup: backupPath, 
      restored: dbPath 
    });
    
  } catch (error) {
    logger.error('Ошибка восстановления из бэкапа', { error: error.message });
    throw error;
  }
}

// Очистка старых бэкапов
async function cleanupOldBackups() {
  const backupDir = process.env.BACKUP_PATH || path.join(__dirname, '../../backups');
  const maxBackups = 5;
  
  try {
    if (!fs.existsSync(backupDir)) {
      return;
    }
    
    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('rostechnopolsk-backup-') && file.endsWith('.db'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        mtime: fs.statSync(path.join(backupDir, file)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime); // Сортируем по времени (новые сначала)
    
    // Удаляем старые бэкапы
    if (files.length > maxBackups) {
      const toDelete = files.slice(maxBackups);
      for (const file of toDelete) {
        fs.unlinkSync(file.path);
        logger.info('Удален старый бэкап', { file: file.name });
      }
    }
    
    logger.info(`Очистка бэкапов завершена, оставлено ${Math.min(files.length, maxBackups)} файлов`);
    
  } catch (error) {
    logger.warn('Ошибка очистки старых бэкапов', { error: error.message });
  }
}

// Получение списка доступных бэкапов
async function listBackups() {
  const backupDir = process.env.BACKUP_PATH || path.join(__dirname, '../../backups');
  
  try {
    if (!fs.existsSync(backupDir)) {
      return [];
    }
    
    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('rostechnopolsk-backup-') && file.endsWith('.db'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        size: fs.statSync(path.join(backupDir, file)).size,
        mtime: fs.statSync(path.join(backupDir, file)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);
    
    return files;
    
  } catch (error) {
    logger.error('Ошибка получения списка бэкапов', { error: error.message });
    return [];
  }
}

// CLI команды
if (require.main === module) {
  require('dotenv').config({
    path: `./.env.${process.env.NODE_ENV || 'production'}`
  });
  
  const command = process.argv[2];
  
  switch (command) {
    case 'backup':
      createBackup()
        .then(backupPath => {
          console.log(`✅ Бэкап создан: ${backupPath}`);
          process.exit(0);
        })
        .catch(error => {
          console.error('❌ Ошибка создания бэкапа:', error.message);
          process.exit(1);
        });
      break;
      
    case 'restore':
      const backupFile = process.argv[3];
      if (!backupFile) {
        console.error('❌ Укажите файл бэкапа: npm run migrate-prod restore /path/to/backup.db');
        process.exit(1);
      }
      restoreFromBackup(backupFile)
        .then(() => {
          console.log('✅ База данных восстановлена');
          process.exit(0);
        })
        .catch(error => {
          console.error('❌ Ошибка восстановления:', error.message);
          process.exit(1);
        });
      break;
      
    case 'list-backups':
      listBackups()
        .then(backups => {
          console.log('\n📦 Доступные бэкапы:');
          if (backups.length === 0) {
            console.log('   Нет доступных бэкапов');
          } else {
            backups.forEach(backup => {
              console.log(`   ${backup.name} (${(backup.size / 1024 / 1024).toFixed(2)} MB, ${backup.mtime.toLocaleString()})`);
            });
          }
          process.exit(0);
        })
        .catch(error => {
          console.error('❌ Ошибка:', error.message);
          process.exit(1);
        });
      break;
      
    case 'check':
      checkDatabaseIntegrity()
        .then(() => {
          console.log('✅ Проверка целостности БД пройдена');
          process.exit(0);
        })
        .catch(error => {
          console.error('❌ Ошибка проверки:', error.message);
          process.exit(1);
        });
      break;
      
    default:
      runSafeMigrations()
        .then(() => {
          console.log('✅ Безопасные миграции выполнены успешно');
          process.exit(0);
        })
        .catch(error => {
          console.error('❌ Ошибка миграций:', error.message);
          process.exit(1);
        });
  }
}

module.exports = { 
  runSafeMigrations, 
  createBackup, 
  restoreFromBackup, 
  checkDatabaseIntegrity,
  listBackups,
  cleanupOldBackups,
  getDataStats
};
