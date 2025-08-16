// Тест API уведомлений
const http = require('http');

const API_BASE = 'http://localhost:3001';

// Функция для выполнения HTTP запросов
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session_id=test-session' // Для авторизации
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testNotificationsAPI() {
  console.log('🧪 ТЕСТИРОВАНИЕ API УВЕДОМЛЕНИЙ');
  console.log('=' .repeat(50));

  try {
    // Тест 1: Проверка здоровья API
    console.log('\n1. 🏥 Проверка здоровья API...');
    const health = await makeRequest('GET', '/api/health');
    console.log(`   Статус: ${health.status}`);
    console.log(`   Ответ:`, health.data);

    // Тест 2: Попытка получения уведомлений (должна вернуть 401 без авторизации)
    console.log('\n2. 📬 Получение уведомлений (без авторизации)...');
    const notifications = await makeRequest('GET', '/api/notifications');
    console.log(`   Статус: ${notifications.status} (ожидается 401)`);
    if (notifications.status === 401) {
      console.log('   ✅ Авторизация работает корректно');
    } else {
      console.log('   ⚠️ Неожиданный статус:', notifications.data);
    }

    // Тест 3: Создание тестового уведомления
    console.log('\n3. 📝 Создание тестового уведомления...');
    const createTest = await makeRequest('POST', '/api/notifications/test');
    console.log(`   Статус: ${createTest.status}`);
    console.log(`   Результат:`, createTest.data);

    // Тест 4: Проверка маршрутов уведомлений
    console.log('\n4. 🛣️ Проверка доступных маршрутов...');
    
    // Проверим, есть ли маршруты уведомлений
    const routes = [
      '/api/notifications',
      '/api/notifications/test',
      '/api/notifications/mark-read',
      '/api/notifications/mark-all-read'
    ];

    for (const route of routes) {
      try {
        const response = await makeRequest('GET', route);
        console.log(`   ${route}: ${response.status} ${response.status < 500 ? '✅' : '❌'}`);
      } catch (error) {
        console.log(`   ${route}: ERROR - ${error.message} ❌`);
      }
    }

    console.log('\n' + '=' .repeat(50));
    console.log('✅ Тестирование API завершено');

  } catch (error) {
    console.error('\n❌ Ошибка тестирования:', error.message);
  }
}

// Проверим, запущен ли backend
async function checkBackend() {
  try {
    const health = await makeRequest('GET', '/api/health');
    if (health.status === 200) {
      console.log('✅ Backend запущен и работает');
      return true;
    }
  } catch (error) {
    console.log('❌ Backend не доступен:', error.message);
    console.log('💡 Запустите backend: cd backend && npm run local');
    return false;
  }
}

// Главная функция
async function main() {
  console.log('🔔 ДИАГНОСТИКА СИСТЕМЫ УВЕДОМЛЕНИЙ');
  console.log('Время:', new Date().toLocaleString());
  console.log('API Base:', API_BASE);
  
  const backendRunning = await checkBackend();
  if (backendRunning) {
    await testNotificationsAPI();
  }
}

// Запуск
main().catch(console.error);
