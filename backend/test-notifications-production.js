const Database = require('./models/Database');
const NotificationService = require('./services/NotificationService');
const User = require('./models/User');

async function testNotificationsProduction() {
  console.log('🧪 ТЕСТИРОВАНИЕ МОДУЛЯ УВЕДОМЛЕНИЙ НА ПРОДАКШЕНЕ\n');
  
  try {
    await Database.connect();
    
    // Тест 1: Проверяем подключение к БД и схему
    console.log('1. Проверка схемы базы данных...');
    
    try {
      const tableInfo = await Database.all("PRAGMA table_info(notifications)");
      console.log('✅ Таблица notifications существует');
      console.log('📋 Структура таблицы:');
      tableInfo.forEach(col => {
        console.log(`   - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
      });
      
      // Проверяем CHECK constraint
      const schema = await Database.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='notifications'");
      console.log('📄 SQL схема:', schema.sql.substring(0, 200) + '...');
      
    } catch (error) {
      console.log('❌ ОШИБКА: Таблица notifications не найдена или недоступна');
      console.log('Ошибка:', error.message);
      return;
    }
    
    // Тест 2: Проверяем существующих пользователей
    console.log('\n2. Проверка пользователей...');
    
    const users = await User.findAll();
    console.log(`👥 Найдено активных пользователей: ${users.length}`);
    
    if (users.length === 0) {
      console.log('❌ ОШИБКА: Нет пользователей для тестирования');
      return;
    }
    
    const testUser = users[0];
    console.log(`🧪 Тестовый пользователь: ${testUser.name} (ID: ${testUser.id}, роль: ${testUser.role})`);
    
    // Тест 3: Создание тестового уведомления
    console.log('\n3. Создание тестового уведомления...');
    
    try {
      const notificationId = await NotificationService.sendNotification(testUser.id, {
        type: 'system',
        title: 'Тест продакшн уведомления',
        message: `Тестовое уведомление создано ${new Date().toLocaleString('ru-RU')}. Пользователь: ${testUser.name}`
      });
      
      console.log(`✅ Уведомление создано с ID: ${notificationId}`);
      
    } catch (error) {
      console.log('❌ ОШИБКА создания уведомления:', error.message);
      console.log('Детали:', error);
      return;
    }
    
    // Тест 4: Получение уведомлений пользователя
    console.log('\n4. Получение уведомлений пользователя...');
    
    try {
      const userNotifications = await NotificationService.getUserNotifications(testUser.id, 10);
      console.log(`📨 Найдено уведомлений: ${userNotifications.length}`);
      
      if (userNotifications.length > 0) {
        console.log('📋 Последние уведомления:');
        userNotifications.slice(0, 3).forEach(notification => {
          console.log(`   - [${notification.type}] ${notification.title}`);
          console.log(`     ${notification.message.substring(0, 50)}...`);
          console.log(`     Создано: ${notification.created_at}, Прочитано: ${notification.read_at || 'Нет'}`);
        });
      }
      
    } catch (error) {
      console.log('❌ ОШИБКА получения уведомлений:', error.message);
      return;
    }
    
    // Тест 5: Подсчет непрочитанных
    console.log('\n5. Подсчет непрочитанных уведомлений...');
    
    try {
      const unreadCount = await NotificationService.getUnreadCount(testUser.id);
      console.log(`📊 Непрочитанных уведомлений: ${unreadCount}`);
      
    } catch (error) {
      console.log('❌ ОШИБКА подсчета непрочитанных:', error.message);
      return;
    }
    
    // Тест 6: Тест API endpoint через HTTP запрос
    console.log('\n6. Тестирование API endpoints...');
    
    const testApiEndpoints = async () => {
      const endpoints = [
        '/api/notifications',
        '/api/notifications/count',
        '/api/notifications/unread'
      ];
      
      for (const endpoint of endpoints) {
        try {
          // Симулируем HTTP запрос без реального сервера
          console.log(`📡 Тестируем endpoint: ${endpoint}`);
          console.log('   ⚠️ Примечание: Для полного тестирования нужен запущенный сервер');
        } catch (error) {
          console.log(`❌ Ошибка endpoint ${endpoint}:`, error.message);
        }
      }
    };
    
    await testApiEndpoints();
    
    // Тест 7: Проверка интеграции с другими модулями
    console.log('\n7. Проверка интеграции с другими сервисами...');
    
    try {
      // Проверяем, используется ли NotificationService в других местах
      const fs = require('fs');
      const path = require('path');
      
      const checkFileForNotifications = (filePath) => {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          return content.includes('NotificationService');
        } catch {
          return false;
        }
      };
      
      const integrationFiles = [
        './services/AuctionService.js',
        './routes/telegram.js'
      ];
      
      integrationFiles.forEach(file => {
        const hasIntegration = checkFileForNotifications(file);
        console.log(`   ${hasIntegration ? '✅' : '❌'} ${file}: ${hasIntegration ? 'интегрирован' : 'не использует NotificationService'}`);
      });
      
    } catch (error) {
      console.log('⚠️ Не удалось проверить интеграцию:', error.message);
    }
    
    // Тест 8: Статистика уведомлений
    console.log('\n8. Общая статистика уведомлений...');
    
    try {
      const totalNotifications = await Database.get('SELECT COUNT(*) as count FROM notifications');
      const notificationsByType = await Database.all(`
        SELECT type, COUNT(*) as count 
        FROM notifications 
        GROUP BY type 
        ORDER BY count DESC
      `);
      
      console.log(`📊 Всего уведомлений в системе: ${totalNotifications.count}`);
      console.log('📊 По типам:');
      notificationsByType.forEach(stat => {
        console.log(`   - ${stat.type}: ${stat.count}`);
      });
      
      const recentActivity = await Database.all(`
        SELECT DATE(created_at) as date, COUNT(*) as count 
        FROM notifications 
        WHERE created_at > datetime('now', '-7 days')
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `);
      
      console.log('📊 Активность за последние 7 дней:');
      recentActivity.forEach(day => {
        console.log(`   - ${day.date}: ${day.count} уведомлений`);
      });
      
    } catch (error) {
      console.log('❌ ОШИБКА получения статистики:', error.message);
    }
    
    console.log('\n🎯 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:');
    console.log('✅ Модуль NotificationService работает корректно');
    console.log('✅ База данных настроена правильно');
    console.log('✅ Создание и получение уведомлений функционирует');
    console.log('✅ Подсчет непрочитанных работает');
    
    console.log('\n💡 РЕКОМЕНДАЦИИ:');
    console.log('1. Проверьте запущен ли backend сервер для API endpoints');
    console.log('2. Убедитесь что frontend загружает notifications.js');
    console.log('3. Проверьте браузерную консоль на ошибки JavaScript');
    console.log('4. Проверьте сетевые запросы в DevTools браузера');
    
  } catch (error) {
    console.log('❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    console.log('Stack trace:', error.stack);
  } finally {
    await Database.close();
  }
}

// Запуск тестирования
if (require.main === module) {
  testNotificationsProduction().catch(console.error);
}

module.exports = testNotificationsProduction;
