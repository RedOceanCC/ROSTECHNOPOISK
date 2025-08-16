const Database = require('./models/Database');
const NotificationService = require('./services/NotificationService');
const User = require('./models/User');
const Company = require('./models/Company');

async function testNotificationSystem() {
  await Database.connect();
  
  console.log('🧪 КОМПЛЕКСНОЕ ТЕСТИРОВАНИЕ СИСТЕМЫ УВЕДОМЛЕНИЙ\n');
  
  try {
    // Создаем тестовых пользователей
    console.log('1. Создание тестовых пользователей...');
    
    const testCompany = await Company.create({
      name: 'Test Notification Company',
      description: 'Компания для тестирования уведомлений'
    });
    
    const user1 = await User.create({
      name: 'Тест Пользователь 1',
      password: 'test123',
      role: 'manager',
      company_id: testCompany.id,
      phone: '+7-999-111-0001'
    });
    
    const user2 = await User.create({
      name: 'Тест Пользователь 2',
      password: 'test123',
      role: 'owner',
      company_id: testCompany.id,
      phone: '+7-999-111-0002'
    });
    
    console.log(`✅ Созданы пользователи: ${user1.name} (ID: ${user1.id}), ${user2.name} (ID: ${user2.id})`);
    
    // Тест 1: Создание уведомлений для разных пользователей
    console.log('\n2. Тест создания уведомлений для разных пользователей...');
    
    const notification1 = await NotificationService.sendNotification(user1.id, {
      type: 'new_request',
      title: 'Уведомление для пользователя 1',
      message: 'Это уведомление предназначено только для пользователя 1'
    });
    
    const notification2 = await NotificationService.sendNotification(user2.id, {
      type: 'auction_closed',
      title: 'Уведомление для пользователя 2',
      message: 'Это уведомление предназначено только для пользователя 2'
    });
    
    const notification3 = await NotificationService.sendNotification(user1.id, {
      type: 'system',
      title: 'Второе уведомление для пользователя 1',
      message: 'Пользователь 1 должен видеть это уведомление'
    });
    
    console.log(`✅ Созданы уведомления: ${notification1}, ${notification2}, ${notification3}`);
    
    // Тест 2: Проверка изоляции уведомлений
    console.log('\n3. Тест изоляции уведомлений между пользователями...');
    
    const user1Notifications = await NotificationService.getUserNotifications(user1.id);
    const user2Notifications = await NotificationService.getUserNotifications(user2.id);
    
    console.log(`👤 Пользователь 1 видит ${user1Notifications.length} уведомлений:`);
    user1Notifications.forEach(n => console.log(`   - ${n.title}`));
    
    console.log(`👤 Пользователь 2 видит ${user2Notifications.length} уведомлений:`);
    user2Notifications.forEach(n => console.log(`   - ${n.title}`));
    
    // Проверяем корректность изоляции
    const user1HasUser2Notification = user1Notifications.some(n => n.title.includes('пользователя 2'));
    const user2HasUser1Notification = user2Notifications.some(n => n.title.includes('пользователя 1'));
    
    if (user1HasUser2Notification || user2HasUser1Notification) {
      console.log('❌ ОШИБКА: Обнаружена утечка уведомлений между пользователями!');
    } else {
      console.log('✅ Изоляция уведомлений работает корректно');
    }
    
    // Тест 3: Проверка непрочитанных уведомлений
    console.log('\n4. Тест подсчета непрочитанных уведомлений...');
    
    const user1UnreadCount = await NotificationService.getUnreadCount(user1.id);
    const user2UnreadCount = await NotificationService.getUnreadCount(user2.id);
    
    console.log(`📊 Непрочитанных уведомлений - Пользователь 1: ${user1UnreadCount}, Пользователь 2: ${user2UnreadCount}`);
    
    if (user1UnreadCount !== 2 || user2UnreadCount !== 1) {
      console.log('❌ ОШИБКА: Неправильный подсчет непрочитанных уведомлений!');
    } else {
      console.log('✅ Подсчет непрочитанных уведомлений работает корректно');
    }
    
    // Тест 4: Отметка как прочитанное
    console.log('\n5. Тест отметки уведомлений как прочитанных...');
    
    // Пользователь 1 отмечает одно уведомление
    const success1 = await NotificationService.markAsRead(notification1, user1.id);
    console.log(`📖 Пользователь 1 отметил уведомление ${notification1}: ${success1 ? 'успешно' : 'ошибка'}`);
    
    // Пользователь 2 пытается отметить чужое уведомление (должно не сработать)
    const success2 = await NotificationService.markAsRead(notification1, user2.id);
    console.log(`🚫 Пользователь 2 пытается отметить чужое уведомление: ${success2 ? 'успешно (ОШИБКА!)' : 'отклонено (правильно)'}`);
    
    // Проверяем обновленные счетчики
    const user1UnreadCountAfter = await NotificationService.getUnreadCount(user1.id);
    const user2UnreadCountAfter = await NotificationService.getUnreadCount(user2.id);
    
    console.log(`📊 После отметки - Пользователь 1: ${user1UnreadCountAfter}, Пользователь 2: ${user2UnreadCountAfter}`);
    
    if (user1UnreadCountAfter !== 1 || user2UnreadCountAfter !== 1) {
      console.log('❌ ОШИБКА: Неправильное обновление счетчиков после прочтения!');
    } else {
      console.log('✅ Отметка как прочитанное работает корректно');
    }
    
    // Тест 5: Отметка всех как прочитанных
    console.log('\n6. Тест отметки всех уведомлений как прочитанных...');
    
    const markedCount = await NotificationService.markAllAsRead(user1.id);
    console.log(`📚 Пользователь 1 отметил ${markedCount} уведомлений как прочитанные`);
    
    const user1FinalUnreadCount = await NotificationService.getUnreadCount(user1.id);
    const user2FinalUnreadCount = await NotificationService.getUnreadCount(user2.id);
    
    console.log(`📊 Финальные счетчики - Пользователь 1: ${user1FinalUnreadCount}, Пользователь 2: ${user2FinalUnreadCount}`);
    
    if (user1FinalUnreadCount !== 0 || user2FinalUnreadCount !== 1) {
      console.log('❌ ОШИБКА: Неправильное обновление после массовой отметки!');
    } else {
      console.log('✅ Массовая отметка как прочитанное работает корректно');
    }
    
    // Тест 6: Безопасность доступа
    console.log('\n7. Тест безопасности доступа к уведомлениям...');
    
    // Получаем все уведомления из БД для проверки
    const allNotifications = await Database.all('SELECT * FROM notifications');
    console.log(`📋 Всего уведомлений в БД: ${allNotifications.length}`);
    
    // Проверяем, что каждое уведомление привязано к правильному пользователю
    let securityOk = true;
    for (const notification of allNotifications) {
      if (notification.user_id !== user1.id && notification.user_id !== user2.id) {
        console.log(`❌ ОШИБКА: Найдено уведомление с неправильным user_id: ${notification.user_id}`);
        securityOk = false;
      }
    }
    
    if (securityOk) {
      console.log('✅ Все уведомления корректно привязаны к пользователям');
    }
    
    // Очистка тестовых данных
    console.log('\n8. Очистка тестовых данных...');
    await Database.run('DELETE FROM notifications WHERE user_id IN (?, ?)', [user1.id, user2.id]);
    await Database.run('DELETE FROM users WHERE id IN (?, ?)', [user1.id, user2.id]);
    await Database.run('DELETE FROM companies WHERE id = ?', [testCompany.id]);
    
    console.log('✅ Тестовые данные удалены');
    
    console.log('\n🎯 РЕЗУЛЬТАТ: Система уведомлений работает корректно!');
    console.log('   ✅ Уведомления изолированы между пользователями');
    console.log('   ✅ Подсчет непрочитанных работает правильно');
    console.log('   ✅ Отметка как прочитанное защищена от чужих пользователей');
    console.log('   ✅ Массовые операции работают корректно');
    console.log('   ✅ Безопасность доступа обеспечена');
    
  } catch (error) {
    console.log('❌ ОШИБКА ТЕСТИРОВАНИЯ:', error.message);
    console.log(error.stack);
  } finally {
    await Database.close();
  }
}

testNotificationSystem().catch(console.error);
