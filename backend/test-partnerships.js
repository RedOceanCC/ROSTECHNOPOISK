const Equipment = require('./models/Equipment');
const Company = require('./models/Company');
const User = require('./models/User');
const db = require('./models/Database');

async function testPartnerships() {
  await db.connect();
  
  console.log('🔍 ДЕТАЛЬНАЯ ПРОВЕРКА ПАРТНЕРСТВ И ФИЛЬТРАЦИИ');
  
  // Найдем менеджера для тестирования
  const managers = await db.all('SELECT u.*, c.name as company_name FROM users u JOIN companies c ON u.company_id = c.id WHERE u.role = "manager" LIMIT 1');
  
  if (managers.length === 0) {
    console.log('❌ Нет менеджеров в системе для тестирования');
    await db.close();
    return;
  }
  
  const manager = managers[0];
  console.log('\n👨‍💼 Тестируем менеджера:', manager.name, '(ID:', manager.id + ')');
  console.log('📢 Компания менеджера:', manager.company_name, '(ID:', manager.company_id + ')');
  
  console.log('\n📋 Партнерские компании для менеджера:');
  const partners = await Company.getPartnerCompaniesForManager(manager.company_id);
  partners.forEach(p => console.log('- ' + p.name + ' (ID: ' + p.id + ')'));
  
  if (partners.length === 0) {
    console.log('⚠️ У менеджера нет партнерских компаний!');
  }
  
  console.log('\n🔧 Владельцы в партнерских компаниях:');
  const owners = await db.all(`
    SELECT u.*, c.name as company_name 
    FROM users u 
    JOIN companies c ON u.company_id = c.id 
    JOIN company_partnerships cp ON c.id = cp.owner_company_id 
    WHERE cp.manager_company_id = ? AND u.role = 'owner' AND cp.status = 'active'
  `, [manager.company_id]);
  
  owners.forEach(o => console.log('- ' + o.name + ' (' + o.company_name + ')'));
  
  if (owners.length === 0) {
    console.log('⚠️ Нет владельцев в партнерских компаниях!');
  }
  
  console.log('\n🚜 Техника от партнерских владельцев:');
  const equipment = await Equipment.findAvailableForManagerAll(manager.id);
  console.log('Всего единиц:', equipment.length);
  
  if (equipment.length > 0) {
    equipment.slice(0, 5).forEach(e => 
      console.log('- ' + e.name + ' от ' + e.owner_name + ' (' + e.company_name + ')')
    );
    if (equipment.length > 5) {
      console.log('... и еще ' + (equipment.length - 5) + ' единиц');
    }
  } else {
    console.log('⚠️ Нет доступной техники от партнеров!');
  }
  
  console.log('\n📊 Доступные типы техники для менеджера:');
  const types = await Equipment.getAvailableTypesForManager(manager.id);
  console.log('Всего типов:', types.length);
  
  types.forEach(t => console.log('- ' + t.type + ' / ' + t.subtype + ' (' + t.count + ' ед.)'));
  
  console.log('\n🔍 Общая техника в системе (для сравнения):');
  const allEquipment = await Equipment.findAll();
  console.log('Всего единиц техники в системе:', allEquipment.length);
  
  console.log('\n✅ Проверка связей завершена!');
  await db.close();
}

testPartnerships().catch(console.error);
