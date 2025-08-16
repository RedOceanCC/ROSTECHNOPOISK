const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'rostechnopolsk.db');

// Создание и инициализация базы данных
async function initDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Ошибка подключения к базе данных:', err.message);
        reject(err);
        return;
      }
      console.log('✅ Подключение к SQLite базе данных установлено');
    });

    // Читаем и выполняем SQL схему
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    db.exec(schema, async (err) => {
      if (err) {
        console.error('Ошибка создания схемы:', err.message);
        reject(err);
        return;
      }
      console.log('✅ Схема базы данных создана');

      try {
        await insertDemoData(db);
        console.log('✅ Демо-данные добавлены');
        
        try {
          // Запускаем миграции в том же соединении
          console.log('🔄 Создание таблицы типов техники...');
          await createEquipmentTypesTable(db);
          console.log('✅ Таблица типов техники создана');
          
          console.log('🔄 Импорт каталога техники...');
          await importEquipmentCatalog(db);
          console.log('✅ Каталог техники импортирован');
          
        } catch (migrationError) {
          console.warn('⚠️ Ошибка миграций (возможно уже выполнены):', migrationError.message);
        }
        
        db.close((err) => {
          if (err) {
            console.error('Ошибка закрытия базы данных:', err.message);
            reject(err);
          } else {
            console.log('✅ База данных инициализирована успешно');
            resolve();
          }
        });
      } catch (error) {
        console.error('Ошибка добавления демо-данных:', error);
        reject(error);
      }
    });
  });
}

// Добавление демо-данных
async function insertDemoData(db) {
  return new Promise(async (resolve, reject) => {
    try {
      // Хешируем пароли
      const adminPassword = await bcrypt.hash('admin123', 10);
      const ownerPassword = await bcrypt.hash('owner123', 10);
      const managerPassword = await bcrypt.hash('manager123', 10);

      // Добавляем компании
      const companies = [
        { name: 'ТехноСтрой ООО', description: 'Строительная компания с собственным парком техники', contact_info: 'info@technostroy.ru, +7(495)123-45-67' },
        { name: 'СтройМастер', description: 'Генподрядчик по промышленному строительству', contact_info: 'orders@stroymaster.ru, +7(495)987-65-43' },
        { name: 'МегаСтрой Холдинг', description: 'Крупная строительная компания', contact_info: 'info@megastroy.ru, +7(495)555-33-22' },
        { name: 'Техника-Сервис', description: 'Аренда и обслуживание спецтехники', contact_info: 'rent@techservice.ru, +7(495)777-88-99' }
      ];

      for (const company of companies) {
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT OR IGNORE INTO companies (name, description, contact_info) VALUES (?, ?, ?)',
            [company.name, company.description, company.contact_info],
            function(err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });
      }

      // Добавляем пользователей
      const users = [
        { password: adminPassword, role: 'admin', name: 'Системный администратор', phone: '+7(495)000-00-00', company_id: null },
        { password: ownerPassword, role: 'owner', name: 'Иванов Иван Иванович', phone: '+7(999)123-45-67', company_id: 1 },
        { password: ownerPassword, role: 'owner', name: 'Петров Петр Петрович', phone: '+7(999)234-56-78', company_id: 4 },
        { password: managerPassword, role: 'manager', name: 'Сидоров Сидор Сидорович', phone: '+7(999)987-65-43', company_id: 2 },
        { password: managerPassword, role: 'manager', name: 'Козлов Андрей Викторович', phone: '+7(999)876-54-32', company_id: 3 }
      ];

      for (const user of users) {
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT OR IGNORE INTO users (password, role, name, phone, company_id) VALUES (?, ?, ?, ?, ?)',
            [user.password, user.role, user.name, user.phone, user.company_id],
            function(err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });
      }

      // Добавляем партнерства между компаниями
      const partnerships = [
        { owner_company_id: 1, manager_company_id: 2 }, // ТехноСтрой <-> СтройМастер
        { owner_company_id: 1, manager_company_id: 3 }, // ТехноСтрой <-> МегаСтрой
        { owner_company_id: 4, manager_company_id: 2 }, // Техника-Сервис <-> СтройМастер
        { owner_company_id: 4, manager_company_id: 3 }  // Техника-Сервис <-> МегаСтрой
      ];

      for (const partnership of partnerships) {
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT OR IGNORE INTO company_partnerships (owner_company_id, manager_company_id) VALUES (?, ?)',
            [partnership.owner_company_id, partnership.manager_company_id],
            function(err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });
      }

      // Добавляем технику
      const equipment = [
        {
          name: 'Экскаватор Caterpillar 320D',
          type: 'Экскаватор (гусеничный)',
          subtype: 'Средний (20 т)',
          owner_id: 2,
          phone: '+7(999)123-45-67',
          is_off_road: true,
          additional_equipment: 'Гидромолот, быстросъёмное соединение, GPS',
          description: 'Надежный экскаватор в отличном состоянии',
          hourly_rate: 2500.00,
          daily_rate: 18000.00,
          location: 'Москва'
        },
        {
          name: 'Автокран Liebherr 50т',
          type: 'Автокран (колёсный)',
          subtype: '50 т',
          owner_id: 2,
          phone: '+7(999)123-45-67',
          is_off_road: false,
          additional_equipment: 'Гусёк, противовесы, система ОНК',
          description: 'Мощный автокран для тяжелых работ',
          hourly_rate: 3500.00,
          daily_rate: 25000.00,
          location: 'Москва'
        },
        {
          name: 'Самосвал КАМАЗ 6520',
          type: 'Самосвал',
          subtype: '3-осный (6x4)',
          owner_id: 3,
          phone: '+7(999)234-56-78',
          is_off_road: false,
          additional_equipment: 'Подогрев кузова, GPS, телематика',
          description: 'Надежный самосвал для перевозки сыпучих материалов',
          hourly_rate: 1800.00,
          daily_rate: 12000.00,
          location: 'Московская область'
        }
      ];

      for (const eq of equipment) {
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT OR IGNORE INTO equipment (name, type, subtype, owner_id, phone, is_off_road, 
             additional_equipment, description, hourly_rate, daily_rate, location) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [eq.name, eq.type, eq.subtype, eq.owner_id, eq.phone, eq.is_off_road,
             eq.additional_equipment, eq.description, eq.hourly_rate, eq.daily_rate, eq.location],
            function(err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });
      }

      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

// Запуск инициализации если файл запущен напрямую
if (require.main === module) {
  require('dotenv').config({ path: './config.env' });
  initDatabase()
    .then(() => {
      console.log('🎉 Инициализация завершена успешно!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Ошибка инициализации:', error);
      process.exit(1);
    });
}

// Создание таблицы типов техники
async function createEquipmentTypesTable(db) {
  return new Promise((resolve, reject) => {
    const sql = `
      CREATE TABLE IF NOT EXISTS equipment_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type VARCHAR(100) NOT NULL,
        subtype VARCHAR(100) NOT NULL,
        characteristics TEXT,
        is_off_road BOOLEAN DEFAULT 0,
        additional_options TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(type, subtype)
      );
      
      CREATE INDEX IF NOT EXISTS idx_equipment_types_type ON equipment_types(type);
      CREATE INDEX IF NOT EXISTS idx_equipment_types_subtype ON equipment_types(subtype);
      CREATE INDEX IF NOT EXISTS idx_equipment_types_off_road ON equipment_types(is_off_road);
    `;
    
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Импорт каталога техники из CSV
async function importEquipmentCatalog(db) {
  const csvPath = process.env.EQUIPMENT_CATALOG_PATH || path.join(process.cwd(), 'Special_Equipment_Catalog.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.log('⚠️ CSV файл каталога не найден, пропускаем импорт');
    return;
  }
  
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n');
  
  // Пропускаем заголовок и служебные строки
  const dataLines = lines.slice(2, -2); // Убираем ```csv и ```
  
  let imported = 0;
  
  for (const line of dataLines) {
    if (!line.trim()) continue;
    
    try {
      const data = parseCSVLine(line);
      if (data) {
        await insertEquipmentType(db, data);
        imported++;
      }
    } catch (error) {
      console.warn('Ошибка импорта строки:', line.substring(0, 50), error.message);
    }
  }
  
  console.log(`📊 Импортировано типов техники: ${imported}`);
}

// Парсинг строки CSV
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  
  if (fields.length < 5) {
    return null;
  }
  
  return {
    type: fields[0],
    subtype: fields[1],
    characteristics: fields[2],
    is_off_road: fields[3].toLowerCase().trim() === 'да',
    additional_options: fields[4]
  };
}

// Вставка типа техники
async function insertEquipmentType(db, data) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT OR IGNORE INTO equipment_types 
      (type, subtype, characteristics, is_off_road, additional_options)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    db.run(sql, [
      data.type,
      data.subtype,
      data.characteristics,
      data.is_off_road ? 1 : 0,
      data.additional_options
    ], function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

module.exports = { initDatabase };
