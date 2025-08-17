const database = require('./Database');

class RentalRequest {
  // Создание заявки на аренду
  static async create(requestData) {
    const {
      manager_id, equipment_type, equipment_subtype, start_date, end_date,
      work_description, location, budget_range
    } = requestData;
    
    // Устанавливаем дедлайн аукциона (5 минут для демо)
    const auctionDurationMinutes = parseInt(process.env.AUCTION_DURATION_MINUTES) || 5;
    const auction_deadline = new Date();
    auction_deadline.setMinutes(auction_deadline.getMinutes() + auctionDurationMinutes);
    
    const sql = `
      INSERT INTO rental_requests (
        manager_id, equipment_type, equipment_subtype, start_date, end_date,
        work_description, location, budget_range, status, auction_deadline
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'auction_active', ?)
    `;
    
    const result = await database.run(sql, [
      manager_id, equipment_type, equipment_subtype, start_date, end_date,
      work_description, location, budget_range, auction_deadline.toISOString()
    ]);
    
    return this.findById(result.id);
  }

  // Поиск заявки по ID
  static async findById(id) {
    const sql = `
      SELECT rr.*, u.name as manager_name, u.phone as manager_phone,
             c.name as manager_company_name,
             rb_win.total_price as winning_price,
             u_win.name as winning_owner_name,
             u_win.phone as winning_owner_phone
      FROM rental_requests rr
      JOIN users u ON rr.manager_id = u.id
      LEFT JOIN companies c ON u.company_id = c.id
      LEFT JOIN rental_bids rb_win ON rr.winning_bid_id = rb_win.id
      LEFT JOIN users u_win ON rb_win.owner_id = u_win.id
      WHERE rr.id = ?
    `;
    
    return await database.get(sql, [id]);
  }

  // Получение заявок для менеджера (только собственные заявки)
  static async findByManagerId(managerId) {
    const sql = `
      SELECT rr.*, u.name as manager_name, u.phone as manager_phone,
             c.name as manager_company_name,
             COUNT(rb.id) as bids_count,
             rb_win.total_price as winning_price,
             u_win.name as winning_owner_name,
             u_win.phone as winning_owner_phone
      FROM rental_requests rr
      JOIN users u ON rr.manager_id = u.id
      LEFT JOIN companies c ON u.company_id = c.id
      LEFT JOIN rental_bids rb ON rr.id = rb.request_id
      LEFT JOIN rental_bids rb_win ON rr.winning_bid_id = rb_win.id
      LEFT JOIN users u_win ON rb_win.owner_id = u_win.id
      WHERE rr.manager_id = ?
      GROUP BY rr.id
      ORDER BY rr.created_at DESC
    `;
    
    return await database.all(sql, [managerId]);
  }

  // Получение активных заявок для владельца (с учетом партнерств)
  static async findActiveForOwner(ownerId) {
    const sql = `
      SELECT DISTINCT rr.*, u.name as manager_name, u.phone as manager_phone,
             c_manager.name as manager_company_name,
             CASE WHEN rb.id IS NOT NULL THEN 1 ELSE 0 END as has_bid
      FROM rental_requests rr
      JOIN users u ON rr.manager_id = u.id
      JOIN companies c_manager ON u.company_id = c_manager.id
      JOIN company_partnerships cp ON c_manager.id = cp.manager_company_id
      JOIN users u_owner ON u_owner.company_id = cp.owner_company_id
      LEFT JOIN rental_bids rb ON rr.id = rb.request_id AND rb.owner_id = ?
      WHERE u_owner.id = ?
        AND rr.status = 'auction_active'
        AND rr.auction_deadline > datetime('now')
        AND cp.status = 'active'
      ORDER BY rr.auction_deadline ASC
    `;
    
    return await database.all(sql, [ownerId, ownerId]);
  }

  // Получение всех заявок (для админа)
  static async findAll() {
    const sql = `
      SELECT rr.*, u.name as manager_name, u.phone as manager_phone,
             c.name as manager_company_name,
             COUNT(rb.id) as bids_count
      FROM rental_requests rr
      JOIN users u ON rr.manager_id = u.id
      LEFT JOIN companies c ON u.company_id = c.id
      LEFT JOIN rental_bids rb ON rr.id = rb.request_id
      GROUP BY rr.id
      ORDER BY rr.created_at DESC
    `;
    
    return await database.all(sql);
  }

  // Получение просроченных аукционов
  static async findExpiredAuctions() {
    const sql = `
      SELECT rr.*, u.name as manager_name, u.phone as manager_phone,
             c.name as manager_company_name
      FROM rental_requests rr
      JOIN users u ON rr.manager_id = u.id
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE rr.status = 'auction_active' 
        AND rr.auction_deadline <= datetime('now')
      ORDER BY rr.auction_deadline ASC
    `;
    
    return await database.all(sql);
  }

  // Обновление статуса заявки
  static async updateStatus(id, status, winningBidId = null) {
    let sql = 'UPDATE rental_requests SET status = ?';
    const params = [status];
    
    if (winningBidId) {
      sql += ', winning_bid_id = ?';
      params.push(winningBidId);
    }
    
    sql += ' WHERE id = ?';
    params.push(id);
    
    const result = await database.run(sql, params);
    return result.changes > 0;
  }

  // Закрытие аукциона с выбором победителя
  static async closeAuction(requestId) {
    // Получаем все ставки по заявке
    const bidsSQL = `
      SELECT rb.*, u.name as owner_name, u.phone as owner_phone,
             e.name as equipment_name
      FROM rental_bids rb
      JOIN users u ON rb.owner_id = u.id
      JOIN equipment e ON rb.equipment_id = e.id
      WHERE rb.request_id = ? AND rb.status = 'pending'
      ORDER BY rb.total_price ASC
    `;
    
    const bids = await database.all(bidsSQL, [requestId]);
    
    if (bids.length === 0) {
      // Нет ставок - отменяем заявку
      await this.updateStatus(requestId, 'cancelled');
      return { success: true, winner: null, bids: [] };
    }
    
    // Выбираем лучшую ставку (минимальная цена)
    const winningBid = bids[0];
    
    // Обновляем статусы в транзакции
    const queries = [
      // Обновляем заявку
      {
        sql: 'UPDATE rental_requests SET status = ?, winning_bid_id = ? WHERE id = ?',
        params: ['auction_closed', winningBid.id, requestId]
      },
      // Помечаем выигрышную ставку
      {
        sql: 'UPDATE rental_bids SET status = ? WHERE id = ?',
        params: ['accepted', winningBid.id]
      },
      // Помечаем остальные ставки как отклоненные
      {
        sql: 'UPDATE rental_bids SET status = ? WHERE request_id = ? AND id != ?',
        params: ['rejected', requestId, winningBid.id]
      },
      // Помечаем технику как занятую
      {
        sql: 'UPDATE equipment SET status = ? WHERE id = ?',
        params: ['busy', winningBid.equipment_id]
      }
    ];
    
    await database.transaction(queries);
    
    return {
      success: true,
      winner: winningBid,
      bids: bids
    };
  }

  // Получение статистики по заявкам
  static async getStats() {
    const sql = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'auction_active' THEN 1 END) as active_auctions,
        COUNT(CASE WHEN status = 'auction_closed' THEN 1 END) as closed_auctions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        AVG(CASE WHEN winning_bid_id IS NOT NULL THEN 
          (SELECT total_price FROM rental_bids WHERE id = rental_requests.winning_bid_id)
        END) as avg_winning_price
      FROM rental_requests
    `;
    
    return await database.get(sql);
  }

  // Удаление заявки
  static async delete(id) {
    // Сначала удаляем все связанные ставки
    await database.run('DELETE FROM rental_bids WHERE request_id = ?', [id]);
    
    // Затем удаляем саму заявку
    const result = await database.run('DELETE FROM rental_requests WHERE id = ?', [id]);
    return result.changes > 0;
  }

  // Получить истекшие аукционы для автоматического закрытия
  static async findExpiredAuctions() {
    const sql = `
      SELECT * FROM rental_requests
      WHERE status = 'auction_active'
        AND auction_deadline <= datetime('now')
      ORDER BY auction_deadline ASC
    `;
    
    const rows = await database.all(sql);
    return rows.map(row => ({
      id: row.id,
      manager_id: row.manager_id,
      equipment_type: row.equipment_type,
      equipment_subtype: row.equipment_subtype,
      auction_deadline: row.auction_deadline,
      start_date: row.start_date,
      end_date: row.end_date,
      work_description: row.work_description,
      location: row.location,
      budget_range: row.budget_range,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
  }
}

module.exports = RentalRequest;
