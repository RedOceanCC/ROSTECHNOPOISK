const database = require('./Database');
const { ValidationError, BusinessLogicError, NotFoundError } = require('../utils/errors');

class RentalBid {
  // Создание ставки на аукцион
  static async create(bidData) {
    const {
      request_id, owner_id, equipment_id, hourly_rate, daily_rate, total_price, comment
    } = bidData;
    
    // Проверяем, что аукцион еще активен
    const requestSQL = `
      SELECT status, auction_deadline 
      FROM rental_requests 
      WHERE id = ? AND status = 'auction_active'
    `;
    
    const request = await database.get(requestSQL, [request_id]);
    
    if (!request) {
      throw new NotFoundError('Аукцион не найден или уже закрыт');
    }
    
    if (new Date(request.auction_deadline) < new Date()) {
      throw new BusinessLogicError('Время подачи ставок истекло');
    }
    
    // Проверяем, что владелец еще не подавал ставку
    const existingBidSQL = `
      SELECT id FROM rental_bids 
      WHERE request_id = ? AND owner_id = ?
    `;
    
    const existingBid = await database.get(existingBidSQL, [request_id, owner_id]);
    
    if (existingBid) {
      throw new BusinessLogicError('Вы уже подали ставку на этот аукцион');
    }
    
    const sql = `
      INSERT INTO rental_bids (
        request_id, owner_id, equipment_id, hourly_rate, daily_rate, total_price, comment
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await database.run(sql, [
      request_id, owner_id, equipment_id, hourly_rate, daily_rate, total_price, comment
    ]);
    
    return this.findById(result.id);
  }

  // Поиск ставки по ID
  static async findById(id) {
    const sql = `
      SELECT rb.*, u.name as owner_name, u.phone as owner_phone,
             c.name as company_name, e.name as equipment_name,
             rr.equipment_type, rr.equipment_subtype, rr.start_date, rr.end_date
      FROM rental_bids rb
      JOIN users u ON rb.owner_id = u.id
      LEFT JOIN companies c ON u.company_id = c.id
      JOIN equipment e ON rb.equipment_id = e.id
      JOIN rental_requests rr ON rb.request_id = rr.id
      WHERE rb.id = ?
    `;
    
    return await database.get(sql, [id]);
  }

  // Получение ставок владельца
  static async findByOwnerId(ownerId) {
    const sql = `
      SELECT rb.*, u.name as owner_name, u.phone as owner_phone,
             c.name as company_name, e.name as equipment_name,
             rr.equipment_type, rr.equipment_subtype, rr.start_date, rr.end_date,
             rr.location as work_location, rr.work_description,
             m.name as manager_name, m.phone as manager_phone
      FROM rental_bids rb
      JOIN users u ON rb.owner_id = u.id
      LEFT JOIN companies c ON u.company_id = c.id
      JOIN equipment e ON rb.equipment_id = e.id
      JOIN rental_requests rr ON rb.request_id = rr.id
      JOIN users m ON rr.manager_id = m.id
      WHERE rb.owner_id = ?
      ORDER BY rb.created_at DESC
    `;
    
    return await database.all(sql, [ownerId]);
  }

  // Получение ставок по заявке с фильтрацией по партнерствам
  static async findByRequestId(requestId) {
    const sql = `
      SELECT rb.*, u.name as owner_name, u.phone as owner_phone,
             c_owner.name as company_name, e.name as equipment_name
      FROM rental_bids rb
      JOIN users u ON rb.owner_id = u.id
      JOIN companies c_owner ON u.company_id = c_owner.id
      JOIN equipment e ON rb.equipment_id = e.id
      JOIN rental_requests rr ON rb.request_id = rr.id
      JOIN users u_manager ON rr.manager_id = u_manager.id
      JOIN companies c_manager ON u_manager.company_id = c_manager.id
      JOIN company_partnerships cp ON c_owner.id = cp.owner_company_id 
                                   AND c_manager.id = cp.manager_company_id
      WHERE rb.request_id = ?
        AND cp.status = 'active'
        AND c_owner.status = 'active'
        AND c_manager.status = 'active'
      ORDER BY rb.total_price ASC
    `;
    
    return await database.all(sql, [requestId]);
  }

  // Получение активных ставок по заявке с фильтрацией по партнерствам
  static async findActiveByRequestId(requestId) {
    const sql = `
      SELECT rb.id, rb.request_id, rb.status, rb.created_at,
             u.name as owner_name, c_owner.name as company_name, e.name as equipment_name
      FROM rental_bids rb
      JOIN users u ON rb.owner_id = u.id
      JOIN companies c_owner ON u.company_id = c_owner.id
      JOIN equipment e ON rb.equipment_id = e.id
      JOIN rental_requests rr ON rb.request_id = rr.id
      JOIN users u_manager ON rr.manager_id = u_manager.id
      JOIN companies c_manager ON u_manager.company_id = c_manager.id
      JOIN company_partnerships cp ON c_owner.id = cp.owner_company_id 
                                   AND c_manager.id = cp.manager_company_id
      WHERE rb.request_id = ? 
        AND rb.status = 'pending'
        AND cp.status = 'active'
        AND c_owner.status = 'active'
        AND c_manager.status = 'active'
      ORDER BY rb.created_at DESC
    `;
    
    return await database.all(sql, [requestId]);
  }

  // Обновление статуса ставки
  static async updateStatus(id, status) {
    const sql = 'UPDATE rental_bids SET status = ? WHERE id = ?';
    const result = await database.run(sql, [status, id]);
    return result.changes > 0;
  }

  // Обновление ставки (только если аукцион еще активен)
  static async update(id, bidData) {
    const { hourly_rate, daily_rate, total_price, comment } = bidData;
    
    // Проверяем, что ставка еще может быть изменена
    const checkSQL = `
      SELECT rb.status, rr.status as request_status, rr.auction_deadline
      FROM rental_bids rb
      JOIN rental_requests rr ON rb.request_id = rr.id
      WHERE rb.id = ?
    `;
    
    const bid = await database.get(checkSQL, [id]);
    
    if (!bid || bid.status !== 'pending' || bid.request_status !== 'auction_active') {
      throw new Error('Ставка не может быть изменена');
    }
    
    if (new Date(bid.auction_deadline) < new Date()) {
      throw new Error('Время подачи ставок истекло');
    }
    
    const sql = `
      UPDATE rental_bids 
      SET hourly_rate = ?, daily_rate = ?, total_price = ?, comment = ?
      WHERE id = ?
    `;
    
    await database.run(sql, [hourly_rate, daily_rate, total_price, comment, id]);
    return this.findById(id);
  }

  // Удаление ставки (только если аукцион еще активен)
  static async delete(id) {
    // Проверяем, что ставка может быть удалена
    const checkSQL = `
      SELECT rb.status, rr.status as request_status, rr.auction_deadline
      FROM rental_bids rb
      JOIN rental_requests rr ON rb.request_id = rr.id
      WHERE rb.id = ?
    `;
    
    const bid = await database.get(checkSQL, [id]);
    
    if (!bid || bid.status !== 'pending' || bid.request_status !== 'auction_active') {
      throw new Error('Ставка не может быть удалена');
    }
    
    if (new Date(bid.auction_deadline) < new Date()) {
      throw new Error('Время подачи ставок истекло');
    }
    
    const result = await database.run('DELETE FROM rental_bids WHERE id = ?', [id]);
    return result.changes > 0;
  }

  // Получение статистики по ставкам
  static async getStats() {
    const sql = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired,
        AVG(total_price) as avg_price,
        MIN(total_price) as min_price,
        MAX(total_price) as max_price
      FROM rental_bids
    `;
    
    return await database.get(sql);
  }

  // Получение лучших ставок по заявке (для закрытия аукциона)
  static async getBestBidsForRequest(requestId) {
    const sql = `
      SELECT rb.*, u.name as owner_name, u.phone as owner_phone,
             c.name as company_name, e.name as equipment_name
      FROM rental_bids rb
      JOIN users u ON rb.owner_id = u.id
      LEFT JOIN companies c ON u.company_id = c.id
      JOIN equipment e ON rb.equipment_id = e.id
      WHERE rb.request_id = ? AND rb.status = 'pending'
      ORDER BY rb.total_price ASC, rb.created_at ASC
    `;
    
    return await database.all(sql, [requestId]);
  }

  // Проверка прав доступа владельца к ставке
  static async checkOwnerAccess(bidId, ownerId) {
    const sql = 'SELECT id FROM rental_bids WHERE id = ? AND owner_id = ?';
    const bid = await database.get(sql, [bidId, ownerId]);
    return !!bid;
  }
}

module.exports = RentalBid;
