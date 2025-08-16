const fs = require('fs');
const path = require('path');
const database = require('../models/Database');
const EquipmentCatalogImporter = require('../utils/csvImporter');
const logger = require('../utils/logger');

// Создание таблицы для отслеживания миграций
async function createMigrationsTable(database) {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      execution_time_ms INTEGER,
      environment VARCHAR(50) DEFAULT 'development'
    );
  `;
  
  await database.run(createTableSQL);
  logger.info('✅ Таблица schema_migrations готова');
}

// Получение списка выполненных миграций
async function getExecutedMigrations(database) {
  try {
    const migrations = await database.all('SELECT version FROM schema_migrations ORDER BY version');
    return migrations.map(m => m.version);
  } catch (error) {
    logger.warn('Таблица миграций не существует, создаем...');
    await createMigrationsTable(database);
    return [];
  }
}

// Запись выполненной миграции
async function recordMigration(database, version, executionTime) {
  const environment = process.env.NODE_ENV || 'local';
  await database.run(
    'INSERT INTO schema_migrations (version, execution_time_ms, environment) VALUES (?, ?, ?)',
    [version, executionTime, environment]
  );
}

async function runMigrations() {
  try {
    logger.info('🔄 Запуск системы миграций базы данных');
    
    await database.connect();
    
    // Создаем таблицу миграций если не существует
    await createMigrationsTable(database);
    
    // Получаем список уже выполненных миграций
    const executedMigrations = await getExecutedMigrations(database);
    logger.info(`📋 Выполнено миграций: ${executedMigrations.length}`);
    
    // 1. Выполняем SQL миграции
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    let appliedCount = 0;
    
    for (const file of migrationFiles) {
      const version = path.basename(file, '.sql');
      
      if (executedMigrations.includes(version)) {
        logger.info(`⏭️ Пропускаем миграцию: ${file} (уже выполнена)`);
        continue;
      }
      
      logger.info(`▶️ Выполнение миграции: ${file}`);
      const startTime = Date.now();
      
      const migrationPath = path.join(migrationsDir, file);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      try {
        // Разбиваем на отдельные команды
        const statements = migrationSQL
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        for (const statement of statements) {
          await database.run(statement);
        }
        
        const executionTime = Date.now() - startTime;
        await recordMigration(database, version, executionTime);
        
        logger.info(`✅ Миграция ${file} выполнена за ${executionTime}мс`);
        appliedCount++;
        
      } catch (error) {
        logger.error(`❌ Ошибка в миграции ${file}:`, error);
        throw error;
      }
    }
    
    if (appliedCount === 0) {
      logger.info('✨ Все миграции уже применены, база данных актуальна');
    } else {
      logger.info(`✅ Применено новых миграций: ${appliedCount}`);
    }
    
    // 2. Импортируем каталог техники
    logger.info('Импорт каталога техники из CSV');
    const importer = new EquipmentCatalogImporter(database);
    const csvPath = process.env.EQUIPMENT_CATALOG_PATH || path.join(process.cwd(), 'Special_Equipment_Catalog.csv');
    
    if (fs.existsSync(csvPath)) {
      const result = await importer.importFromCSV(csvPath);
      logger.info('Импорт каталога завершен', result);
    } else {
      logger.warn('CSV файл каталога не найден', { path: csvPath });
    }
    
    logger.info('Все миграции выполнены успешно');
    return true;
    
  } catch (error) {
    logger.error('Ошибка выполнения миграций', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

// Создание новой миграции
async function createMigration(name) {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
  const version = `${timestamp}_${name.toLowerCase().replace(/\s+/g, '_')}`;
  const filename = `${version}.sql`;
  const filepath = path.join(__dirname, 'migrations', filename);
  
  const template = `-- Миграция: ${name}
-- Дата: ${new Date().toISOString().slice(0, 10)}
-- Описание: 

-- Добавьте SQL команды ниже:

`;
  
  fs.writeFileSync(filepath, template);
  console.log(`✅ Создана новая миграция: ${filename}`);
  return filepath;
}

// Получение статуса миграций
async function getMigrationStatus() {
  try {
    await database.connect();
    
    await createMigrationsTable(database);
    
    const executedMigrations = await getExecutedMigrations(database);
    const migrationsDir = path.join(__dirname, 'migrations');
    const allMigrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .map(file => path.basename(file, '.sql'))
      .sort();
    
    console.log('\n📊 СТАТУС МИГРАЦИЙ:');
    console.log('==================');
    
    allMigrationFiles.forEach(version => {
      const status = executedMigrations.includes(version) ? '✅ Выполнена' : '⏳ Ожидает';
      console.log(`${status} ${version}`);
    });
    
    const pending = allMigrationFiles.filter(v => !executedMigrations.includes(v));
    console.log(`\n📈 Статистика: ${executedMigrations.length} выполнено, ${pending.length} ожидает`);
    
    await database.close();
    return {
      executed: executedMigrations,
      pending: pending,
      total: allMigrationFiles.length
    };
  } catch (error) {
    console.error('❌ Ошибка получения статуса:', error);
    throw error;
  }
}

// Запуск миграций если файл запущен напрямую
if (require.main === module) {
  require('dotenv').config({
    path: `./.env.${process.env.NODE_ENV || 'local'}`
  });
  
  const command = process.argv[2];
  
  switch (command) {
    case 'create':
      const migrationName = process.argv[3];
      if (!migrationName) {
        console.error('❌ Укажите название миграции: npm run migrate create "Add new column"');
        process.exit(1);
      }
      createMigration(migrationName)
        .then(() => process.exit(0))
        .catch(error => {
          console.error('❌ Ошибка создания миграции:', error);
          process.exit(1);
        });
      break;
      
    case 'status':
      getMigrationStatus()
        .then(() => process.exit(0))
        .catch(error => {
          console.error('❌ Ошибка:', error);
          process.exit(1);
        });
      break;
      
    default:
      runMigrations()
        .then(() => {
          console.log('✅ Миграции выполнены успешно');
          process.exit(0);
        })
        .catch((error) => {
          console.error('❌ Ошибка миграций:', error);
          process.exit(1);
        });
  }
}

module.exports = { 
  runMigrations, 
  createMigration, 
  getMigrationStatus,
  createMigrationsTable 
};
