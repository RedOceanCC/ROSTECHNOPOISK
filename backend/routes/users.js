const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireAuth, requireAdmin, validateRequired } = require('../middleware/auth');
const logger = require('../utils/logger');

// Применяем авторизацию ко всем роутам
router.use(requireAuth);

// GET /api/users - Получить список пользователей (только админ)
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const users = await User.findAll();
    
    res.json({
      success: true,
      users: users
    });
    
  } catch (error) {
    next(error);
  }
});

// GET /api/users/:id - Получить пользователя по ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Проверяем права доступа
    if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещен'
      });
    }
    
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }
    
    res.json({
      success: true,
      user: user
    });
    
  } catch (error) {
    next(error);
  }
});

// POST /api/users - Создать пользователя (только админ)
router.post('/', 
  requireAdmin,
  validateRequired(['name', 'role', 'password']),
  async (req, res, next) => {
    try {
      const { name, role, password, phone, telegram_id, company_id } = req.body;
      
      // Валидация роли
      const validRoles = ['admin', 'owner', 'manager'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Неверная роль пользователя'
        });
      }
      
      const userData = {
        name,
        role,
        password,
        phone: phone || null,
        telegram_id: telegram_id || null,
        company_id: company_id || null
      };
      
      const user = await User.create(userData);
      
      // Логируем создание пользователя
      logger.info('Пользователь успешно создан', {
        admin_id: req.user.id,
        admin_name: req.user.name,
        created_user_id: user.id,
        created_user_name: user.name,
        created_user_role: user.role,
        created_user_company_id: user.company_id,
        timestamp: new Date().toISOString()
      });
      
      res.status(201).json({
        success: true,
        message: 'Пользователь создан успешно',
        user: user
      });
      
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/users/:id - Обновить пользователя
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, telegram_id, company_id, status, role, password } = req.body;
    
    // Проверяем права доступа
    if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещен'
      });
    }
    
    // Обычные пользователи не могут изменять статус, компанию и роль
    const updateData = { name, phone, telegram_id };
    
    if (req.user.role === 'admin') {
      updateData.company_id = company_id;
      updateData.status = status;
      updateData.role = role;
      
      // Если передан пароль, обновляем его
      if (password && password.trim()) {
        updateData.password = password;
      }
    }
    
    const user = await User.update(id, updateData);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }
    
    // Обновляем сессию если пользователь редактирует себя
    if (req.user.id === parseInt(id)) {
      req.session.user = user;
    }
    
    res.json({
      success: true,
      message: 'Пользователь обновлен успешно',
      user: user
    });
    
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/:id/password - Изменить пароль
router.put('/:id/password',
  validateRequired(['newPassword']),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      
      // Проверяем права доступа
      if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
        return res.status(403).json({
          success: false,
          message: 'Доступ запрещен'
        });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Пароль должен содержать минимум 6 символов'
        });
      }
      
      await User.updatePassword(id, newPassword);
      
      res.json({
        success: true,
        message: 'Пароль изменен успешно'
      });
      
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/users/:id - Удалить пользователя (только админ)
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Получаем информацию о пользователе перед удалением
    const userToDelete = await User.findById(id);
    
    if (!userToDelete) {
      logger.warn('Попытка удаления несуществующего пользователя', {
        admin_id: req.user.id,
        admin_name: req.user.name,
        target_user_id: id
      });
      
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }
    
    // Нельзя удалить самого себя
    if (req.user.id === parseInt(id)) {
      logger.warn('Попытка самоудаления администратора', {
        admin_id: req.user.id,
        admin_name: req.user.name
      });
      
      return res.status(400).json({
        success: false,
        message: 'Нельзя удалить собственный аккаунт'
      });
    }
    
    // Мягкое удаление - меняем статус на inactive вместо физического удаления
    const updated = await User.update(id, { status: 'inactive' });
    
    if (!updated) {
      logger.error('Ошибка удаления пользователя из БД', {
        admin_id: req.user.id,
        admin_name: req.user.name,
        target_user_id: id,
        target_user_name: userToDelete.name
      });
      
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }
    
    // Логируем успешное удаление (мягкое)
    logger.info('Пользователь успешно деактивирован', {
      admin_id: req.user.id,
      admin_name: req.user.name,
      deleted_user_id: id,
      deleted_user_name: userToDelete.name,
      deleted_user_role: userToDelete.role,
      deleted_user_company: userToDelete.company_name,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: 'Пользователь удален успешно'
    });
    
  } catch (error) {
    logger.error('Критическая ошибка при удалении пользователя', {
      admin_id: req.user.id,
      admin_name: req.user.name,
      target_user_id: req.params.id,
      error: error.message,
      stack: error.stack
    });
    
    next(error);
  }
});

// GET /api/users/role/:role - Получить пользователей по роли
router.get('/role/:role', async (req, res, next) => {
  try {
    const { role } = req.params;
    
    // Проверяем права доступа
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещен'
      });
    }
    
    const users = await User.findByRole(role);
    
    res.json({
      success: true,
      users: users
    });
    
  } catch (error) {
    next(error);
  }
});

// POST /api/users/:id/link-telegram - Привязать Telegram ID
router.post('/:id/link-telegram',
  validateRequired(['telegram_id']),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { telegram_id } = req.body;
      
      // Проверяем права доступа
      if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
        return res.status(403).json({
          success: false,
          message: 'Доступ запрещен'
        });
      }
      
      const user = await User.linkTelegram(id, telegram_id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Пользователь не найден'
        });
      }
      
      // Обновляем сессию если пользователь редактирует себя
      if (req.user.id === parseInt(id)) {
        req.session.user = user;
      }
      
      res.json({
        success: true,
        message: 'Telegram ID привязан успешно',
        user: user
      });
      
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
