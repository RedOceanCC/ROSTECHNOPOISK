const logger = require('./logger');

class NotificationLogger {
  // Логирование создания уведомления
  static logNotificationCreated(userId, notificationData, notificationId) {
    logger.info('📧 Уведомление создано', {
      userId,
      notificationId,
      type: notificationData.type,
      title: notificationData.title,
      messageLength: notificationData.message?.length || 0,
      timestamp: new Date().toISOString()
    });
  }

  // Логирование ошибки при создании уведомления
  static logNotificationError(userId, notificationData, error) {
    logger.error('❌ Ошибка создания уведомления', {
      userId,
      type: notificationData.type,
      title: notificationData.title,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }

  // Логирование получения уведомлений
  static logNotificationsFetched(userId, count, filters = {}) {
    logger.info('📥 Уведомления загружены', {
      userId,
      count,
      filters,
      timestamp: new Date().toISOString()
    });
  }

  // Логирование отметки как прочитанное
  static logNotificationRead(userId, notificationId) {
    logger.info('👁️ Уведомление прочитано', {
      userId,
      notificationId,
      timestamp: new Date().toISOString()
    });
  }

  // Логирование массовой отметки как прочитанные
  static logAllNotificationsRead(userId, count) {
    logger.info('👁️ Все уведомления прочитаны', {
      userId,
      count,
      timestamp: new Date().toISOString()
    });
  }

  // Логирование Telegram отправки
  static logTelegramSent(userId, title, success = true, error = null) {
    if (success) {
      logger.info('📱 Telegram уведомление отправлено', {
        userId,
        title,
        timestamp: new Date().toISOString()
      });
    } else {
      logger.warn('📱 Ошибка отправки Telegram', {
        userId,
        title,
        error: error?.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Логирование системных событий уведомлений
  static logSystemEvent(event, data = {}) {
    logger.info(`🔔 Системное событие: ${event}`, {
      event,
      data,
      timestamp: new Date().toISOString()
    });
  }

  // Логирование API запросов к уведомлениям
  static logApiRequest(method, endpoint, userId, params = {}, responseStatus = null) {
    const logData = {
      method,
      endpoint,
      userId,
      params,
      timestamp: new Date().toISOString()
    };

    if (responseStatus !== null) {
      logData.responseStatus = responseStatus;
    }

    if (responseStatus >= 400) {
      logger.warn('🌐 API запрос уведомлений (ошибка)', logData);
    } else {
      logger.info('🌐 API запрос уведомлений', logData);
    }
  }

  // Логирование производительности
  static logPerformance(operation, duration, additionalData = {}) {
    logger.info(`⚡ Производительность: ${operation}`, {
      operation,
      duration: `${duration}ms`,
      ...additionalData,
      timestamp: new Date().toISOString()
    });
  }

  // Логирование состояния системы уведомлений
  static logSystemHealth(stats) {
    logger.info('💊 Здоровье системы уведомлений', {
      totalNotifications: stats.total,
      unreadNotifications: stats.unread,
      usersWithNotifications: stats.activeUsers,
      avgNotificationsPerUser: stats.avgPerUser,
      timestamp: new Date().toISOString()
    });
  }

  // Логирование debug информации (только в development)
  static debug(message, data = {}) {
    if (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'debug') {
      logger.debug(`🐛 DEBUG: ${message}`, {
        ...data,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = NotificationLogger;
