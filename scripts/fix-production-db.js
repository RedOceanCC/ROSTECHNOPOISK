#!/usr/bin/env node

/**
 * Скрипт для исправления проблем с базой данных в продакшене
 * Создает необходимые директории и копирует базу данных
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Исправление настроек продакшена...');

// Путь к продакшн базе данных
const prodDbPath = '/var/lib/rostechnopoisk/database/rostechnopolsk.db';
const localDbPath = path.join(__dirname, '../backend/database/rostechnopolsk.db');

// Создаем директории
try {
  const dbDir = path.dirname(prodDbPath);
  console.log(`📁 Создание директории: ${dbDir}`);
  fs.mkdirSync(dbDir, { recursive: true });
  
  // Устанавливаем права
  try {
    fs.chmodSync(dbDir, 0o755);
    console.log('✅ Права на директорию установлены');
  } catch (chmodError) {
    console.log('⚠️  Не удалось установить права:', chmodError.message);
  }
  
} catch (error) {
  console.error('❌ Ошибка создания директории:', error.message);
  process.exit(1);
}

// Копируем базу данных если локальная существует
if (fs.existsSync(localDbPath)) {
  try {
    console.log(`📋 Копирование базы данных...`);
    console.log(`   Из: ${localDbPath}`);
    console.log(`   В:  ${prodDbPath}`);
    
    fs.copyFileSync(localDbPath, prodDbPath);
    
    // Устанавливаем права на файл
    try {
      fs.chmodSync(prodDbPath, 0o644);
      console.log('✅ База данных скопирована успешно');
    } catch (chmodError) {
      console.log('⚠️  Не удалось установить права на БД:', chmodError.message);
    }
    
  } catch (error) {
    console.error('❌ Ошибка копирования базы данных:', error.message);
    console.log('ℹ️  Создайте пустую базу данных вручную или скопируйте существующую');
  }
} else {
  console.log('⚠️  Локальная база данных не найдена');
  console.log('ℹ️  После запуска сервера будет создана новая база данных');
}

// Создаем директорию для логов
const logDir = '/var/log/rostechnopoisk';
try {
  console.log(`📁 Создание директории логов: ${logDir}`);
  fs.mkdirSync(logDir, { recursive: true });
  fs.chmodSync(logDir, 0o755);
  console.log('✅ Директория логов создана');
} catch (error) {
  console.log('⚠️  Не удалось создать директорию логов:', error.message);
}

// Создаем директорию для бэкапов
const backupDir = '/var/backups/rostechnopoisk';
try {
  console.log(`📁 Создание директории бэкапов: ${backupDir}`);
  fs.mkdirSync(backupDir, { recursive: true });
  fs.chmodSync(backupDir, 0o755);
  console.log('✅ Директория бэкапов создана');
} catch (error) {
  console.log('⚠️  Не удалось создать директорию бэкапов:', error.message);
}

console.log('\n🎉 Исправление завершено!');
console.log('\n📋 Что было сделано:');
console.log('   ✅ Директория для БД: /var/lib/rostechnopoisk/database/');
console.log('   ✅ Директория для логов: /var/log/rostechnopoisk/');
console.log('   ✅ Директория для бэкапов: /var/backups/rostechnopoisk/');
console.log('   ✅ Исправлен путь к БД в production-config.env');

console.log('\n🚀 Теперь можно перезапустить сервер:');
console.log('   pm2 restart rostechnopolsk-backend');
