#!/usr/bin/env node
/**
 * Инициализация продакшн базы данных - РОСТЕХНОПОИСК
 * Создает БД, выполняет миграции и настраивает права доступа
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

console.log('🚀 ИНИЦИАЛИЗАЦИЯ ПРОДАКШН БАЗЫ ДАННЫХ - РОСТЕХНОПОИСК\n');

// Проверяем, что мы в продакшене
if (process.env.NODE_ENV !== 'production') {
  console.log('⚠️  Этот скрипт предназначен только для продакшена');
  console.log('   Установите NODE_ENV=production или используйте:');
  console.log('   NODE_ENV=production node scripts/init-production-db.js');
  process.exit(1);
}

// Загружаем переменные окружения
require('dotenv').config({
  path: `./.env.${process.env.NODE_ENV}`
});

async function initProductionDatabase() {
  try {
    console.log('📋 Конфигурация:');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`   DB_PATH: ${process.env.DB_PATH}`);
    console.log(`   LOG_DIR: ${process.env.LOG_DIR}`);
    console.log(`   BACKUP_PATH: ${process.env.BACKUP_PATH}\n`);
    
    // 1. Создаем необходимые каталоги
    await createDirectories();
    
    // 2. Настраиваем права доступа
    await setupPermissions();
    
    // 3. Проверяем, существует ли БД
    const dbExists = fs.existsSync(process.env.DB_PATH);
    
    if (dbExists) {
      console.log('🔍 База данных уже существует, выполняем обновление...');
      
      // Создаем бэкап перед обновлением
      const { createBackup } = require('../backend/database/migrate-prod');
      const backupPath = await createBackup();
      console.log(`✅ Создан бэкап: ${backupPath}`);
      
      // Выполняем безопасные миграции
      const { runSafeMigrations } = require('../backend/database/migrate-prod');
      await runSafeMigrations();
      
    } else {
      console.log('📦 База данных не существует, создаем новую...');
      
      // Инициализируем новую БД
      const { initDatabase } = require('../backend/database/init');
      await initDatabase();
      
      // Выполняем миграции
      const { runMigrations } = require('../backend/database/migrate');
      await runMigrations();
    }
    
    // 4. Проверяем целостность
    await verifyDatabase();
    
    // 5. Настраиваем мониторинг
    await setupMonitoring();
    
    console.log('\n🎉 ИНИЦИАЛИЗАЦИЯ ЗАВЕРШЕНА УСПЕШНО!');
    console.log('\n📋 Следующие шаги:');
    console.log('   1. Запустите backend: npm start');
    console.log('   2. Проверьте логи: tail -f /var/log/rostechnopoisk/app.log');
    console.log('   3. Настройте автоматическое резервное копирование');
    
  } catch (error) {
    console.error('❌ Ошибка инициализации:', error.message);
    console.error('\n🔧 Рекомендации по устранению:');
    console.error('   1. Проверьте права доступа к каталогам');
    console.error('   2. Убедитесь, что все зависимости установлены');
    console.error('   3. Проверьте переменные окружения в .env.production');
    process.exit(1);
  }
}

// Создание необходимых каталогов
async function createDirectories() {
  console.log('📁 Создание каталогов...');
  
  const directories = [
    path.dirname(process.env.DB_PATH),
    process.env.LOG_DIR,
    process.env.BACKUP_PATH || '/var/backups/rostechnopoisk',
    '/var/lib/rostechnopoisk',
    '/etc/rostechnopoisk'
  ];
  
  for (const dir of directories) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Создан каталог: ${dir}`);
      } else {
        console.log(`ℹ️  Каталог существует: ${dir}`);
      }
    } catch (error) {
      console.log(`⚠️  Не удалось создать каталог ${dir}: ${error.message}`);
      console.log(`   Возможно, требуются права sudo`);
    }
  }
}

// Настройка прав доступа
async function setupPermissions() {
  console.log('\n🔐 Настройка прав доступа...');
  
  const items = [
    { path: process.env.DB_PATH, mode: '600', description: 'База данных' },
    { path: process.env.LOG_DIR, mode: '755', description: 'Каталог логов' },
    { path: process.env.BACKUP_PATH || '/var/backups/rostechnopoisk', mode: '700', description: 'Каталог бэкапов' }
  ];
  
  for (const item of items) {
    try {
      if (fs.existsSync(item.path)) {
        fs.chmodSync(item.path, parseInt(item.mode, 8));
        console.log(`✅ Установлены права ${item.mode} для ${item.description}`);
      }
    } catch (error) {
      console.log(`⚠️  Не удалось установить права для ${item.path}: ${error.message}`);
    }
  }
}

// Проверка базы данных
async function verifyDatabase() {
  console.log('\n🔍 Проверка базы данных...');
  
  try {
    const { checkDatabaseIntegrity, getDataStats } = require('../backend/database/migrate-prod');
    
    await checkDatabaseIntegrity();
    console.log('✅ Проверка целостности пройдена');
    
    const stats = await getDataStats();
    console.log('📊 Статистика данных:', stats);
    
  } catch (error) {
    console.log(`⚠️  Проблема с проверкой БД: ${error.message}`);
    throw error;
  }
}

// Настройка мониторинга
async function setupMonitoring() {
  console.log('\n📊 Настройка мониторинга...');
  
  // Создаем скрипт для мониторинга
  const monitoringScript = `#!/bin/bash
# Мониторинг РОСТЕХНОПОИСК
DATE=$(date '+%Y-%m-%d %H:%M:%S')
DB_PATH="${process.env.DB_PATH}"
LOG_DIR="${process.env.LOG_DIR}"

echo "[$DATE] Проверка состояния системы РОСТЕХНОПОИСК"

# Проверка размера БД
if [ -f "$DB_PATH" ]; then
    DB_SIZE=$(du -h "$DB_PATH" | cut -f1)
    echo "  База данных: $DB_SIZE"
else
    echo "  ❌ База данных не найдена: $DB_PATH"
fi

# Проверка логов
if [ -d "$LOG_DIR" ]; then
    LOG_SIZE=$(du -sh "$LOG_DIR" | cut -f1)
    echo "  Логи: $LOG_SIZE"
else
    echo "  ❌ Каталог логов не найден: $LOG_DIR"
fi

# Проверка процессов
PM2_STATUS=$(pm2 status rostechnopolsk-backend 2>/dev/null | grep -c "online" || echo "0")
if [ "$PM2_STATUS" -gt "0" ]; then
    echo "  ✅ Backend работает"
else
    echo "  ⚠️  Backend не запущен"
fi
`;
  
  const monitoringPath = '/usr/local/bin/rostechnopoisk-monitor';
  try {
    fs.writeFileSync(monitoringPath, monitoringScript);
    fs.chmodSync(monitoringPath, 0o755);
    console.log(`✅ Создан скрипт мониторинга: ${monitoringPath}`);
  } catch (error) {
    console.log(`⚠️  Не удалось создать скрипт мониторинга: ${error.message}`);
  }
  
  // Создаем logrotate конфигурацию
  const logrotateConfig = `${process.env.LOG_DIR}/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        pm2 reloadLogs
    endscript
}`;
  
  const logrotateConfigPath = '/etc/logrotate.d/rostechnopoisk';
  try {
    fs.writeFileSync(logrotateConfigPath, logrotateConfig);
    console.log(`✅ Создана конфигурация logrotate: ${logrotateConfigPath}`);
  } catch (error) {
    console.log(`⚠️  Не удалось создать конфигурацию logrotate: ${error.message}`);
  }
}

// Запускаем инициализацию
initProductionDatabase();
