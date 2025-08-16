#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('🔍 ПОЛНАЯ ПРОВЕРКА СИСТЕМЫ РОСТЕХНОПОИСК\n');

async function systemCheck() {
  const checks = [];
  
  // 1. Проверка файловой структуры
  console.log('📁 Проверка файловой структуры...');
  
  const requiredFiles = [
    'package.json',
    'backend/package.json',
    'backend/server.js',
    'backend/config.env',
    'backend/database/schema.sql',
    'backend/database/init.js',
    'index.html',
    'app.js',
    'style.css',
    'README.md',
    'BUILD.md'
  ];
  
  const requiredDirs = [
    'backend',
    'backend/models',
    'backend/routes',
    'backend/middleware',
    'backend/services',
    'backend/database'
  ];
  
  // Проверка файлов
  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file}`);
      checks.push({ type: 'file', name: file, status: 'ok' });
    } else {
      console.log(`❌ ${file} - ОТСУТСТВУЕТ!`);
      checks.push({ type: 'file', name: file, status: 'missing' });
    }
  }
  
  // Проверка папок
  for (const dir of requiredDirs) {
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      console.log(`✅ ${dir}/`);
      checks.push({ type: 'dir', name: dir, status: 'ok' });
    } else {
      console.log(`❌ ${dir}/ - ОТСУТСТВУЕТ!`);
      checks.push({ type: 'dir', name: dir, status: 'missing' });
    }
  }
  
  // 2. Проверка package.json
  console.log('\n📦 Проверка package.json...');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const backendPackageJson = JSON.parse(fs.readFileSync('backend/package.json', 'utf8'));
    
    console.log(`✅ Корневой package.json: ${packageJson.name} v${packageJson.version}`);
    console.log(`✅ Backend package.json: ${backendPackageJson.name} v${backendPackageJson.version}`);
    
    // Проверка скриптов
    const requiredScripts = ['dev', 'start', 'install-backend', 'init-db', 'setup'];
    for (const script of requiredScripts) {
      if (packageJson.scripts && packageJson.scripts[script]) {
        console.log(`✅ npm run ${script}`);
        checks.push({ type: 'script', name: script, status: 'ok' });
      } else {
        console.log(`❌ npm run ${script} - НЕ НАЙДЕН!`);
        checks.push({ type: 'script', name: script, status: 'missing' });
      }
    }
    
  } catch (error) {
    console.log(`❌ Ошибка чтения package.json: ${error.message}`);
    checks.push({ type: 'config', name: 'package.json', status: 'error' });
  }
  
  // 3. Проверка конфигурации
  console.log('\n⚙️ Проверка конфигурации...');
  
  try {
    const nodeEnv = process.env.NODE_ENV || 'local';
    const configPath = `backend/.env.${nodeEnv}`;
    if (fs.existsSync(configPath)) {
      const config = fs.readFileSync(configPath, 'utf8');
      const requiredVars = ['PORT', 'SESSION_SECRET', 'AUCTION_DURATION_HOURS'];
      
      console.log(`🔍 Проверяем конфигурацию: ${configPath}`);
      
      for (const varName of requiredVars) {
        if (config.includes(`${varName}=`)) {
          console.log(`✅ ${varName}`);
          checks.push({ type: 'config', name: varName, status: 'ok' });
        } else {
          console.log(`❌ ${varName} - НЕ НАЙДЕНА!`);
          checks.push({ type: 'config', name: varName, status: 'missing' });
        }
      }
    } else {
      console.log(`❌ ${configPath} - ОТСУТСТВУЕТ!`);
      console.log(`💡 Попробуйте создать файл или проверить backend/.env.local`);
      checks.push({ type: 'config', name: configPath, status: 'missing' });
    }
  } catch (error) {
    console.log(`❌ Ошибка проверки конфигурации: ${error.message}`);
  }
  
  // 4. Проверка базы данных
  console.log('\n🗄️ Проверка базы данных...');
  
  const dbPath = 'backend/database/rostechnopolsk.db';
  if (fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath);
    console.log(`✅ База данных существует (${(stats.size / 1024).toFixed(1)} KB)`);
    checks.push({ type: 'database', name: 'sqlite', status: 'ok' });
  } else {
    console.log('❌ База данных НЕ НАЙДЕНА! Запустите: npm run init-db');
    checks.push({ type: 'database', name: 'sqlite', status: 'missing' });
  }
  
  // 5. Проверка зависимостей
  console.log('\n📚 Проверка зависимостей...');
  
  const nodeModulesPath = 'backend/node_modules';
  if (fs.existsSync(nodeModulesPath)) {
    console.log('✅ node_modules установлены');
    
    // Проверка ключевых зависимостей
    const keyDeps = ['express', 'sqlite3', 'bcrypt', 'express-session'];
    for (const dep of keyDeps) {
      const depPath = path.join(nodeModulesPath, dep);
      if (fs.existsSync(depPath)) {
        console.log(`✅ ${dep}`);
        checks.push({ type: 'dependency', name: dep, status: 'ok' });
      } else {
        console.log(`❌ ${dep} - НЕ УСТАНОВЛЕНА!`);
        checks.push({ type: 'dependency', name: dep, status: 'missing' });
      }
    }
  } else {
    console.log('❌ node_modules НЕ НАЙДЕНЫ! Запустите: npm run install-backend');
    checks.push({ type: 'dependency', name: 'node_modules', status: 'missing' });
  }
  
  // 6. Проверка API (если сервер запущен)
  console.log('\n🌐 Проверка API...');
  
  try {
    const healthResponse = await makeRequest('/api/health');
    if (healthResponse.statusCode === 200) {
      console.log('✅ API сервер доступен');
      console.log(`   Сообщение: ${healthResponse.data.message || 'N/A'}`);
      checks.push({ type: 'api', name: 'health', status: 'ok' });
      
      // Тест equipment-types (без авторизации)
      try {
        const typesResponse = await makeRequest('/api/equipment/equipment-types');
        if (typesResponse.statusCode === 200) {
          console.log('✅ Equipment Types API работает');
          checks.push({ type: 'api', name: 'equipment-types', status: 'ok' });
        } else {
          console.log(`⚠️ Equipment Types API: ${typesResponse.statusCode}`);
          checks.push({ type: 'api', name: 'equipment-types', status: 'warning' });
        }
      } catch (error) {
        console.log(`❌ Equipment Types API недоступен`);
        checks.push({ type: 'api', name: 'equipment-types', status: 'error' });
      }
      
    } else {
      console.log(`⚠️ API сервер отвечает с кодом: ${healthResponse.statusCode}`);
      checks.push({ type: 'api', name: 'health', status: 'warning' });
    }
  } catch (error) {
    console.log('❌ API сервер недоступен (возможно не запущен)');
    console.log('   Запустите: npm run dev');
    checks.push({ type: 'api', name: 'server', status: 'down' });
  }
  
  // 7. Генерация отчета
  console.log('\n📊 ИТОГОВЫЙ ОТЧЕТ:');
  
  const summary = {
    total: checks.length,
    ok: checks.filter(c => c.status === 'ok').length,
    missing: checks.filter(c => c.status === 'missing').length,
    error: checks.filter(c => c.status === 'error').length,
    warning: checks.filter(c => c.status === 'warning').length,
    down: checks.filter(c => c.status === 'down').length
  };
  
  console.log(`✅ Успешно: ${summary.ok}/${summary.total}`);
  
  if (summary.missing > 0) console.log(`❌ Отсутствует: ${summary.missing}`);
  if (summary.error > 0) console.log(`💥 Ошибки: ${summary.error}`);
  if (summary.warning > 0) console.log(`⚠️ Предупреждения: ${summary.warning}`);
  if (summary.down > 0) console.log(`🔻 Недоступно: ${summary.down}`);
  
  // Процент готовности
  const readiness = Math.round((summary.ok / summary.total) * 100);
  console.log(`\n🎯 ГОТОВНОСТЬ СИСТЕМЫ: ${readiness}%`);
  
  if (readiness >= 90) {
    console.log('🎉 Система полностью готова к работе!');
  } else if (readiness >= 75) {
    console.log('⚡ Система почти готова, есть небольшие проблемы');
  } else if (readiness >= 50) {
    console.log('⚠️ Система частично готова, требует настройки');
  } else {
    console.log('🚨 Система требует серьезной настройки');
  }
  
  // Рекомендации
  console.log('\n💡 РЕКОМЕНДАЦИИ:');
  
  if (summary.missing > 0) {
    console.log('1. Установите отсутствующие файлы и зависимости');
    console.log('   npm run setup');
  }
  
  if (checks.some(c => c.type === 'api' && c.status === 'down')) {
    console.log('2. Запустите сервер для тестирования API');
    console.log('   npm run dev');
  }
  
  if (checks.some(c => c.name === 'sqlite' && c.status === 'missing')) {
    console.log('3. Инициализируйте базу данных');
    console.log('   npm run init-db');
  }
  
  console.log('4. Откройте index.html в браузере для тестирования');
  console.log('5. Используйте тестовые аккаунты: admin123, owner123, manager123');
  
  return { summary, readiness, checks };
}

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsedData = data ? JSON.parse(data) : null;
          resolve({ statusCode: res.statusCode, data: parsedData });
        } catch (error) {
          resolve({ statusCode: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(3000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    
    req.end();
  });
}

// Запуск проверки если файл запущен напрямую
if (require.main === module) {
  systemCheck().catch(console.error);
}

module.exports = { systemCheck };
