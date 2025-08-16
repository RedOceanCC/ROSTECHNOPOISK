const express = require('express');
const router = express.Router();
const RentalBid = require('../models/RentalBid');
const RentalRequest = require('../models/RentalRequest');
const Equipment = require('../models/Equipment');
const { requireAuth, requireOwner, validateRequired } = require('../middleware/auth');

// Применяем авторизацию ко всем роутам
router.use(requireAuth);

// GET /api/bids - Получить ставки
router.get('/', async (req, res, next) => {
  try {
    let bids;
    
    if (req.user.role === 'admin') {
      // Админ видит все ставки
      const { request_id } = req.query;
      if (request_id) {
        bids = await RentalBid.findByRequestId(request_id);
      } else {
        // TODO: Реализовать получение всех ставок для админа
        return res.status(400).json({
          success: false,
          message: 'Укажите request_id для получения ставок'
        });
      }
    } else if (req.user.role === 'owner') {
      // Владелец видит только свои ставки
      bids = await RentalBid.findByOwnerId(req.user.id);
    } else {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещен'
      });
    }
    
    res.json({
      success: true,
      bids: bids
    });
    
  } catch (error) {
    next(error);
  }
});

// GET /api/bids/:id - Получить ставку по ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const bid = await RentalBid.findById(id);
    
    if (!bid) {
      return res.status(404).json({
        success: false,
        message: 'Ставка не найдена'
      });
    }
    
    // Проверяем права доступа
    const hasAccess = req.user.role === 'admin' || 
                     req.user.id === bid.owner_id;
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещен'
      });
    }
    
    res.json({
      success: true,
      bid: bid
    });
    
  } catch (error) {
    next(error);
  }
});

// POST /api/bids - Создать ставку (только владельцы)
router.post('/',
  requireOwner,
  validateRequired(['request_id', 'equipment_id', 'hourly_rate', 'daily_rate', 'total_price']),
  async (req, res, next) => {
    try {
      const {
        request_id, equipment_id, hourly_rate, daily_rate, total_price, comment
      } = req.body;
      
      // Проверяем, что техника принадлежит владельцу
      const equipment = await Equipment.findById(equipment_id);
      
      if (!equipment) {
        return res.status(404).json({
          success: false,
          message: 'Техника не найдена'
        });
      }
      
      if (equipment.owner_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Вы не являетесь владельцем этой техники'
        });
      }
      
      if (equipment.status !== 'available') {
        return res.status(400).json({
          success: false,
          message: 'Техника недоступна для аренды'
        });
      }
      
      // Проверяем заявку
      const request = await RentalRequest.findById(request_id);
      
      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Заявка не найдена'
        });
      }
      
      // Проверяем, что техника подходит под заявку
      if (equipment.type !== request.equipment_type || equipment.subtype !== request.equipment_subtype) {
        return res.status(400).json({
          success: false,
          message: 'Техника не соответствует требованиям заявки'
        });
      }
      
      // Валидация цен
      const hourlyRateNum = parseFloat(hourly_rate);
      const dailyRateNum = parseFloat(daily_rate);
      const totalPriceNum = parseFloat(total_price);
      
      if (hourlyRateNum <= 0 || dailyRateNum <= 0 || totalPriceNum <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Цены должны быть положительными числами'
        });
      }
      
      const bidData = {
        request_id: parseInt(request_id),
        owner_id: req.user.id,
        equipment_id: parseInt(equipment_id),
        hourly_rate: hourlyRateNum,
        daily_rate: dailyRateNum,
        total_price: totalPriceNum,
        comment: comment || null
      };
      
      const bid = await RentalBid.create(bidData);
      
      res.status(201).json({
        success: true,
        message: 'Ставка подана успешно',
        bid: bid
      });
      
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/bids/:id - Обновить ставку (только владелец-создатель)
router.put('/:id',
  requireOwner,
  validateRequired(['hourly_rate', 'daily_rate', 'total_price']),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { hourly_rate, daily_rate, total_price, comment } = req.body;
      
      // Проверяем права доступа
      const hasAccess = await RentalBid.checkOwnerAccess(id, req.user.id);
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Доступ запрещен'
        });
      }
      
      // Валидация цен
      const hourlyRateNum = parseFloat(hourly_rate);
      const dailyRateNum = parseFloat(daily_rate);
      const totalPriceNum = parseFloat(total_price);
      
      if (hourlyRateNum <= 0 || dailyRateNum <= 0 || totalPriceNum <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Цены должны быть положительными числами'
        });
      }
      
      const updateData = {
        hourly_rate: hourlyRateNum,
        daily_rate: dailyRateNum,
        total_price: totalPriceNum,
        comment: comment || null
      };
      
      const bid = await RentalBid.update(id, updateData);
      
      res.json({
        success: true,
        message: 'Ставка обновлена успешно',
        bid: bid
      });
      
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/bids/:id - Удалить ставку (только владелец-создатель)
router.delete('/:id', requireOwner, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Проверяем права доступа
    const hasAccess = await RentalBid.checkOwnerAccess(id, req.user.id);
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещен'
      });
    }
    
    const deleted = await RentalBid.delete(id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Ставка не найдена или не может быть удалена'
      });
    }
    
    res.json({
      success: true,
      message: 'Ставка удалена успешно'
    });
    
  } catch (error) {
    next(error);
  }
});

// PATCH /api/bids/:id/status - Обновить статус ставки (только админ)
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Только администратор может изменять статус ставки'
      });
    }
    
    const validStatuses = ['pending', 'accepted', 'rejected', 'expired'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Неверный статус ставки'
      });
    }
    
    const updated = await RentalBid.updateStatus(id, status);
    
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Ставка не найдена'
      });
    }
    
    res.json({
      success: true,
      message: 'Статус ставки обновлен успешно'
    });
    
  } catch (error) {
    next(error);
  }
});

// GET /api/bids/request/:requestId - Получить ставки по заявке
router.get('/request/:requestId', async (req, res, next) => {
  try {
    const { requestId } = req.params;
    
    // Проверяем заявку и права доступа
    const request = await RentalRequest.findById(requestId);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Заявка не найдена'
      });
    }
    
    let bids;
    
    if (req.user.role === 'admin' || req.user.id === request.manager_id) {
      // Админ и менеджер-создатель видят все ставки
      if (request.status === 'auction_closed' || request.status === 'completed') {
        // После закрытия аукциона показываем все ставки с ценами
        bids = await RentalBid.findByRequestId(requestId);
      } else {
        // Во время аукциона показываем только количество ставок без цен
        bids = await RentalBid.findActiveByRequestId(requestId);
      }
    } else if (req.user.role === 'owner') {
      // Владелец видит только свои ставки по этой заявке
      const allBids = await RentalBid.findByOwnerId(req.user.id);
      bids = allBids.filter(bid => bid.request_id === parseInt(requestId));
    } else {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещен'
      });
    }
    
    res.json({
      success: true,
      bids: bids,
      request_status: request.status
    });
    
  } catch (error) {
    next(error);
  }
});

// GET /api/bids/stats - Получить статистику по ставкам (только админ)
router.get('/admin/stats', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещен'
      });
    }
    
    const stats = await RentalBid.getStats();
    
    res.json({
      success: true,
      stats: stats
    });
    
  } catch (error) {
    next(error);
  }
});

module.exports = router;
