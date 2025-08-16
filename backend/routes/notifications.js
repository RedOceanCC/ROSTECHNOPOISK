const express = require('express');
const router = express.Router();
const NotificationService = require('../services/NotificationService');
const { requireAuth } = require('../middleware/auth');
const logger = require('../utils/logger');
const NotificationLogger = require('../utils/notificationLogger');

// Применяем авторизацию ко всем роутам
router.use(requireAuth);

// GET /api/notifications - Получить уведомления текущего пользователя
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    
    NotificationLogger.logApiRequest('GET', '/api/notifications', userId, { limit });
    
    const notifications = await NotificationService.getUserNotifications(userId, limit);
    
    logger.debug('Получены уведомления пользователя', {
      user_id: userId,
      user_name: req.user.name,
      notifications_count: notifications.length
    });
    
    NotificationLogger.logApiRequest('GET', '/api/notifications', userId, { limit }, 200);
    
    res.json({
      success: true,
      notifications: notifications
    });
    
  } catch (error) {
    NotificationLogger.logApiRequest('GET', '/api/notifications', req.user?.id, { limit }, 500);
    logger.error('Ошибка получения уведомлений', {
      user_id: req.user.id,
      error: error.message
    });
    next(error);
  }
});

// GET /api/notifications/unread - Получить непрочитанные уведомления
router.get('/unread', async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const notifications = await NotificationService.getUnreadNotifications(userId);
    
    logger.debug('Получены непрочитанные уведомления', {
      user_id: userId,
      user_name: req.user.name,
      unread_count: notifications.length
    });
    
    res.json({
      success: true,
      notifications: notifications,
      count: notifications.length
    });
    
  } catch (error) {
    logger.error('Ошибка получения непрочитанных уведомлений', {
      user_id: req.user.id,
      error: error.message
    });
    next(error);
  }
});

// GET /api/notifications/count - Получить количество непрочитанных уведомлений
router.get('/count', async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const count = await NotificationService.getUnreadCount(userId);
    
    res.json({
      success: true,
      count: count
    });
    
  } catch (error) {
    logger.error('Ошибка получения счетчика уведомлений', {
      user_id: req.user.id,
      error: error.message
    });
    next(error);
  }
});

// POST /api/notifications/:id/read - Отметить уведомление как прочитанное
router.post('/:id/read', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const success = await NotificationService.markAsRead(id, userId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Уведомление не найдено или не принадлежит пользователю'
      });
    }
    
    logger.info('Уведомление отмечено как прочитанное', {
      notification_id: id,
      user_id: userId,
      user_name: req.user.name
    });
    
    res.json({
      success: true,
      message: 'Уведомление отмечено как прочитанное'
    });
    
  } catch (error) {
    logger.error('Ошибка отметки уведомления как прочитанного', {
      notification_id: req.params.id,
      user_id: req.user.id,
      error: error.message
    });
    next(error);
  }
});

// POST /api/notifications/read-all - Отметить все уведомления как прочитанные
router.post('/read-all', async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const updatedCount = await NotificationService.markAllAsRead(userId);
    
    logger.info('Все уведомления отмечены как прочитанные', {
      user_id: userId,
      user_name: req.user.name,
      updated_count: updatedCount
    });
    
    res.json({
      success: true,
      message: `Отмечено ${updatedCount} уведомлений как прочитанные`,
      updated_count: updatedCount
    });
    
  } catch (error) {
    logger.error('Ошибка отметки всех уведомлений как прочитанных', {
      user_id: req.user.id,
      error: error.message
    });
    next(error);
  }
});

// DELETE /api/notifications/:id - Удалить уведомление
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const success = await NotificationService.deleteNotification(id, userId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Уведомление не найдено или не принадлежит пользователю'
      });
    }
    
    logger.info('Уведомление удалено', {
      notification_id: id,
      user_id: userId,
      user_name: req.user.name
    });
    
    res.json({
      success: true,
      message: 'Уведомление удалено'
    });
    
  } catch (error) {
    logger.error('Ошибка удаления уведомления', {
      notification_id: req.params.id,
      user_id: req.user.id,
      error: error.message
    });
    next(error);
  }
});

// POST /api/notifications/test - Создать тестовое уведомление (для отладки)
router.post('/test', async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const notificationId = await NotificationService.sendNotification(userId, {
      type: 'system',
      title: 'Тестовое уведомление',
      message: `Привет, ${req.user.name}! Это тестовое уведомление системы РОСТЕХНОПОИСК. Время: ${new Date().toLocaleString('ru-RU')}`
    });
    
    logger.info('Создано тестовое уведомление', {
      notification_id: notificationId,
      user_id: userId,
      user_name: req.user.name
    });
    
    res.json({
      success: true,
      message: 'Тестовое уведомление создано',
      notification_id: notificationId
    });
    
  } catch (error) {
    logger.error('Ошибка создания тестового уведомления', {
      user_id: req.user.id,
      error: error.message
    });
    next(error);
  }
});

module.exports = router;
