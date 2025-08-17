const express = require('express');
const router = express.Router();
const RentalRequest = require('../models/RentalRequest');
const RentalBid = require('../models/RentalBid');
const Equipment = require('../models/Equipment');
const User = require('../models/User');
const { requireAuth, requireAuthOrTelegram, requireManager, requireOwner, validateRequired } = require('../middleware/auth');

// Применяем авторизацию ко всем роутам (кроме GET /)
router.use((req, res, next) => {
  // Для GET /api/requests используем комбинированную авторизацию
  if (req.method === 'GET' && req.path === '/') {
    return requireAuthOrTelegram(req, res, next);
  }
  // Для остальных роутов - стандартная авторизация
  return requireAuth(req, res, next);
});

// GET /api/requests - Получить заявки
router.get('/', async (req, res, next) => {
  try {
    let requests;
    
    if (req.user.role === 'admin') {
      // Админ видит все заявки
      requests = await RentalRequest.findAll();
    } else if (req.user.role === 'manager') {
      // Менеджер видит только свои заявки
      requests = await RentalRequest.findByManagerId(req.user.id);
    } else if (req.user.role === 'owner') {
      // Владелец видит активные заявки, доступные для участия
      requests = await RentalRequest.findActiveForOwner(req.user.id);
    } else {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещен'
      });
    }
    
    res.json({
      success: true,
      requests: requests
    });
    
  } catch (error) {
    next(error);
  }
});

// GET /api/requests/:id - Получить заявку по ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const request = await RentalRequest.findById(id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Заявка не найдена'
      });
    }
    
    // Проверяем права доступа
    const hasAccess = req.user.role === 'admin' || 
                     req.user.id === request.manager_id ||
                     req.user.role === 'owner'; // Владельцы могут видеть заявки для участия в аукционе
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещен'
      });
    }
    
    // Получаем ставки по заявке
    let bids = [];
    if (req.user.role === 'admin' || req.user.id === request.manager_id) {
      // Админ и менеджер видят все ставки с ценами (после закрытия аукциона)
      if (request.status === 'auction_closed' || request.status === 'completed') {
        bids = await RentalBid.findByRequestId(id);
      } else {
        // Во время аукциона менеджер видит только количество ставок без цен
        bids = await RentalBid.findActiveByRequestId(id);
      }
    } else if (req.user.role === 'owner') {
      // Владелец видит только свои ставки
      const allBids = await RentalBid.findByOwnerId(req.user.id);
      bids = allBids.filter(bid => bid.request_id === parseInt(id));
    }
    
    res.json({
      success: true,
      request: request,
      bids: bids
    });
    
  } catch (error) {
    next(error);
  }
});

// POST /api/requests - Создать заявку (только менеджеры)
router.post('/',
  requireManager,
  validateRequired(['equipment_type', 'equipment_subtype', 'start_date', 'end_date', 'work_description', 'location']),
  async (req, res, next) => {
    try {
      const {
        equipment_type, equipment_subtype, start_date, end_date,
        work_description, location, budget_range
      } = req.body;
      
      // Валидация дат
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      const today = new Date();
      
      if (startDate <= today) {
        return res.status(400).json({
          success: false,
          message: 'Дата начала должна быть в будущем'
        });
      }
      
      if (endDate <= startDate) {
        return res.status(400).json({
          success: false,
          message: 'Дата окончания должна быть позже даты начала'
        });
      }
      
      // Проверяем наличие доступной техники
      const availableEquipment = await Equipment.findAvailableForManager(
        req.user.id, equipment_type, equipment_subtype
      );
      
      if (availableEquipment.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Нет доступной техники данного типа от партнерских компаний'
        });
      }
      
      const requestData = {
        manager_id: req.user.id,
        equipment_type,
        equipment_subtype,
        start_date,
        end_date,
        work_description,
        location,
        budget_range: budget_range || null
      };
      
      const request = await RentalRequest.create(requestData);
      
      // Отправляем уведомления владельцам техники через Telegram
      try {
        const { notifyNewRequest } = require('../telegram-bot');
        await notifyNewRequest(request.id);
      } catch (telegramError) {
        console.error('Ошибка отправки Telegram уведомлений:', telegramError.message);
        // Не останавливаем выполнение, если Telegram недоступен
      }
      
      res.status(201).json({
        success: true,
        message: 'Заявка создана успешно. Аукцион начался!',
        request: request,
        available_owners: availableEquipment.length
      });
      
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/requests/:id - Обновить заявку (только менеджер-создатель, только если аукцион не начался)
router.put('/:id', requireManager, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const request = await RentalRequest.findById(id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Заявка не найдена'
      });
    }
    
    // Проверяем права доступа
    if (req.user.id !== request.manager_id) {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещен'
      });
    }
    
    // Проверяем, что заявку можно редактировать
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Нельзя редактировать заявку после начала аукциона'
      });
    }
    
    // TODO: Реализовать обновление заявки
    
    res.json({
      success: false,
      message: 'Редактирование заявок будет добавлено в следующих версиях'
    });
    
  } catch (error) {
    next(error);
  }
});

// DELETE /api/requests/:id - Удалить заявку (только менеджер-создатель или админ)
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const request = await RentalRequest.findById(id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Заявка не найдена'
      });
    }
    
    // Проверяем права доступа
    if (req.user.role !== 'admin' && req.user.id !== request.manager_id) {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещен'
      });
    }
    
    // Проверяем, что заявку можно удалить
    if (request.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Нельзя удалить завершенную заявку'
      });
    }
    
    const deleted = await RentalRequest.delete(id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Заявка не найдена'
      });
    }
    
    res.json({
      success: true,
      message: 'Заявка удалена успешно'
    });
    
  } catch (error) {
    next(error);
  }
});

// PATCH /api/requests/:id/status - Обновить статус заявки (только админ)
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Только администратор может изменять статус заявки'
      });
    }
    
    const validStatuses = ['pending', 'auction_active', 'auction_closed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Неверный статус заявки'
      });
    }
    
    const updated = await RentalRequest.updateStatus(id, status);
    
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Заявка не найдена'
      });
    }
    
    res.json({
      success: true,
      message: 'Статус заявки обновлен успешно'
    });
    
  } catch (error) {
    next(error);
  }
});

// GET /api/requests/stats - Получить статистику по заявкам (только админ)
router.get('/admin/stats', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещен'
      });
    }
    
    const stats = await RentalRequest.getStats();
    
    res.json({
      success: true,
      stats: stats
    });
    
  } catch (error) {
    next(error);
  }
});

// POST /api/requests/:id/close-auction - Принудительно закрыть аукцион (только админ)
router.post('/:id/close-auction', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Только администратор может принудительно закрывать аукционы'
      });
    }
    
    const request = await RentalRequest.findById(id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Заявка не найдена'
      });
    }
    
    if (request.status !== 'auction_active') {
      return res.status(400).json({
        success: false,
        message: 'Аукцион не активен'
      });
    }
    
    const result = await RentalRequest.closeAuction(id);
    
    res.json({
      success: true,
      message: result.winner ? 'Аукцион закрыт, победитель определен' : 'Аукцион закрыт, ставок не было',
      winner: result.winner,
      total_bids: result.bids.length
    });
    
  } catch (error) {
    next(error);
  }
});

module.exports = router;
