// E2E тесты полного аукционного процесса
const puppeteer = require('puppeteer');
const path = require('path');
const { TestDatabase } = require('../config/test-helpers');

// Конфигурация для E2E тестов
const E2E_CONFIG = {
  baseUrl: 'http://localhost:3000',
  timeout: 30000,
  viewport: { width: 1920, height: 1080 }
};

describe('Auction Flow E2E', () => {
  let browser;
  let page;
  let testDb;

  beforeAll(async () => {
    // Запускаем тестовую БД
    testDb = new TestDatabase();
    await testDb.connect();
    
    // Запускаем браузер
    browser = await puppeteer.launch({
      headless: process.env.CI === 'true',
      slowMo: 50,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    page = await browser.newPage();
    await page.setViewport(E2E_CONFIG.viewport);
    
    // Устанавливаем таймауты
    page.setDefaultTimeout(E2E_CONFIG.timeout);
    
    // Включаем логирование консоли
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text());
      }
    });
  });

  afterAll(async () => {
    await testDb.close();
    await browser.close();
  });

  beforeEach(async () => {
    // Очищаем БД перед каждым тестом
    await testDb.clearAll();
    await testDb.resetAutoIncrement();
    
    // Вставляем базовые тестовые данные
    await setupTestData();
  });

  async function setupTestData() {
    // Создаем компании
    await testDb.run(`
      INSERT INTO companies (id, name, description, status) VALUES 
      (1, 'ТехКомпания А', 'Компания владельцев техники', 'active'),
      (2, 'СтройКомпания Б', 'Компания менеджеров проектов', 'active')
    `);
    
    // Создаем пользователей
    await testDb.run(`
      INSERT INTO users (id, name, phone, role, company_id, password_hash) VALUES 
      (1, 'Админ Тестов', '+71234567890', 'admin', 1, '$2b$10$ADMIN_HASH'),
      (2, 'Менеджер Проектов', '+71234567891', 'manager', 2, '$2b$10$MANAGER_HASH'),
      (3, 'Владелец Техники', '+71234567892', 'owner', 1, '$2b$10$OWNER_HASH')
    `);
    
    // Создаем партнерство
    await testDb.run(`
      INSERT INTO company_partnerships (owner_company_id, manager_company_id, status) VALUES 
      (1, 2, 'active')
    `);
    
    // Создаем типы техники
    await testDb.run(`
      INSERT INTO equipment_types (type, subtype, category) VALUES 
      ('Экскаваторы', 'Гусеничный экскаватор 20-25 тонн', 'earthmoving')
    `);
    
    // Создаем технику
    await testDb.run(`
      INSERT INTO equipment (id, owner_id, name, type, subtype, status, location) VALUES 
      (1, 3, 'Экскаватор JCB JS220', 'Экскаваторы', 'Гусеничный экскаватор 20-25 тонн', 'available', 'Москва')
    `);
  }

  async function loginAs(role) {
    const credentials = {
      admin: { phone: '+71234567890', password: 'admin123' },
      manager: { phone: '+71234567891', password: 'manager123' },
      owner: { phone: '+71234567892', password: 'owner123' }
    };

    const creds = credentials[role];
    
    await page.goto(`${E2E_CONFIG.baseUrl}/index.html`);
    await page.waitForSelector('#login-form');
    
    await page.type('#phone', creds.phone);
    await page.type('#password', creds.password);
    await page.click('button[type="submit"]');
    
    // Ждем перехода в дашборд
    await page.waitForSelector('.dashboard-layout', { timeout: 5000 });
  }

  describe('Полный аукционный сценарий', () => {
    test('должен выполнить полный цикл: создание заявки → подача ставки → завершение аукциона', async () => {
      // 1. МЕНЕДЖЕР СОЗДАЕТ ЗАЯВКУ
      await loginAs('manager');
      
      // Переходим на вкладку создания заявки
      await page.click('[data-tab="create-order"]');
      await page.waitForSelector('#create-order-form');
      
      // Заполняем форму заявки
      await page.select('#order-type', 'Экскаваторы');
      await page.waitForTimeout(500); // Ждем загрузки подтипов
      await page.select('#order-subtype', 'Гусеничный экскаватор 20-25 тонн');
      
      // Устанавливаем даты
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startDate = tomorrow.toISOString().split('T')[0];
      
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 3);
      const endDate = dayAfter.toISOString().split('T')[0];
      
      await page.type('#order-start-date', startDate);
      await page.type('#order-end-date', endDate);
      await page.type('#order-location', 'Москва, Тестовая стройка');
      await page.type('#order-description', 'Земляные работы для фундамента');
      
      // Отправляем заявку
      await page.click('#create-order-form button[type="submit"]');
      
      // Ждем уведомления об успешном создании
      await page.waitForSelector('.toast', { timeout: 5000 });
      const toastText = await page.$eval('.toast', el => el.textContent);
      expect(toastText).toContain('успешно создана');
      
      // Проверяем что заявка появилась в списке
      await page.click('[data-tab="my-orders"]');
      await page.waitForSelector('.order-card');
      
      const orderCard = await page.$eval('.order-card', el => el.textContent);
      expect(orderCard).toContain('Экскаваторы');
      expect(orderCard).toContain('Аукцион активен');
      
      // 2. ВЛАДЕЛЕЦ ВИДИТ И ОТВЕЧАЕТ НА ЗАЯВКУ
      await loginAs('owner');
      
      // Переходим на вкладку заявок
      await page.click('[data-tab="orders"]');
      await page.waitForSelector('#owner-orders-grid');
      
      // Ждем загрузки заявок
      await page.waitForSelector('.order-card', { timeout: 10000 });
      
      // Проверяем что наша заявка видна
      const ownerOrderCard = await page.$eval('.order-card', el => el.textContent);
      expect(ownerOrderCard).toContain('Земляные работы');
      
      // Подаем ставку
      await page.click('.order-card .btn');
      await page.waitForSelector('#respond-order-modal:not(.hidden)');
      
      // Выбираем технику
      await page.select('#bid-equipment', '1');
      
      // Заполняем ставку
      await page.type('#bid-hourly-rate', '5000');
      await page.type('#bid-daily-rate', '40000');
      await page.type('#bid-total-price', '120000');
      await page.type('#bid-comment', 'Готовы выполнить работы качественно и в срок');
      
      // Подаем ставку
      await page.click('#respond-order-form button[type="submit"]');
      
      // Ждем подтверждения
      await page.waitForSelector('.toast');
      const bidToastText = await page.$eval('.toast', el => el.textContent);
      expect(bidToastText).toContain('подана успешно');
      
      // Проверяем что статус заявки изменился
      await page.waitForTimeout(1000);
      const updatedCard = await page.$eval('.order-card', el => el.textContent);
      expect(updatedCard).toContain('Ставка подана');
      
      // 3. МЕНЕДЖЕР ВИДИТ СТАВКУ
      await loginAs('manager');
      
      await page.click('[data-tab="my-orders"]');
      await page.waitForSelector('.order-card');
      
      // Проверяем счетчик ставок
      await page.waitForSelector('.bids-counter');
      const bidsCounter = await page.$eval('.bids-counter', el => el.textContent);
      expect(bidsCounter).toContain('1 ставка');
      
      // 4. ЭМУЛИРУЕМ ЗАВЕРШЕНИЕ АУКЦИОНА
      // Обновляем статус заявки в БД напрямую
      const requestId = await testDb.get('SELECT id FROM rental_requests ORDER BY id DESC LIMIT 1');
      const bidId = await testDb.get('SELECT id FROM rental_bids ORDER BY id DESC LIMIT 1');
      
      await testDb.run(`
        UPDATE rental_requests 
        SET status = 'auction_closed', winning_bid_id = ? 
        WHERE id = ?
      `, [bidId.id, requestId.id]);
      
      // Обновляем страницу и проверяем результат
      await page.reload();
      await page.waitForSelector('.order-card');
      
      const finalCard = await page.$eval('.order-card', el => el.textContent);
      expect(finalCard).toContain('Аукцион завершен');
      expect(finalCard).toContain('Победитель аукциона');
      expect(finalCard).toContain('Владелец Техники');
    }, 60000); // Увеличиваем таймаут для E2E теста
  });

  describe('Система уведомлений E2E', () => {
    test('должен показывать уведомления в реальном времени', async () => {
      await loginAs('manager');
      
      // Проверяем изначальное состояние счетчика
      const initialBadge = await page.$eval('#manager-notifications-count', el => el.textContent);
      expect(initialBadge).toBe('0');
      
      // Эмулируем добавление уведомления через JS
      await page.evaluate(() => {
        if (window.notificationCenter) {
          window.notificationCenter.addNotification({
            title: 'Тестовое уведомление',
            message: 'Это тестовое сообщение для E2E теста',
            type: 'system'
          });
        }
      });
      
      // Проверяем что счетчик обновился
      await page.waitForFunction(
        () => document.getElementById('manager-notifications-count').textContent === '1',
        { timeout: 5000 }
      );
      
      // Проверяем что бейдж получил класс активности
      const badgeClass = await page.$eval('#manager-notifications-count', el => el.className);
      expect(badgeClass).toContain('has-notifications');
      
      // Открываем центр уведомлений
      await page.click('#manager-notifications-btn');
      await page.waitForSelector('#notifications-modal:not(.hidden)');
      
      // Проверяем содержимое уведомления
      const notificationText = await page.$eval('.notification-item', el => el.textContent);
      expect(notificationText).toContain('Тестовое уведомление');
      expect(notificationText).toContain('Это тестовое сообщение');
      
      // Отмечаем как прочитанное
      await page.click('.notification-item');
      
      // Проверяем что счетчик обнулился
      await page.waitForFunction(
        () => document.getElementById('manager-notifications-count').textContent === '0',
        { timeout: 5000 }
      );
    });
  });

  describe('Таймеры аукционов E2E', () => {
    test('должен показывать живые таймеры обратного отсчета', async () => {
      await loginAs('manager');
      
      // Создаем заявку с коротким дедлайном
      await page.click('[data-tab="create-order"]');
      await page.waitForSelector('#create-order-form');
      
      await page.select('#order-type', 'Экскаваторы');
      await page.waitForTimeout(500);
      await page.select('#order-subtype', 'Гусеничный экскаватор 20-25 тонн');
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startDate = tomorrow.toISOString().split('T')[0];
      const endDate = tomorrow.toISOString().split('T')[0];
      
      await page.type('#order-start-date', startDate);
      await page.type('#order-end-date', endDate);
      await page.type('#order-location', 'Тест локация');
      await page.type('#order-description', 'Тест описание');
      
      await page.click('#create-order-form button[type="submit"]');
      await page.waitForSelector('.toast');
      
      // Переходим к списку заявок
      await page.click('[data-tab="my-orders"]');
      await page.waitForSelector('.order-card');
      
      // Ищем таймер в карточке заявки
      await page.waitForSelector('[id^="manager-timer-"]', { timeout: 10000 });
      
      // Проверяем что таймер отображается
      const timerText = await page.$eval('[id^="manager-timer-"]', el => el.textContent);
      expect(timerText).toMatch(/\d+ч \d+м \d+с/); // Формат "XчXмXс"
      
      // Ждем секунду и проверяем что таймер обновляется
      await page.waitForTimeout(1000);
      const updatedTimerText = await page.$eval('[id^="manager-timer-"]', el => el.textContent);
      
      // Время должно измениться (уменьшиться)
      expect(updatedTimerText).not.toBe(timerText);
    });
  });

  describe('Адаптивность и мобильная версия', () => {
    test('должен корректно работать на мобильных устройствах', async () => {
      // Переключаемся на мобильное разрешение
      await page.setViewport({ width: 375, height: 667 });
      
      await loginAs('manager');
      
      // Проверяем что элементы адаптированы
      const sidebarWidth = await page.$eval('.sidebar', el => 
        window.getComputedStyle(el).width
      );
      
      // На мобильных устройствах сайдбар должен быть скрыт или узкий
      expect(parseInt(sidebarWidth)).toBeLessThan(200);
      
      // Проверяем что формы адаптированы
      await page.click('[data-tab="create-order"]');
      await page.waitForSelector('#create-order-form');
      
      const formWidth = await page.$eval('#create-order-form', el => 
        window.getComputedStyle(el).width
      );
      
      // Форма должна занимать почти всю ширину экрана
      expect(parseInt(formWidth)).toBeGreaterThan(300);
    });
  });

  describe('Производительность', () => {
    test('должен загружаться быстро', async () => {
      const startTime = Date.now();
      
      await page.goto(`${E2E_CONFIG.baseUrl}/index.html`);
      await page.waitForSelector('#login-form');
      
      const loadTime = Date.now() - startTime;
      
      // Страница должна загружаться менее чем за 3 секунды
      expect(loadTime).toBeLessThan(3000);
    });

    test('должен эффективно обрабатывать множественные уведомления', async () => {
      await loginAs('manager');
      
      const startTime = performance.now();
      
      // Добавляем много уведомлений
      await page.evaluate(() => {
        for (let i = 0; i < 100; i++) {
          if (window.notificationCenter) {
            window.notificationCenter.addNotification({
              title: `Уведомление ${i}`,
              message: `Сообщение номер ${i}`,
              type: 'system'
            });
          }
        }
      });
      
      const processingTime = performance.now() - startTime;
      
      // Обработка 100 уведомлений должна занимать менее 100мс
      expect(processingTime).toBeLessThan(100);
      
      // Проверяем что счетчик правильно обновился
      await page.waitForFunction(
        () => document.getElementById('manager-notifications-count').textContent === '100'
      );
    });
  });

  describe('Обработка ошибок E2E', () => {
    test('должен корректно обрабатывать сетевые ошибки', async () => {
      await loginAs('manager');
      
      // Эмулируем отключение сети
      await page.setOfflineMode(true);
      
      // Пытаемся создать заявку
      await page.click('[data-tab="create-order"]');
      await page.waitForSelector('#create-order-form');
      
      await page.select('#order-type', 'Экскаваторы');
      await page.type('#order-location', 'Тест');
      await page.type('#order-description', 'Тест');
      
      await page.click('#create-order-form button[type="submit"]');
      
      // Должно появиться сообщение об ошибке
      await page.waitForSelector('.toast', { timeout: 10000 });
      const errorToast = await page.$eval('.toast', el => el.textContent);
      expect(errorToast).toContain('Ошибка');
      
      // Включаем сеть обратно
      await page.setOfflineMode(false);
    });

    test('должен обрабатывать некорректные данные форм', async () => {
      await loginAs('manager');
      
      await page.click('[data-tab="create-order"]');
      await page.waitForSelector('#create-order-form');
      
      // Пытаемся отправить пустую форму
      await page.click('#create-order-form button[type="submit"]');
      
      // Должна появиться валидационная ошибка
      const validationError = await page.$eval(':invalid', el => el.validationMessage);
      expect(validationError).toBeTruthy();
    });
  });
});
