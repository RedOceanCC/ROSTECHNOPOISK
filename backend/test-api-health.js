const http = require('http');
const https = require('https');

// Функция для HTTP запросов
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    
    const req = lib.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'NotificationTest/1.0',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            headers: res.headers,
            data: data ? JSON.parse(data) : null
          };
          resolve(response);
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
            error: 'Invalid JSON'
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testApiHealth() {
  console.log('🌐 ТЕСТИРОВАНИЕ API ЗДОРОВЬЯ И УВЕДОМЛЕНИЙ\n');
  
  // Определяем базовый URL
  const baseUrls = [
    'http://localhost:3000',  // Локальная разработка
    'https://ростехнопоиск.рф', // Продакшн
    'http://127.0.0.1:3000'   // Альтернативный локальный
  ];
  
  let workingBaseUrl = null;
  
  // Ищем рабочий сервер
  console.log('1. Поиск работающего сервера...');
  for (const baseUrl of baseUrls) {
    try {
      console.log(`   Проверяем: ${baseUrl}`);
      const response = await makeRequest(`${baseUrl}/api/health`);
      
      if (response.status === 200) {
        console.log(`   ✅ Сервер отвечает: ${baseUrl}`);
        console.log(`   📊 Ответ: ${JSON.stringify(response.data, null, 2)}`);
        workingBaseUrl = baseUrl;
        break;
      } else {
        console.log(`   ❌ Статус ${response.status}: ${baseUrl}`);
      }
    } catch (error) {
      console.log(`   ❌ Недоступен: ${baseUrl} (${error.message})`);
    }
  }
  
  if (!workingBaseUrl) {
    console.log('\n❌ НЕ НАЙДЕН РАБОТАЮЩИЙ СЕРВЕР!');
    console.log('💡 Убедитесь что backend запущен:');
    console.log('   cd backend && node server.js');
    console.log('   или');
    console.log('   pm2 restart rostechnopolsk-backend');
    return;
  }
  
  console.log(`\n2. Тестирование endpoints уведомлений на ${workingBaseUrl}...\n`);
  
  // Тестируемые endpoints
  const endpoints = [
    {
      name: 'Health Check',
      url: '/api/health',
      method: 'GET',
      expectAuth: false
    },
    {
      name: 'Get Notifications',
      url: '/api/notifications',
      method: 'GET',
      expectAuth: true
    },
    {
      name: 'Get Unread Count',
      url: '/api/notifications/count',
      method: 'GET',
      expectAuth: true
    },
    {
      name: 'Get Unread Notifications',
      url: '/api/notifications/unread',
      method: 'GET',
      expectAuth: true
    },
    {
      name: 'Create Test Notification',
      url: '/api/notifications/test',
      method: 'POST',
      expectAuth: true
    }
  ];
  
  // Тестируем каждый endpoint
  for (const endpoint of endpoints) {
    try {
      console.log(`📡 Тестируем: ${endpoint.name}`);
      console.log(`   URL: ${endpoint.method} ${endpoint.url}`);
      
      const response = await makeRequest(`${workingBaseUrl}${endpoint.url}`, {
        method: endpoint.method
      });
      
      console.log(`   📊 Статус: ${response.status}`);
      
      if (endpoint.expectAuth && response.status === 401) {
        console.log(`   ✅ Правильно требует авторизацию`);
      } else if (!endpoint.expectAuth && response.status === 200) {
        console.log(`   ✅ Работает корректно`);
        if (response.data) {
          console.log(`   📄 Данные: ${JSON.stringify(response.data).substring(0, 100)}...`);
        }
      } else if (response.status === 404) {
        console.log(`   ❌ Endpoint не найден (404)`);
      } else if (response.status >= 500) {
        console.log(`   ❌ Ошибка сервера (${response.status})`);
        if (response.data) {
          console.log(`   📄 Ошибка: ${JSON.stringify(response.data)}`);
        }
      } else {
        console.log(`   ⚠️ Неожиданный статус: ${response.status}`);
        if (response.data) {
          console.log(`   📄 Ответ: ${JSON.stringify(response.data).substring(0, 200)}`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Ошибка запроса: ${error.message}`);
    }
    
    console.log(''); // Пустая строка для разделения
  }
  
  // Дополнительные проверки
  console.log('3. Дополнительные проверки...\n');
  
  // Проверяем статические файлы
  const staticFiles = [
    '/notifications.js',
    '/app.js',
    '/style.css'
  ];
  
  for (const file of staticFiles) {
    try {
      const response = await makeRequest(`${workingBaseUrl}${file}`);
      const status = response.status === 200 ? '✅' : '❌';
      console.log(`${status} Статический файл ${file}: ${response.status}`);
    } catch (error) {
      console.log(`❌ Статический файл ${file}: недоступен`);
    }
  }
  
  console.log('\n🎯 РЕЗУЛЬТАТЫ:');
  console.log(`✅ Сервер работает: ${workingBaseUrl}`);
  console.log('📋 Проверьте логи выше для деталей по каждому endpoint');
  
  console.log('\n💡 СОВЕТЫ ПО ОТЛАДКЕ:');
  console.log('1. Если все endpoints возвращают 401 - проблема с авторизацией');
  console.log('2. Если endpoints возвращают 404 - проверьте роуты в server.js');
  console.log('3. Если 500 ошибки - смотрите логи сервера: pm2 logs');
  console.log('4. Проверьте что миграция уведомлений применена');
  console.log('5. Откройте браузер и проверьте Network tab в DevTools');
}

// Запуск только если вызван напрямую
if (require.main === module) {
  testApiHealth().catch(console.error);
}

module.exports = testApiHealth;
