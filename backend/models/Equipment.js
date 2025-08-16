const database = require('./Database');

class Equipment {
  // Создание техники
  static async create(equipmentData) {
    const {
      name, type, subtype, owner_id, phone, telegram_id, license_plate,
      is_off_road, additional_equipment, description, hourly_rate, daily_rate, location
    } = equipmentData;
    
    const sql = `
      INSERT INTO equipment (
        name, type, subtype, owner_id, phone, telegram_id, license_plate,
        is_off_road, additional_equipment, description, hourly_rate, daily_rate, location
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await database.run(sql, [
      name, type, subtype, owner_id, phone, telegram_id, license_plate,
      is_off_road, additional_equipment, description, hourly_rate, daily_rate, location
    ]);
    
    return this.findById(result.id);
  }

  // Поиск техники по ID
  static async findById(id) {
    const sql = `
      SELECT e.*, u.name as owner_name, c.name as company_name
      FROM equipment e
      JOIN users u ON e.owner_id = u.id
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE e.id = ?
    `;
    
    return await database.get(sql, [id]);
  }

  // Получение техники владельца
  static async findByOwnerId(ownerId) {
    const sql = `
      SELECT e.*, u.name as owner_name, c.name as company_name
      FROM equipment e
      JOIN users u ON e.owner_id = u.id
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE e.owner_id = ?
      ORDER BY e.created_at DESC
    `;
    
    return await database.all(sql, [ownerId]);
  }

  // Получение всей техники
  static async findAll() {
    const sql = `
      SELECT e.*, u.name as owner_name, c.name as company_name
      FROM equipment e
      JOIN users u ON e.owner_id = u.id
      LEFT JOIN companies c ON u.company_id = c.id
      ORDER BY e.created_at DESC
    `;
    
    return await database.all(sql);
  }

  // Поиск техники по типу и подтипу
  static async findByType(type, subtype = null) {
    let sql = `
      SELECT e.*, u.name as owner_name, c.name as company_name
      FROM equipment e
      JOIN users u ON e.owner_id = u.id
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE e.type = ? AND e.status = 'available'
    `;
    
    const params = [type];
    
    if (subtype) {
      sql += ' AND e.subtype = ?';
      params.push(subtype);
    }
    
    sql += ' ORDER BY e.created_at DESC';
    
    return await database.all(sql, params);
  }

  // Поиск доступной техники для менеджера (с учетом партнерств)
  static async findAvailableForManager(managerId, type, subtype) {
    const sql = `
      SELECT e.*, u.name as owner_name, c.name as company_name
      FROM equipment e
      JOIN users u ON e.owner_id = u.id
      JOIN companies c ON u.company_id = c.id
      JOIN company_partnerships cp ON c.id = cp.owner_company_id
      JOIN users m ON m.company_id = cp.manager_company_id
      WHERE m.id = ? 
        AND e.type = ? 
        AND e.subtype = ?
        AND e.status = 'available'
        AND u.status = 'active'
        AND c.status = 'active'
        AND cp.status = 'active'
      ORDER BY e.hourly_rate ASC
    `;
    
    return await database.all(sql, [managerId, type, subtype]);
  }

  // Поиск всей доступной техники для менеджера (без фильтрации по типу)
  static async findAvailableForManagerAll(managerId) {
    const sql = `
      SELECT e.*, u.name as owner_name, c.name as company_name,
             u.phone as owner_phone, u.telegram_id as owner_telegram_id
      FROM equipment e
      JOIN users u ON e.owner_id = u.id
      JOIN companies c ON u.company_id = c.id
      JOIN company_partnerships cp ON c.id = cp.owner_company_id
      JOIN users m ON m.company_id = cp.manager_company_id
      WHERE m.id = ? 
        AND e.status = 'available'
        AND u.role = 'owner'
        AND u.status = 'active'
        AND c.status = 'active'
        AND cp.status = 'active'
      ORDER BY e.type, e.subtype, e.hourly_rate ASC
    `;
    
    return await database.all(sql, [managerId]);
  }

  // Получение типов техники доступных для менеджера
  static async getAvailableTypesForManager(managerId) {
    const sql = `
      SELECT DISTINCT e.type, e.subtype, COUNT(*) as count
      FROM equipment e
      JOIN users u ON e.owner_id = u.id
      JOIN companies c ON u.company_id = c.id
      JOIN company_partnerships cp ON c.id = cp.owner_company_id
      JOIN users m ON m.company_id = cp.manager_company_id
      WHERE m.id = ? 
        AND e.status = 'available'
        AND u.role = 'owner'
        AND u.status = 'active'
        AND c.status = 'active'
        AND cp.status = 'active'
      GROUP BY e.type, e.subtype
      ORDER BY e.type, e.subtype
    `;
    
    return await database.all(sql, [managerId]);
  }

  // Получение владельцев техники для аукциона
  static async findOwnersForAuction(managerId, equipmentType, equipmentSubtype) {
    const sql = `
      SELECT DISTINCT u.id, u.name, u.phone, u.telegram_id, c.name as company_name,
             e.id as equipment_id, e.name as equipment_name
      FROM users u
      JOIN companies c ON u.company_id = c.id
      JOIN company_partnerships cp ON c.id = cp.owner_company_id
      JOIN users m ON m.company_id = cp.manager_company_id
      JOIN equipment e ON u.id = e.owner_id
      WHERE m.id = ? 
        AND e.type = ? 
        AND e.subtype = ?
        AND e.status = 'available'
        AND u.role = 'owner'
        AND u.status = 'active'
        AND c.status = 'active'
        AND cp.status = 'active'
      ORDER BY u.name
    `;
    
    return await database.all(sql, [managerId, equipmentType, equipmentSubtype]);
  }

  // Обновление техники
  static async update(id, equipmentData) {
    const {
      name, type, subtype, phone, telegram_id, license_plate,
      is_off_road, additional_equipment, description, hourly_rate, daily_rate, location, status
    } = equipmentData;
    
    const sql = `
      UPDATE equipment 
      SET name = ?, type = ?, subtype = ?, phone = ?, telegram_id = ?, license_plate = ?,
          is_off_road = ?, additional_equipment = ?, description = ?, 
          hourly_rate = ?, daily_rate = ?, location = ?, status = ?
      WHERE id = ?
    `;
    
    await database.run(sql, [
      name, type, subtype, phone, telegram_id, license_plate,
      is_off_road, additional_equipment, description, hourly_rate, daily_rate, location, status, id
    ]);
    
    return this.findById(id);
  }

  // Обновление статуса техники
  static async updateStatus(id, status) {
    const sql = 'UPDATE equipment SET status = ? WHERE id = ?';
    const result = await database.run(sql, [status, id]);
    return result.changes > 0;
  }

  // Удаление техники
  static async delete(id) {
    const sql = 'DELETE FROM equipment WHERE id = ?';
    const result = await database.run(sql, [id]);
    return result.changes > 0;
  }

  // Получение статистики по технике
  static async getStats() {
    const sql = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'available' THEN 1 END) as available,
        COUNT(CASE WHEN status = 'busy' THEN 1 END) as busy,
        COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance,
        COUNT(DISTINCT type) as types_count,
        COUNT(DISTINCT owner_id) as owners_count
      FROM equipment
    `;
    
    return await database.get(sql);
  }

  // Получение популярных типов техники
  static async getPopularTypes() {
    const sql = `
      SELECT type, subtype, COUNT(*) as count
      FROM equipment
      GROUP BY type, subtype
      ORDER BY count DESC
      LIMIT 10
    `;
    
    return await database.all(sql);
  }
}

module.exports = Equipment;
