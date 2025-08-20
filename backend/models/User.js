const database = require('./Database');
const bcrypt = require('bcryptjs');

class User {
  // Создание пользователя
  static async create(userData) {
    const { password, role, name, phone, telegram_id, company_id } = userData;
    
    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const sql = `
      INSERT INTO users (password, role, name, phone, telegram_id, company_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const result = await database.run(sql, [
      hashedPassword, role, name, phone, telegram_id, company_id
    ]);
    
    return this.findById(result.id);
  }

  // Поиск пользователя по ID
  static async findById(id) {
    const sql = `
      SELECT u.*, c.name as company_name 
      FROM users u 
      LEFT JOIN companies c ON u.company_id = c.id 
      WHERE u.id = ? AND u.status = 'active'
    `;
    
    const user = await database.get(sql, [id]);
    if (user) {
      delete user.password; // Не возвращаем пароль
    }
    return user;
  }

  // Поиск пользователя по паролю (для авторизации)
  static async findByPassword(password) {
    const sql = `
      SELECT u.*, c.name as company_name 
      FROM users u 
      LEFT JOIN companies c ON u.company_id = c.id 
      WHERE u.status = 'active'
    `;
    
    const users = await database.all(sql);
    
    for (const user of users) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        delete user.password; // Не возвращаем пароль
        return user;
      }
    }
    
    return null;
  }

  // Получение всех пользователей
  static async findAll() {
    const sql = `
      SELECT u.id, u.role, u.name, u.phone, u.telegram_id, u.status, u.created_at,
             c.name as company_name
      FROM users u 
      LEFT JOIN companies c ON u.company_id = c.id 
      ORDER BY u.created_at DESC
    `;
    
    return await database.all(sql);
  }

  // Получение пользователей по роли
  static async findByRole(role) {
    const sql = `
      SELECT u.*, c.name as company_name 
      FROM users u 
      LEFT JOIN companies c ON u.company_id = c.id 
      WHERE u.role = ? AND u.status = 'active'
      ORDER BY u.name
    `;
    
    const users = await database.all(sql, [role]);
    return users.map(user => {
      delete user.password;
      return user;
    });
  }

  // Получение владельцев из партнерских компаний
  static async findOwnersForManager(managerId) {
    const sql = `
      SELECT DISTINCT u.*, c.name as company_name
      FROM users u
      JOIN companies c ON u.company_id = c.id
      JOIN company_partnerships cp ON c.id = cp.owner_company_id
      JOIN users m ON m.company_id = cp.manager_company_id
      WHERE m.id = ? AND u.role = 'owner' AND u.status = 'active' AND cp.status = 'active'
      ORDER BY u.name
    `;
    
    const users = await database.all(sql, [managerId]);
    return users.map(user => {
      delete user.password;
      return user;
    });
  }

  // Обновление пользователя
  static async update(id, userData) {
    const { name, phone, telegram_id, company_id, status, role, password } = userData;
    
    // Получаем текущие данные пользователя
    const currentUser = await database.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!currentUser) {
      throw new Error('Пользователь не найден');
    }
    
    // Подготавливаем данные для обновления
    const updateFields = [];
    const updateValues = [];
    
    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (phone !== undefined) {
      updateFields.push('phone = ?');
      updateValues.push(phone);
    }
    if (telegram_id !== undefined) {
      updateFields.push('telegram_id = ?');
      updateValues.push(telegram_id);
    }
    if (company_id !== undefined) {
      updateFields.push('company_id = ?');
      updateValues.push(company_id);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }
    if (role !== undefined) {
      updateFields.push('role = ?');
      updateValues.push(role);
    }
    if (password !== undefined && password.trim()) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push('password = ?');
      updateValues.push(hashedPassword);
    }
    
    // Если нет полей для обновления, просто возвращаем пользователя
    if (updateFields.length === 0) {
      return this.findById(id);
    }
    
    updateValues.push(id);
    
    const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    await database.run(sql, updateValues);
    
    return this.findById(id);
  }

  // Обновление пароля
  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const sql = 'UPDATE users SET password = ? WHERE id = ?';
    await database.run(sql, [hashedPassword, id]);
    
    return true;
  }

  // Удаление пользователя (мягкое удаление)
  static async delete(id) {
    const sql = 'UPDATE users SET status = \'inactive\' WHERE id = ?';
    const result = await database.run(sql, [id]);
    return result.changes > 0;
  }

  // Привязка Telegram ID
  static async linkTelegram(userId, telegramId) {
    const sql = 'UPDATE users SET telegram_id = ? WHERE id = ?';
    await database.run(sql, [telegramId, userId]);
    return this.findById(userId);
  }

  // Поиск по Telegram ID
  static async findByTelegramId(telegramId) {
    const sql = `
      SELECT u.*, c.name as company_name 
      FROM users u 
      LEFT JOIN companies c ON u.company_id = c.id 
      WHERE u.telegram_id = ? AND u.status = 'active'
    `;
    
    const user = await database.get(sql, [telegramId]);
    if (user) {
      delete user.password;
    }
    return user;
  }
}

module.exports = User;
