const express = require('express');
const router = express.Router();
const RentalRequest = require('../models/RentalRequest');
const RentalBid = require('../models/RentalBid');
const Equipment = require('../models/Equipment');
const User = require('../models/User');
const { requireAuth, requireAuthOrTelegram, requireManager, requireOwner, validateRequired } = require('../middleware/auth');
const logger = require('../utils/logger');
const { ValidationError, BusinessLogicError, NotFoundError } = require('../utils/errors');

/**
 * Вспомогательные функции для работы с аукционами
 */

/**
 * Проверяет, истек ли аукцион и нужно ли его закрыть
 * @param {Object} request - объект заявки
 * @returns {Boolean} - true если аукцион истек
 */
const isAuctionExpired = (request) => {
  if (!request || !request.auction_deadline) return false;
  return new Date(request.auction_deadline) <= new Date();
};

/**
 * Автоматически закрывает аукцион если он истек
 * @param {Number} requestId - ID заявки
 * @returns {Object|null} - результат закрытия аукциона или null
 */
const autoCloseExpiredAuction = async (requestId) => {
  try {
    const request = await RentalRequest.findById(requestId);
    
    if (!request || request.status !== 'auction_active') {
      return null;
    }
    
    if (isAuctionExpired(request)) {
      logger.info(`🔄 Автоматическое закрытие истекшего аукциона ${requestId}`);
      const result = await RentalRequest.closeAuction(requestId);
      return result;
    }
    
    return null;
  } catch (error) {
    logger.error(`❌ Ошибка автоматического закрытия аукциона ${requestId}:`, error);
    return null;
  }
};

/**
 * Проверяет права доступа к заявке
 * @param {Object} user - пользователь
 * @param {Object} request - заявка
 * @returns {Boolean} - есть ли доступ
 */
const hasRequestAccess = (user, request) => {
  return user.role === 'admin' || 
         user.id === request.manager_id ||
         user.role === 'owner';
};

/**
 * Создает детальное сообщение об ошибке для недоступности результатов
 * @param {Object} request - заявка
 * @param {Object} user - пользователь
 * @returns {String} - детальное сообщение
 */
const createResultsErrorMessage = (request, user) => {
  const now = new Date();
  const deadline = new Date(request.auction_deadline);
  const timeLeft = deadline - now;
  
  if (request.status === 'auction_active') {
    if (timeLeft > 0) {
      const minutesLeft = Math.ceil(timeLeft / (1000 * 60));
      return `Аукцион еще активен. Завершится через ${minutesLeft} мин. (${deadline.toLocaleString('ru-RU')})`;
    } else {
      return 'Аукцион истек, но еще не обработан системой. Попробуйте через несколько секунд.';
    }
  }
  
  if (request.status === 'pending') {
    return 'Аукцион еще не начался';
  }
  
  if (request.status === 'cancelled') {
    return 'Аукцион был отменен';
  }
  
  return `Результаты недоступны. Статус: ${request.status}`;
};

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
    
    if (!id || isNaN(parseInt(id))) {
      throw new ValidationError('Некорректный ID заявки');
    }
    
    const request = await RentalRequest.findById(id);
    
    if (!request) {
      throw new NotFoundError('Заявка не найдена');
    }
    
    // Проверяем права доступа
    if (!hasRequestAccess(req.user, request)) {
      throw new BusinessLogicError('Доступ к заявке запрещен');
    }
    
    // Автоматически закрываем аукцион если он истек
    await autoCloseExpiredAuction(parseInt(id));
    
    // Получаем актуальную информацию после возможного закрытия
    const updatedRequest = await RentalRequest.findById(id);
    
    // Получаем ставки по заявке в зависимости от роли
    let bids = [];
    try {
      if (req.user.role === 'admin' || req.user.id === request.manager_id) {
        // Админ и менеджер видят все ставки с ценами (после закрытия аукциона)
        if (updatedRequest.status === 'auction_closed' || updatedRequest.status === 'completed') {
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
    } catch (bidsError) {
      logger.error(`Ошибка получения ставок для заявки ${id}:`, bidsError);
      // Не блокируем ответ из-за ошибки ставок
      bids = [];
    }
    
    // Добавляем информацию о статусе аукциона
    const auctionInfo = {
      is_expired: isAuctionExpired(updatedRequest),
      time_left: updatedRequest.auction_deadline ? 
        Math.max(0, new Date(updatedRequest.auction_deadline) - new Date()) : 0
    };
    
    res.json({
      success: true,
      request: updatedRequest,
      bids: bids,
      auction_info: auctionInfo
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
      today.setSeconds(0, 0); // Сбрасываем секунды для точного сравнения
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new ValidationError('Некорректный формат дат. Используйте ISO 8601 формат.');
      }
      
      if (startDate <= today) {
        throw new ValidationError('Дата начала работ должна быть в будущем');
      }
      
      if (endDate <= startDate) {
        throw new ValidationError('Дата окончания работ должна быть позже даты начала');
      }
      
      // Проверяем разумность периода
      const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      if (daysDiff > 365) {
        throw new ValidationError('Период аренды не может превышать 365 дней');
      }
      
      // Проверяем наличие доступной техники
      let availableEquipment = [];
      try {
        availableEquipment = await Equipment.findAvailableForManager(
          req.user.id, equipment_type, equipment_subtype
        );
      } catch (equipmentError) {
        logger.error('Ошибка поиска доступной техники:', equipmentError);
        throw new BusinessLogicError('Ошибка проверки доступности техники');
      }
      
      if (availableEquipment.length === 0) {
        throw new BusinessLogicError(
          `Нет доступной техники типа "${equipment_type} - ${equipment_subtype}" от партнерских компаний. ` +
          'Обратитесь к администратору для расширения списка партнеров.'
        );
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
      
      logger.info(`📝 Создана новая заявка ${request.id}`, {
        managerId: req.user.id,
        managerName: req.user.name,
        equipmentType: equipment_type,
        equipmentSubtype: equipment_subtype,
        availableOwners: availableEquipment.length
      });
      
      // Отправляем уведомления владельцам техники через Telegram
      try {
        const { notifyNewRequest } = require('../telegram-bot');
        await notifyNewRequest(request.id);
        logger.info(`📱 Telegram уведомления о заявке ${request.id} отправлены`);
      } catch (telegramError) {
        logger.error('Ошибка отправки Telegram уведомлений:', telegramError);
        // Не останавливаем выполнение, если Telegram недоступен
      }
      
      res.status(201).json({
        success: true,
        message: `Заявка создана успешно! Аукцион активен до ${new Date(request.auction_deadline).toLocaleString('ru-RU')}`,
        request: request,
        auction_info: {
          deadline: request.auction_deadline,
          duration_minutes: parseInt(process.env.AUCTION_DURATION_MINUTES) || 5,
          available_owners: availableEquipment.length
        }
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

// GET /api/requests/:id/results - Получить результаты аукциона
router.get('/:id/results', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      throw new ValidationError('Некорректный ID заявки');
    }
    
    const request = await RentalRequest.findById(id);
    
    if (!request) {
      throw new NotFoundError('Заявка не найдена');
    }
    
    // Проверяем права доступа - только админ и создатель заявки
    if (req.user.role !== 'admin' && req.user.id !== request.manager_id) {
      throw new BusinessLogicError('Доступ к результатам аукциона запрещен. Только создатель заявки и администратор могут просматривать результаты.');
    }
    
    // КРИТИЧНО: Автоматически закрываем аукцион если он истек
    const autoCloseResult = await autoCloseExpiredAuction(parseInt(id));
    if (autoCloseResult) {
      logger.info(`✅ Аукцион ${id} был автоматически закрыт при запросе результатов`);
    }
    
    // Получаем актуальную информацию после возможного закрытия
    const updatedRequest = await RentalRequest.findById(id);
    
    // Проверяем, что аукцион завершен (с детальной диагностикой)
    if (updatedRequest.status !== 'auction_closed' && updatedRequest.status !== 'completed') {
      const errorMessage = createResultsErrorMessage(updatedRequest, req.user);
      
      logger.warn(`Попытка доступа к результатам незавершенного аукциона`, {
        requestId: id,
        userId: req.user.id,
        userRole: req.user.role,
        requestStatus: updatedRequest.status,
        auctionDeadline: updatedRequest.auction_deadline,
        isExpired: isAuctionExpired(updatedRequest)
      });
      
      return res.status(400).json({
        success: false,
        message: errorMessage,
        details: {
          current_status: updatedRequest.status,
          auction_deadline: updatedRequest.auction_deadline,
          is_expired: isAuctionExpired(updatedRequest),
          server_time: new Date().toISOString()
        }
      });
    }
    
    // Получаем подробную информацию о победителе
    let winner = null;
    if (updatedRequest.winning_bid_id) {
      try {
        const winningBid = await RentalBid.findById(updatedRequest.winning_bid_id);
        if (winningBid) {
          winner = {
            bid_id: winningBid.id,
            owner_name: winningBid.owner_name,
            owner_phone: winningBid.owner_phone,
            company_name: winningBid.company_name,
            equipment_name: winningBid.equipment_name,
            hourly_rate: winningBid.hourly_rate,
            daily_rate: winningBid.daily_rate,
            total_price: winningBid.total_price,
            comment: winningBid.comment,
            created_at: winningBid.created_at
          };
        }
      } catch (winnerError) {
        logger.error(`Ошибка получения информации о победителе аукциона ${id}:`, winnerError);
      }
    }
    
    // Получаем все ставки для статистики
    let allBids = [];
    let statistics = {
      total_bids: 0,
      min_price: null,
      max_price: null,
      avg_price: null
    };
    
    try {
      allBids = await RentalBid.findByRequestId(id);
      
      if (allBids.length > 0) {
        const prices = allBids.map(b => b.total_price).filter(p => p > 0);
        if (prices.length > 0) {
          statistics = {
            total_bids: allBids.length,
            min_price: Math.min(...prices),
            max_price: Math.max(...prices),
            avg_price: Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length)
          };
        }
      }
    } catch (statsError) {
      logger.error(`Ошибка получения статистики для аукциона ${id}:`, statsError);
    }
    
    logger.info(`📊 Предоставлены результаты аукциона ${id} пользователю ${req.user.id} (${req.user.role})`);
    
    res.json({
      success: true,
      request: {
        id: updatedRequest.id,
        equipment_type: updatedRequest.equipment_type,
        equipment_subtype: updatedRequest.equipment_subtype,
        location: updatedRequest.location,
        start_date: updatedRequest.start_date,
        end_date: updatedRequest.end_date,
        work_description: updatedRequest.work_description,
        budget_range: updatedRequest.budget_range,
        status: updatedRequest.status,
        auction_deadline: updatedRequest.auction_deadline,
        created_at: updatedRequest.created_at
      },
      winner: winner,
      statistics: statistics,
      meta: {
        accessed_by: {
          user_id: req.user.id,
          user_role: req.user.role,
          access_time: new Date().toISOString()
        },
        auction_closed_automatically: !!autoCloseResult
      }
    });
    
  } catch (error) {
    next(error);
  }
});

// POST /api/requests/:id/close-auction - Принудительно закрыть аукцион (только админ)
router.post('/:id/close-auction', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      throw new ValidationError('Некорректный ID заявки');
    }
    
    if (req.user.role !== 'admin') {
      throw new BusinessLogicError('Только администратор может принудительно закрывать аукционы');
    }
    
    const request = await RentalRequest.findById(id);
    
    if (!request) {
      throw new NotFoundError('Заявка не найдена');
    }
    
    if (request.status !== 'auction_active') {
      throw new BusinessLogicError(
        `Аукцион нельзя закрыть. Текущий статус: ${request.status}. ` +
        'Принудительно закрыть можно только активные аукционы.'
      );
    }
    
    logger.info(`🔐 Админ ${req.user.id} принудительно закрывает аукцион ${id}`, {
      adminId: req.user.id,
      adminName: req.user.name,
      requestId: id,
      equipmentType: request.equipment_type
    });
    
    const result = await RentalRequest.closeAuction(id);
    
    const responseMessage = result.winner 
      ? `Аукцион закрыт принудительно. Победитель: ${result.winner.owner_name} с ценой ${result.winner.total_price}₽`
      : 'Аукцион закрыт принудительно. Ставок не было, заявка отменена.';
    
    logger.info(`✅ Аукцион ${id} принудительно закрыт админом`, {
      hasWinner: !!result.winner,
      totalBids: result.bids.length,
      winnerPrice: result.winner?.total_price
    });
    
    res.json({
      success: true,
      message: responseMessage,
      result: {
        winner: result.winner,
        total_bids: result.bids.length,
        closed_by_admin: true,
        closed_at: new Date().toISOString(),
        admin_user: {
          id: req.user.id,
          name: req.user.name
        }
      }
    });
    
  } catch (error) {
    next(error);
  }
});

module.exports = router;
