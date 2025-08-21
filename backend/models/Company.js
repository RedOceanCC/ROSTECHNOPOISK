const database = require('./Database');

class Company {
  // Создание компании
  static async create(companyData) {
    const { name, description, contact_info } = companyData;
    
    const sql = `
      INSERT INTO companies (name, description, contact_info)
      VALUES (?, ?, ?)
    `;
    
    const result = await database.run(sql, [name, description, contact_info]);
    return this.findById(result.id);
  }

  // Поиск компании по ID
  static async findById(id) {
    const sql = 'SELECT * FROM companies WHERE id = ? AND (status = \'active\' OR status IS NULL)';
    return await database.get(sql, [id]);
  }

  // Получение всех компаний
  static async findAll() {
    console.log('🏢 Company.findAll() вызван');
    
    // Сначала проверим все компании без фильтра
    const checkSql = 'SELECT id, name, status FROM companies';
    const allCompanies = await database.all(checkSql);
    console.log('📊 Все компании в БД:', allCompanies);
    
    const sql = `
      SELECT c.*, 
             COUNT(u.id) as users_count
      FROM companies c
      LEFT JOIN users u ON c.id = u.company_id AND u.status = 'active'
      WHERE (c.status = 'active' OR c.status IS NULL)
      GROUP BY c.id
      ORDER BY c.name
    `;
    
    const result = await database.all(sql);
    console.log('✅ Компании после фильтрации:', result);
    
    return result;
  }

  // Обновление компании
  static async update(id, companyData) {
    const { name, description, contact_info, status } = companyData;
    
    const sql = `
      UPDATE companies 
      SET name = ?, description = ?, contact_info = ?, status = ?
      WHERE id = ?
    `;
    
    await database.run(sql, [name, description, contact_info, status, id]);
    return this.findById(id);
  }

  // Удаление компании (мягкое удаление)
  static async delete(id) {
    const sql = 'UPDATE companies SET status = \'inactive\' WHERE id = ?';
    const result = await database.run(sql, [id]);
    return result.changes > 0;
  }

  // Получение партнерств компании
  static async getPartnerships(companyId) {
    const sql = `
      SELECT cp.*, 
             oc.name as owner_company_name,
             mc.name as manager_company_name
      FROM company_partnerships cp
      JOIN companies oc ON cp.owner_company_id = oc.id
      JOIN companies mc ON cp.manager_company_id = mc.id
      WHERE (cp.owner_company_id = ? OR cp.manager_company_id = ?) 
        AND cp.status = 'active'
      ORDER BY oc.name, mc.name
    `;
    
    return await database.all(sql, [companyId, companyId]);
  }

  // Создание партнерства
  static async createPartnership(ownerCompanyId, managerCompanyId) {
    const sql = `
      INSERT INTO company_partnerships (owner_company_id, manager_company_id)
      VALUES (?, ?)
    `;
    
    try {
      const result = await database.run(sql, [ownerCompanyId, managerCompanyId]);
      return { id: result.id, success: true };
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        throw new Error('Партнерство уже существует');
      }
      throw error;
    }
  }

  // Удаление партнерства
  static async deletePartnership(id) {
    const sql = 'UPDATE company_partnerships SET status = \'inactive\' WHERE id = ?';
    const result = await database.run(sql, [id]);
    return result.changes > 0;
  }

  // Получение всех партнерств
  static async getAllPartnerships() {
    const sql = `
      SELECT cp.*, 
             oc.name as owner_company_name,
             mc.name as manager_company_name
      FROM company_partnerships cp
      JOIN companies oc ON cp.owner_company_id = oc.id
      JOIN companies mc ON cp.manager_company_id = mc.id
      WHERE cp.status = 'active'
      ORDER BY oc.name, mc.name
    `;
    
    return await database.all(sql);
  }

  // Проверка партнерства между компаниями
  static async checkPartnership(ownerCompanyId, managerCompanyId) {
    const sql = `
      SELECT id FROM company_partnerships 
      WHERE owner_company_id = ? AND manager_company_id = ? AND status = 'active'
    `;
    
    const partnership = await database.get(sql, [ownerCompanyId, managerCompanyId]);
    return !!partnership;
  }

  // Получение компаний-партнеров для менеджера
  static async getPartnerCompaniesForManager(managerCompanyId) {
    const sql = `
      SELECT c.* FROM companies c
      JOIN company_partnerships cp ON c.id = cp.owner_company_id
      WHERE cp.manager_company_id = ? AND cp.status = 'active' AND c.status = 'active'
      ORDER BY c.name
    `;
    
    return await database.all(sql, [managerCompanyId]);
  }

  // Получение компаний-партнеров для владельца
  static async getPartnerCompaniesForOwner(ownerCompanyId) {
    const sql = `
      SELECT c.* FROM companies c
      JOIN company_partnerships cp ON c.id = cp.manager_company_id
      WHERE cp.owner_company_id = ? AND cp.status = 'active' AND c.status = 'active'
      ORDER BY c.name
    `;
    
    return await database.all(sql, [ownerCompanyId]);
  }
}

module.exports = Company;
