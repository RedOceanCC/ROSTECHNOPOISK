#!/usr/bin/env node

// Скрипт для запуска всех тестов с отчетностью
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, description) {
  log(`\n📋 ${description}`, 'blue');
  log(`Команда: ${command}`, 'cyan');
  
  try {
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: 'inherit'
    });
    log(`✅ ${description} - УСПЕШНО`, 'green');
    return { success: true, output };
  } catch (error) {
    log(`❌ ${description} - ОШИБКА`, 'red');
    console.error(error.message);
    return { success: false, error: error.message };
  }
}

function generateTestReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    },
    details: results
  };

  const reportPath = path.join(__dirname, '../test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  return report;
}

function displaySummary(report) {
  log('\n' + '='.repeat(60), 'bright');
  log('📊 СВОДКА ТЕСТИРОВАНИЯ', 'bright');
  log('='.repeat(60), 'bright');
  
  log(`📅 Время: ${new Date(report.timestamp).toLocaleString('ru-RU')}`);
  log(`📈 Всего тестов: ${report.summary.total}`);
  log(`✅ Успешно: ${report.summary.passed}`, 'green');
  log(`❌ Ошибок: ${report.summary.failed}`, report.summary.failed > 0 ? 'red' : 'green');
  
  const successRate = Math.round((report.summary.passed / report.summary.total) * 100);
  log(`📊 Процент успеха: ${successRate}%`, successRate >= 90 ? 'green' : successRate >= 70 ? 'yellow' : 'red');
  
  if (report.summary.failed > 0) {
    log('\n🔍 НЕУДАЧНЫЕ ТЕСТЫ:', 'red');
    report.details.filter(r => !r.success).forEach(result => {
      log(`  • ${result.description}`, 'red');
    });
  }
  
  log('\n📁 Детальный отчет сохранен в: test-report.json', 'cyan');
}

async function main() {
  log('🧪 ЗАПУСК ПОЛНОГО ТЕСТИРОВАНИЯ СИСТЕМЫ РОСТЕХНОПОИСК', 'bright');
  log('========================================================', 'bright');
  
  const results = [];
  
  // 1. Настройка тестовой базы данных
  results.push(runCommand(
    'npm run setup:test-db',
    'Настройка тестовой базы данных'
  ));
  
  // 2. Юнит-тесты моделей
  results.push(runCommand(
    'npm run test:models',
    'Юнит-тесты моделей (Database, User, Company, Equipment, etc.)'
  ));
  
  // 3. Интеграционные тесты API
  results.push(runCommand(
    'npm run test:routes',
    'Интеграционные тесты API маршрутов'
  ));
  
  // 4. Тесты middleware
  results.push(runCommand(
    'npm test tests/backend/middleware',
    'Тесты middleware (auth, logging, validation)'
  ));
  
  // 5. Тесты сервисов
  results.push(runCommand(
    'npm test tests/backend/services',
    'Тесты бизнес-сервисов (AuctionService, NotificationService)'
  ));
  
  // 6. Фронтенд тесты
  results.push(runCommand(
    'npm run test:frontend',
    'Фронтенд тесты (NotificationCenter, AuctionTimer, RealTimeUpdater)'
  ));
  
  // 7. UI интеграционные тесты
  results.push(runCommand(
    'npm run test:ui',
    'UI интеграционные тесты компонентов'
  ));
  
  // 8. E2E тесты
  results.push(runCommand(
    'npm run test:e2e',
    'End-to-End тесты пользовательских сценариев'
  ));
  
  // 9. Покрытие кода
  results.push(runCommand(
    'npm run test:coverage',
    'Анализ покрытия кода тестами'
  ));
  
  // 10. Линтинг и проверка качества кода
  results.push(runCommand(
    'npm run lint',
    'Проверка качества кода (ESLint)'
  ));
  
  // Генерируем отчет
  const report = generateTestReport(results);
  displaySummary(report);
  
  // Завершаем с соответствующим кодом
  process.exit(report.summary.failed === 0 ? 0 : 1);
}

// Обработка сигналов для корректного завершения
process.on('SIGINT', () => {
  log('\n⏹️  Тестирование прервано пользователем', 'yellow');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log('\n💥 Критическая ошибка:', 'red');
  console.error(error);
  process.exit(1);
});

// Запускаем главную функцию
if (require.main === module) {
  main().catch(error => {
    log('\n💥 Ошибка выполнения:', 'red');
    console.error(error);
    process.exit(1);
  });
}

module.exports = { runCommand, generateTestReport };
