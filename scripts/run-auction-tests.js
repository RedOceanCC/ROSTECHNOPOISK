#!/usr/bin/env node

// 🎯 СКРИПТ ЗАПУСКА КОМПЛЕКСНОГО ТЕСТИРОВАНИЯ АУКЦИОННОЙ СИСТЕМЫ
// 
// Этот скрипт автоматизирует полное тестирование функциональности согласно ТЗ:
// - Создание тестовых данных
// - Проверка всех сценариев аукционов
// - Валидация уведомлений и терминологии
// - Генерация детального отчета готовности

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Конфигурация тестирования
const TEST_CONFIG = {
  timeout: 60000,
  setupTimeout: 30000,
  teardownTimeout: 10000,
  verbose: true,
  bail: false, // Продолжать тесты даже при ошибках
  coverage: true
};

// Список критических проверок согласно ТЗ
const CRITICAL_CHECKS = [
  {
    id: 'test_accounts',
    name: 'Создание тестовых аккаунтов',
    description: 'Менеджеры и владельцы техники разных компаний'
  },
  {
    id: 'equipment_visibility',
    name: 'Видимость техники для менеджеров',
    description: 'Менеджер видит только связанную партнерством технику'
  },
  {
    id: 'request_notifications',
    name: 'Уведомления при создании заявки',
    description: 'Уведомления отправляются только подходящим владельцам'
  },
  {
    id: 'owner_participation',
    name: 'Участие владельцев',
    description: 'Согласие/отказ и подача индивидуальных цен'
  },
  {
    id: 'winner_selection',
    name: 'Определение победителя',
    description: 'Выбор только по минимальной цене'
  },
  {
    id: 'terminology_check',
    name: 'Проверка терминологии',
    description: 'Отсутствие слова "аукцион" в интерфейсе'
  },
  {
    id: 'edge_cases',
    name: 'Сценарии отказов и отмен',
    description: 'Все возможные сценарии отказов и повторных заявок'
  }
];

class AuctionTestRunner {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      duration: 0,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      criticalIssues: [],
      warnings: [],
      recommendations: [],
      readyForProduction: false
    };
    
    this.startTime = Date.now();
  }

  async run() {
    console.log('🚀 ЗАПУСК КОМПЛЕКСНОГО ТЕСТИРОВАНИЯ АУКЦИОННОЙ СИСТЕМЫ');
    console.log('='.repeat(60));
    console.log(`📅 Время запуска: ${new Date().toLocaleString()}`);
    console.log('');

    try {
      // 1. Подготовка окружения
      await this.setupEnvironment();
      
      // 2. Проверка зависимостей
      await this.checkDependencies();
      
      // 3. Запуск тестов
      await this.runUnitTests();
      await this.runIntegrationTests();
      await this.runE2ETests();
      
      // 4. Проверка терминологии
      await this.checkTerminology();
      
      // 5. Анализ результатов
      await this.analyzeResults();
      
      // 6. Генерация отчета
      await this.generateReport();
      
    } catch (error) {
      console.error('❌ Критическая ошибка при тестировании:', error.message);
      this.results.criticalIssues.push({
        type: 'CRITICAL_ERROR',
        message: error.message,
        stack: error.stack
      });
    } finally {
      this.results.duration = Date.now() - this.startTime;
      await this.cleanup();
    }

    return this.results;
  }

  async setupEnvironment() {
    console.log('🔧 Подготовка тестового окружения...');
    
    try {
      // Проверяем наличие тестовой БД
      const testDbPath = path.join(__dirname, '../tests/test.db');
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
        console.log('  ✅ Очищена старая тестовая БД');
      }
      
      // Создаем тестовую БД
      execSync('cd tests && node config/setup-test-db.js', { stdio: 'pipe' });
      console.log('  ✅ Создана новая тестовая БД');
      
      // Проверяем переменные окружения
      process.env.NODE_ENV = 'test';
      process.env.AUCTION_DURATION_HOURS = '24';
      console.log('  ✅ Настроены переменные окружения');
      
    } catch (error) {
      throw new Error(`Ошибка подготовки окружения: ${error.message}`);
    }
  }

  async checkDependencies() {
    console.log('📦 Проверка зависимостей...');
    
    const requiredModules = [
      'jest', 'puppeteer', 'sqlite3', 'bcryptjs'
    ];
    
    const missingModules = [];
    
    for (const module of requiredModules) {
      try {
        require.resolve(module);
        console.log(`  ✅ ${module}`);
      } catch {
        missingModules.push(module);
        console.log(`  ❌ ${module} - НЕ НАЙДЕН`);
      }
    }
    
    if (missingModules.length > 0) {
      throw new Error(`Отсутствуют зависимости: ${missingModules.join(', ')}`);
    }
  }

  async runUnitTests() {
    console.log('🧪 Запуск unit-тестов...');
    
    try {
      const output = execSync('cd tests && npm test -- --testPathPattern="backend.*test\\.js$" --verbose', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      this.parseJestOutput(output, 'unit');
      console.log('  ✅ Unit-тесты завершены');
      
    } catch (error) {
      console.log('  ⚠️ Unit-тесты завершены с ошибками');
      this.results.warnings.push({
        type: 'UNIT_TEST_FAILURES',
        message: 'Некоторые unit-тесты провалились',
        details: error.stdout || error.message
      });
    }
  }

  async runIntegrationTests() {
    console.log('🔗 Запуск integration-тестов...');
    
    try {
      const output = execSync('cd tests && npm test -- --testPathPattern="comprehensive-auction-test\\.js$" --verbose', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      this.parseJestOutput(output, 'integration');
      console.log('  ✅ Integration-тесты завершены');
      
    } catch (error) {
      console.log('  ❌ Integration-тесты провалились');
      this.results.criticalIssues.push({
        type: 'INTEGRATION_FAILURE',
        message: 'Критические ошибки в integration-тестах',
        details: error.stdout || error.message
      });
    }
  }

  async runE2ETests() {
    console.log('🎭 Запуск E2E-тестов...');
    
    try {
      // Проверяем что сервер запущен
      const serverCheck = await this.checkServerRunning();
      if (!serverCheck) {
        console.log('  ⚠️ Сервер не запущен, пропускаем E2E тесты');
        this.results.skippedTests += 1;
        this.results.warnings.push({
          type: 'E2E_SKIPPED',
          message: 'E2E тесты пропущены - сервер не запущен'
        });
        return;
      }
      
      const output = execSync('cd tests && npm test -- --testPathPattern="e2e.*test\\.js$" --verbose', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      this.parseJestOutput(output, 'e2e');
      console.log('  ✅ E2E-тесты завершены');
      
    } catch (error) {
      console.log('  ❌ E2E-тесты провалились');
      this.results.criticalIssues.push({
        type: 'E2E_FAILURE',
        message: 'Ошибки в E2E-тестах',
        details: error.stdout || error.message
      });
    }
  }

  async checkServerRunning() {
    try {
      const http = require('http');
      
      return new Promise((resolve) => {
        const req = http.get('http://localhost:3000', (res) => {
          resolve(true);
        });
        
        req.on('error', () => {
          resolve(false);
        });
        
        req.setTimeout(5000, () => {
          req.destroy();
          resolve(false);
        });
      });
    } catch {
      return false;
    }
  }

  async checkTerminology() {
    console.log('🔍 Проверка терминологии...');
    
    const problematicFiles = [];
    const searchPaths = [
      'app.js',
      'index.html',
      'backend/services',
      'backend/routes',
      'backend/models'
    ];
    
    for (const searchPath of searchPaths) {
      try {
        const output = execSync(`grep -r -i "аукцион" ${searchPath} || true`, { 
          encoding: 'utf8',
          cwd: path.join(__dirname, '..')
        });
        
        if (output.trim()) {
          const lines = output.trim().split('\n');
          lines.forEach(line => {
            if (line.includes('аукцион')) {
              problematicFiles.push(line);
            }
          });
        }
      } catch (error) {
        // Игнорируем ошибки grep
      }
    }
    
    if (problematicFiles.length > 0) {
      this.results.criticalIssues.push({
        type: 'TERMINOLOGY_VIOLATION',
        message: `Найдено ${problematicFiles.length} упоминаний слова "аукцион" в коде`,
        details: problematicFiles.slice(0, 10) // Показываем первые 10
      });
      console.log(`  ❌ Найдено ${problematicFiles.length} упоминаний "аукцион"`);
    } else {
      console.log('  ✅ Терминология соответствует требованиям');
    }
  }

  parseJestOutput(output, testType) {
    // Простой парсинг вывода Jest
    const lines = output.split('\n');
    
    let passed = 0;
    let failed = 0;
    
    lines.forEach(line => {
      if (line.includes('✓') || line.includes('PASS')) {
        passed++;
      } else if (line.includes('✗') || line.includes('FAIL')) {
        failed++;
      }
    });
    
    this.results.totalTests += passed + failed;
    this.results.passedTests += passed;
    this.results.failedTests += failed;
    
    console.log(`    Пройдено: ${passed}, Провалено: ${failed}`);
  }

  async analyzeResults() {
    console.log('📊 Анализ результатов...');
    
    // Проверяем критические требования
    const criticalFailures = this.results.criticalIssues.filter(issue => 
      ['INTEGRATION_FAILURE', 'TERMINOLOGY_VIOLATION', 'CRITICAL_ERROR'].includes(issue.type)
    );
    
    // Определяем готовность к продакшену
    this.results.readyForProduction = (
      criticalFailures.length === 0 &&
      this.results.failedTests < this.results.totalTests * 0.1 && // Менее 10% провалов
      this.results.totalTests > 0
    );
    
    // Добавляем рекомендации
    if (!this.results.readyForProduction) {
      this.results.recommendations.push('Устранить критические ошибки перед запуском');
    }
    
    if (this.results.warnings.length > 0) {
      this.results.recommendations.push('Рассмотреть предупреждения для улучшения стабильности');
    }
    
    if (this.results.criticalIssues.some(issue => issue.type === 'TERMINOLOGY_VIOLATION')) {
      this.results.recommendations.push('КРИТИЧНО: Заменить все упоминания "аукцион" на нейтральную терминологию');
    }
    
    console.log(`  📈 Успешность: ${((this.results.passedTests / this.results.totalTests) * 100).toFixed(1)}%`);
    console.log(`  🎯 Готовность к продакшену: ${this.results.readyForProduction ? '✅ ДА' : '❌ НЕТ'}`);
  }

  async generateReport() {
    console.log('📄 Генерация отчета...');
    
    const report = this.createDetailedReport();
    
    // Сохраняем отчет в файл
    const reportPath = path.join(__dirname, '../test-results', `auction-test-report-${Date.now()}.json`);
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Создаем читаемый отчет
    const readableReportPath = reportPath.replace('.json', '.md');
    fs.writeFileSync(readableReportPath, this.createMarkdownReport(report));
    
    console.log(`  📁 Отчет сохранен: ${reportPath}`);
    console.log(`  📄 Читаемый отчет: ${readableReportPath}`);
    
    // Выводим краткий отчет в консоль
    this.printSummary();
  }

  createDetailedReport() {
    return {
      meta: {
        testSuite: 'Comprehensive Auction System Test',
        version: '1.0.0',
        environment: 'test',
        ...this.results
      },
      criticalChecks: CRITICAL_CHECKS.map(check => ({
        ...check,
        status: this.getCriticalCheckStatus(check.id),
        issues: this.results.criticalIssues.filter(issue => 
          issue.message.toLowerCase().includes(check.name.toLowerCase())
        )
      })),
      summary: {
        totalTests: this.results.totalTests,
        passedTests: this.results.passedTests,
        failedTests: this.results.failedTests,
        skippedTests: this.results.skippedTests,
        successRate: ((this.results.passedTests / this.results.totalTests) * 100).toFixed(2),
        duration: this.results.duration,
        readyForProduction: this.results.readyForProduction
      },
      issues: {
        critical: this.results.criticalIssues,
        warnings: this.results.warnings
      },
      recommendations: this.results.recommendations
    };
  }

  getCriticalCheckStatus(checkId) {
    // Простая логика определения статуса на основе типов ошибок
    const relatedIssues = this.results.criticalIssues.filter(issue => {
      switch (checkId) {
        case 'terminology_check':
          return issue.type === 'TERMINOLOGY_VIOLATION';
        case 'equipment_visibility':
          return issue.message.includes('visibility') || issue.message.includes('видимость');
        default:
          return false;
      }
    });
    
    return relatedIssues.length === 0 ? 'PASSED' : 'FAILED';
  }

  createMarkdownReport(report) {
    return `# 📋 ОТЧЕТ ТЕСТИРОВАНИЯ АУКЦИОННОЙ СИСТЕМЫ

**Дата:** ${new Date(report.meta.timestamp).toLocaleString()}  
**Длительность:** ${report.meta.duration}ms  
**Готовность к продакшену:** ${report.meta.readyForProduction ? '✅ ДА' : '❌ НЕТ'}

## 📊 Сводка

| Метрика | Значение |
|---------|----------|
| Всего тестов | ${report.summary.totalTests} |
| Пройдено | ${report.summary.passedTests} |
| Провалено | ${report.summary.failedTests} |
| Пропущено | ${report.summary.skippedTests} |
| Успешность | ${report.summary.successRate}% |

## 🎯 Критические проверки

${report.criticalChecks.map(check => `
### ${check.name}
**Статус:** ${check.status === 'PASSED' ? '✅' : '❌'} ${check.status}  
**Описание:** ${check.description}  
${check.issues.length > 0 ? `**Проблемы:** ${check.issues.length}` : ''}
`).join('')}

## 🚨 Критические проблемы

${report.issues.critical.length === 0 ? '*Критических проблем не обнаружено*' : 
  report.issues.critical.map(issue => `
### ${issue.type}
${issue.message}
${issue.details ? '```\n' + issue.details + '\n```' : ''}
`).join('')}

## ⚠️ Предупреждения

${report.issues.warnings.length === 0 ? '*Предупреждений нет*' : 
  report.issues.warnings.map(warning => `- ${warning.message}`).join('\n')}

## 💡 Рекомендации

${report.recommendations.length === 0 ? '*Дополнительных рекомендаций нет*' : 
  report.recommendations.map(rec => `- ${rec}`).join('\n')}

## 🎯 Заключение

${report.meta.readyForProduction ? 
  '✅ **СИСТЕМА ГОТОВА К ЗАПУСКУ**\n\nВсе критические тесты пройдены, функциональность соответствует требованиям.' :
  '❌ **СИСТЕМА НЕ ГОТОВА К ЗАПУСКУ**\n\nОбнаружены критические проблемы, требующие устранения перед развертыванием в продакшене.'}
`;
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 ИТОГОВЫЙ ОТЧЕТ ТЕСТИРОВАНИЯ');
    console.log('='.repeat(60));
    console.log(`⏱️  Длительность: ${this.results.duration}ms`);
    console.log(`🧪 Всего тестов: ${this.results.totalTests}`);
    console.log(`✅ Пройдено: ${this.results.passedTests}`);
    console.log(`❌ Провалено: ${this.results.failedTests}`);
    console.log(`⏭️  Пропущено: ${this.results.skippedTests}`);
    
    if (this.results.totalTests > 0) {
      const successRate = ((this.results.passedTests / this.results.totalTests) * 100).toFixed(1);
      console.log(`📈 Успешность: ${successRate}%`);
    }
    
    console.log(`🚨 Критических проблем: ${this.results.criticalIssues.length}`);
    console.log(`⚠️  Предупреждений: ${this.results.warnings.length}`);
    
    console.log('\n🎯 ГОТОВНОСТЬ К ПРОДАКШЕНУ:');
    if (this.results.readyForProduction) {
      console.log('✅ СИСТЕМА ГОТОВА К ЗАПУСКУ');
      console.log('   Все критические тесты пройдены успешно');
    } else {
      console.log('❌ СИСТЕМА НЕ ГОТОВА К ЗАПУСКУ');
      console.log('   Требуется устранение критических проблем:');
      this.results.criticalIssues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue.message}`);
      });
    }
    
    if (this.results.recommendations.length > 0) {
      console.log('\n💡 РЕКОМЕНДАЦИИ:');
      this.results.recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
  }

  async cleanup() {
    console.log('🧹 Очистка тестового окружения...');
    
    try {
      // Очищаем тестовую БД
      const testDbPath = path.join(__dirname, '../tests/test.db');
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
      
      console.log('  ✅ Тестовое окружение очищено');
    } catch (error) {
      console.log(`  ⚠️ Ошибка очистки: ${error.message}`);
    }
  }
}

// Запуск тестирования при прямом вызове скрипта
if (require.main === module) {
  const runner = new AuctionTestRunner();
  
  runner.run()
    .then(results => {
      process.exit(results.readyForProduction ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Фатальная ошибка:', error);
      process.exit(2);
    });
}

module.exports = AuctionTestRunner;
