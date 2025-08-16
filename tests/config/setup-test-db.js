// Настройка тестовой базы данных
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const TEST_DB_PATH = path.join(__dirname, '../test.db');

// Удаляем старую тестовую БД если существует
if (fs.existsSync(TEST_DB_PATH)) {
  fs.unlinkSync(TEST_DB_PATH);
}

// Создаем новую тестовую БД
const db = new sqlite3.Database(TEST_DB_PATH);

// Читаем схему из основного проекта
const schemaPath = path.join(__dirname, '../../backend/database/schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

// Создаем таблицы
db.exec(schema, (err) => {
  if (err) {
    console.error('Ошибка создания тестовой БД:', err);
    process.exit(1);
  }
  
  console.log('✅ Тестовая база данных создана успешно');
  
  // Вставляем тестовые данные
  insertTestData(db);
});

function insertTestData(db) {
  const testData = [
    // Компании
    `INSERT INTO companies (id, name, description, status) VALUES 
     (1, 'ТестКомпания А', 'Компания для тестов А', 'active'),
     (2, 'ТестКомпания Б', 'Компания для тестов Б', 'active'),
     (3, 'ТестКомпания В', 'Компания для тестов В', 'active')`,
    
    // Пользователи
    `INSERT INTO users (id, name, phone, role, company_id, password_hash) VALUES 
     (1, 'Тест Админ', '+71234567890', 'admin', 1, '$2b$10$TEST_HASH_ADMIN'),
     (2, 'Тест Менеджер', '+71234567891', 'manager', 1, '$2b$10$TEST_HASH_MANAGER'),
     (3, 'Тест Владелец', '+71234567892', 'owner', 2, '$2b$10$TEST_HASH_OWNER'),
     (4, 'Тест Менеджер 2', '+71234567893', 'manager', 2, '$2b$10$TEST_HASH_MANAGER2'),
     (5, 'Тест Владелец 2', '+71234567894', 'owner', 3, '$2b$10$TEST_HASH_OWNER2')`,
    
    // Партнерства
    `INSERT INTO company_partnerships (owner_company_id, manager_company_id, status) VALUES 
     (2, 1, 'active'),
     (3, 1, 'active'),
     (3, 2, 'active')`,
    
    // Типы техники
    `INSERT INTO equipment_types (type, subtype, category) VALUES 
     ('Экскаваторы', 'Гусеничный экскаватор 20-25 тонн', 'earthmoving'),
     ('Экскаваторы', 'Колесный экскаватор 15-20 тонн', 'earthmoving'),
     ('Бульдозеры', 'Бульдозер средний', 'earthmoving')`,
    
    // Техника
    `INSERT INTO equipment (id, owner_id, name, type, subtype, status, location) VALUES 
     (1, 3, 'Экскаватор JCB-1', 'Экскаваторы', 'Гусеничный экскаватор 20-25 тонн', 'available', 'Москва'),
     (2, 3, 'Экскаватор CAT-1', 'Экскаваторы', 'Колесный экскаватор 15-20 тонн', 'available', 'Москва'),
     (3, 5, 'Бульдозер KOMATSU-1', 'Бульдозеры', 'Бульдозер средний', 'available', 'СПб')`,
    
    // Заявки
    `INSERT INTO rental_requests (id, manager_id, equipment_type, equipment_subtype, start_date, end_date, location, work_description, status, auction_deadline) VALUES 
     (1, 2, 'Экскаваторы', 'Гусеничный экскаватор 20-25 тонн', '2024-01-15', '2024-01-20', 'Москва', 'Земляные работы', 'auction_active', '2024-01-14 18:00:00'),
     (2, 4, 'Бульдозеры', 'Бульдозер средний', '2024-01-16', '2024-01-18', 'СПб', 'Планировка участка', 'auction_closed', '2024-01-13 18:00:00')`,
    
    // Ставки
    `INSERT INTO rental_bids (id, request_id, owner_id, equipment_id, hourly_rate, daily_rate, total_price, status) VALUES 
     (1, 1, 3, 1, 5000, 40000, 200000, 'pending'),
     (2, 2, 5, 3, 4000, 32000, 96000, 'accepted')`
  ];
  
  // Выполняем вставки последовательно
  let completed = 0;
  testData.forEach((sql, index) => {
    db.run(sql, (err) => {
      if (err) {
        console.error(`Ошибка вставки данных ${index + 1}:`, err);
      } else {
        completed++;
        if (completed === testData.length) {
          console.log('✅ Тестовые данные вставлены успешно');
          db.close();
        }
      }
    });
  });
}

module.exports = { TEST_DB_PATH };
