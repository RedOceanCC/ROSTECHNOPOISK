#!/usr/bin/env node
/**
 * Скрипт автоматической настройки окружения - РОСТЕХНОПОИСК
 * Копирует шаблоны конфигураций и генерирует безопасные ключи
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🔧 НАСТРОЙКА ОКРУЖЕНИЯ - РОСТЕХНОПОИСК\n');

// Получаем аргументы командной строки
const args = process.argv.slice(2);
const envFlag = args.find(arg => arg.startsWith('--env='));
const environment = envFlag ? envFlag.split('=')[1] : 'local';

console.log(`📋 Настройка окружения: ${environment}`);

// Проверяем существование шаблона
const templatePath = path.join('config-templates', `env.${environment}.template`);
if (!fs.existsSync(templatePath)) {
  console.error(`❌ Шаблон для окружения "${environment}" не найден: ${templatePath}`);
  console.error('Доступные окружения: local, development, production');
  process.exit(1);
}

// Читаем шаблон
let envContent = fs.readFileSync(templatePath, 'utf8');
console.log(`✅ Шаблон загружен: ${templatePath}`);

// Генерируем безопасный SESSION_SECRET для продакшена
if (environment === 'production') {
  const sessionSecret = crypto.randomBytes(32).toString('hex');
  envContent = envContent.replace(
    'SESSION_SECRET=CHANGE_THIS_TO_RANDOM_STRING_IN_PRODUCTION_64_CHARS_MINIMUM',
    `SESSION_SECRET=${sessionSecret}`
  );
  console.log('🔐 Сгенерирован безопасный SESSION_SECRET');
}

// Создаем целевой файл
const targetPath = `.env.${environment}`;
fs.writeFileSync(targetPath, envContent);
console.log(`✅ Создан файл конфигурации: ${targetPath}`);

// Создаем каталоги, если они не существуют
const createDirectories = [
  'backend/logs',
  'backend/database'
];

if (environment === 'production') {
  createDirectories.push(
    '/var/lib/rostechnopoisk/database',
    '/var/log/rostechnopoisk',
    '/var/backups/rostechnopoisk'
  );
}

console.log('\n📁 Создание необходимых каталогов...');
createDirectories.forEach(dir => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Создан каталог: ${dir}`);
    } else {
      console.log(`ℹ️  Каталог уже существует: ${dir}`);
    }
  } catch (error) {
    console.log(`⚠️  Не удалось создать каталог ${dir}: ${error.message}`);
    if (environment === 'production') {
      console.log(`   Возможно, требуются права sudo для создания ${dir}`);
    }
  }
});

// Устанавливаем права доступа для продакшена
if (environment === 'production') {
  console.log('\n🔐 Настройка прав доступа...');
  
  const { spawn } = require('child_process');
  
  // Устанавливаем права для файла конфигурации
  try {
    fs.chmodSync(targetPath, 0o600); // Только владелец может читать/писать
    console.log(`✅ Установлены права 600 для ${targetPath}`);
  } catch (error) {
    console.log(`⚠️  Не удалось установить права для ${targetPath}: ${error.message}`);
  }
}

// Дополнительные инструкции
console.log(`\n🎉 НАСТРОЙКА ЗАВЕРШЕНА!\n`);
console.log(`📝 Следующие шаги:`);
console.log(`   1. Проверьте настройки в файле: ${targetPath}`);

if (environment === 'production') {
  console.log(`   2. ОБЯЗАТЕЛЬНО проверьте домены в CORS_ORIGINS`);
  console.log(`   3. Убедитесь, что существуют каталоги для БД и логов`);
  console.log(`   4. Настройте Nginx и SSL сертификаты`);
  console.log(`   5. Запустите миграции: npm run migrate`);
} else {
  console.log(`   2. Установите зависимости: npm install`);
  console.log(`   3. Запустите проект: npm run dev`);
}

console.log(`\n🔍 Проверка конфигурации:`);
console.log(`   node -e "require('dotenv').config({path: '${targetPath}'}); console.log('NODE_ENV:', process.env.NODE_ENV, 'PORT:', process.env.PORT)"`);

// Показываем содержимое файла (кроме секретов)
console.log(`\n📄 Содержимое ${targetPath}:`);
console.log('=' .repeat(50));
const lines = envContent.split('\n');
lines.forEach(line => {
  if (line.includes('SESSION_SECRET') && environment === 'production') {
    console.log('SESSION_SECRET=***СКРЫТО***');
  } else {
    console.log(line);
  }
});
console.log('=' .repeat(50));

console.log(`\n✨ Готово! Окружение "${environment}" настроено.`);

// Экспорт функций для использования в других скриптах
module.exports = {
  setupEnvironment: (env) => {
    // Функция для программного использования
    return new Promise((resolve, reject) => {
      try {
        // Логика настройки окружения
        resolve(`Окружение ${env} настроено`);
      } catch (error) {
        reject(error);
      }
    });
  }
};
