const database = require('../models/Database');
const NotificationLogger = require('../utils/notificationLogger');

class NotificationService {
  // Создание уведомления
  static async sendNotification(userId, notificationData) {
    const startTime = Date.now();
    
    try {
      NotificationLogger.debug('Создание уведомления начато', { userId, type: notificationData.type });
      
      const { type, title, message } = notificationData;
      
      const sql = `
        INSERT INTO notifications (user_id, type, title, message)
        VALUES (?, ?, ?, ?)
      `;
      
      const result = await database.run(sql, [userId, type, title, message]);
      
      NotificationLogger.logNotificationCreated(userId, notificationData, result.id);
      
      // Отправка через Telegram Bot
      try {
        await this.sendTelegramNotification(userId, { title, message });
        NotificationLogger.logTelegramSent(userId, title, true);
      } catch (telegramError) {
        NotificationLogger.logTelegramSent(userId, title, false, telegramError);
      }
      
      const duration = Date.now() - startTime;
      NotificationLogger.logPerformance('sendNotification', duration, { userId, notificationId: result.id });
      
      return result.id;
      
    } catch (error) {
      NotificationLogger.logNotificationError(userId, notificationData, error);
      throw error;
    }
  }
  
  // Получение уведомлений пользователя
  static async getUserNotifications(userId, limit = 50) {
    const startTime = Date.now();
    
    try {
      NotificationLogger.debug('Получение уведомлений начато', { userId, limit });
      
      const sql = `
        SELECT * FROM notifications 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `;
      
      const notifications = await database.all(sql, [userId, limit]);
      
      NotificationLogger.logNotificationsFetched(userId, notifications.length, { limit });
      
      const duration = Date.now() - startTime;
      NotificationLogger.logPerformance('getUserNotifications', duration, { userId, count: notifications.length });
      
      return notifications;
      
    } catch (error) {
      NotificationLogger.logNotificationError(userId, { operation: 'getUserNotifications' }, error);
      throw error;
    }
  }
  
  // Получение непрочитанных уведомлений
  static async getUnreadNotifications(userId) {
    try {
      const sql = `
        SELECT * FROM notifications 
        WHERE user_id = ? AND read_at IS NULL 
        ORDER BY created_at DESC
      `;
      
      return await database.all(sql, [userId]);
      
    } catch (error) {
      console.error('❌ Ошибка при получении непрочитанных уведомлений:', error);
      throw error;
    }
  }
  
  // Отметка уведомления как прочитанного
  static async markAsRead(notificationId, userId) {
    try {
      const sql = `
        UPDATE notifications 
        SET read_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND user_id = ?
      `;
      
      const result = await database.run(sql, [notificationId, userId]);
      return result.changes > 0;
      
    } catch (error) {
      console.error('❌ Ошибка при отметке уведомления как прочитанного:', error);
      throw error;
    }
  }
  
  // Отметка всех уведомлений как прочитанных
  static async markAllAsRead(userId) {
    try {
      const sql = `
        UPDATE notifications 
        SET read_at = CURRENT_TIMESTAMP 
        WHERE user_id = ? AND read_at IS NULL
      `;
      
      const result = await database.run(sql, [userId]);
      return result.changes;
      
    } catch (error) {
      console.error('❌ Ошибка при отметке всех уведомлений как прочитанных:', error);
      throw error;
    }
  }
  
  // Получение количества непрочитанных уведомлений
  static async getUnreadCount(userId) {
    try {
      const sql = `
        SELECT COUNT(*) as count FROM notifications 
        WHERE user_id = ? AND read_at IS NULL
      `;
      
      const result = await database.get(sql, [userId]);
      return result.count || 0;
      
    } catch (error) {
      console.error('❌ Ошибка при получении количества непрочитанных уведомлений:', error);
      throw error;
    }
  }
  
  // Удаление уведомления
  static async deleteNotification(notificationId, userId) {
    try {
      const sql = `
        DELETE FROM notifications 
        WHERE id = ? AND user_id = ?
      `;
      
      const result = await database.run(sql, [notificationId, userId]);
      return result.changes > 0;
      
    } catch (error) {
      console.error('❌ Ошибка при удалении уведомления:', error);
      throw error;
    }
  }
  
  // Удаление старых уведомлений
  static async cleanupOldNotifications(daysOld = 30) {
    try {
      const sql = `
        DELETE FROM notifications 
        WHERE created_at < datetime('now', '-${daysOld} days')
      `;
      
      const result = await database.run(sql);
      
      if (result.changes > 0) {
        console.log(`🧹 Удалено ${result.changes} старых уведомлений`);
      }
      
      return result.changes;
      
    } catch (error) {
      console.error('❌ Ошибка при очистке старых уведомлений:', error);
      throw error;
    }
  }
  
  // Отправка уведомления через Telegram Bot API
  static async sendTelegramNotification(userId, notification) {
    try {
      // Получаем Telegram ID пользователя
      const userSQL = 'SELECT telegram_id FROM users WHERE id = ?';
      const user = await database.get(userSQL, [userId]);
      
      if (!user || !user.telegram_id) {
        console.log(`⚠️ У пользователя #${userId} не настроен Telegram ID`);
        return false;
      }
      
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        console.error('❌ TELEGRAM_BOT_TOKEN не настроен в .env');
        return false;
      }
      
      // Формируем сообщение для Telegram
      const telegramMessage = `🔔 *${notification.title}*\n\n${notification.message}\n\n_${new Date().toLocaleString('ru-RU')}_`;
      
      // Отправляем через Telegram Bot API
      const axios = require('axios');
      const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      
      const response = await axios.post(telegramApiUrl, {
        chat_id: user.telegram_id,
        text: telegramMessage,
        parse_mode: 'Markdown'
      }, {
        timeout: 10000 // 10 секунд таймаут
      });
      
      if (response.data && response.data.ok) {
        console.log(`✅ [TELEGRAM] Уведомление отправлено пользователю ${user.telegram_id}`);
        console.log(`   📋 ${notification.title}`);
        
        // Обновляем статус отправки
        const updateSQL = `
          UPDATE notifications 
          SET telegram_sent = TRUE 
          WHERE user_id = ? AND telegram_sent = FALSE
          ORDER BY created_at DESC 
          LIMIT 1
        `;
        
        await database.run(updateSQL, [userId]);
        
        return true;
      } else {
        console.error('❌ Ошибка Telegram API:', response.data);
        return false;
      }
      
    } catch (error) {
      if (error.response) {
        console.error('❌ Ошибка при отправке Telegram уведомления:', error.response.data);
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        console.error('❌ Нет подключения к интернету или Telegram API недоступен');
      } else {
        console.error('❌ Ошибка при отправке Telegram уведомления:', error.message);
      }
      return false;
    }
  }
  
  // Массовая отправка уведомлений
  static async sendBulkNotifications(userIds, notificationData) {
    try {
      const results = [];
      
      for (const userId of userIds) {
        try {
          const notificationId = await this.sendNotification(userId, notificationData);
          results.push({ userId, notificationId, success: true });
        } catch (error) {
          results.push({ userId, success: false, error: error.message });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      console.log(`📧 Массовая отправка: ${successCount}/${userIds.length} уведомлений отправлено`);
      
      return results;
      
    } catch (error) {
      console.error('❌ Ошибка при массовой отправке уведомлений:', error);
      throw error;
    }
  }
  
  // Получение статистики уведомлений
  static async getNotificationStats() {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN read_at IS NOT NULL THEN 1 END) as read,
          COUNT(CASE WHEN read_at IS NULL THEN 1 END) as unread,
          COUNT(CASE WHEN telegram_sent = TRUE THEN 1 END) as telegram_sent,
          COUNT(CASE WHEN type = 'new_request' THEN 1 END) as new_requests,
          COUNT(CASE WHEN type = 'bid_accepted' THEN 1 END) as bid_accepted,
          COUNT(CASE WHEN type = 'bid_rejected' THEN 1 END) as bid_rejected,
          COUNT(CASE WHEN type = 'auction_closed' THEN 1 END) as auction_closed
        FROM notifications
        WHERE created_at >= datetime('now', '-30 days')
      `;
      
      return await database.get(sql);
      
    } catch (error) {
      console.error('❌ Ошибка при получении статистики уведомлений:', error);
      throw error;
    }
  }

  // Специализированные методы уведомлений
  
  // Уведомление о новой ставке
  static async notifyNewBid(managerId, requestId, bidderName, totalPrice, equipmentInfo) {
    try {
      return await this.sendNotification(managerId, {
        type: 'new_bid',
        title: '🔔 Новая ставка!',
        message: `Пользователь ${bidderName} подал ставку на заявку "${equipmentInfo}". Общая стоимость: ${totalPrice ? totalPrice.toLocaleString() + ' ₽' : 'не указана'}`
      });
    } catch (error) {
      console.error('❌ Ошибка при отправке уведомления о новой ставке:', error);
      throw error;
    }
  }

  // Уведомление о новой заявке для владельцев
  static async notifyNewRequest(ownerIds, requestData) {
    try {
      const notificationData = {
        type: 'new_request',
        title: '🚜 Новая заявка!',
        message: `Поступила заявка на ${requestData.equipment_type} - ${requestData.equipment_subtype}. Период: ${requestData.start_date} - ${requestData.end_date}. Местоположение: ${requestData.location}`
      };

      return await this.sendBulkNotifications(ownerIds, notificationData);
    } catch (error) {
      console.error('❌ Ошибка при отправке уведомлений о новой заявке:', error);
      throw error;
    }
  }

  // Уведомление о завершении аукциона
  static async notifyAuctionClosed(managerId, requestData, winnerData) {
    try {
      const message = winnerData 
        ? `Аукцион по заявке "${requestData.equipment_type} - ${requestData.equipment_subtype}" завершен. Победитель: ${winnerData.name}. Цена: ${winnerData.price ? winnerData.price.toLocaleString() + ' ₽' : 'не указана'}`
        : `Аукцион по заявке "${requestData.equipment_type} - ${requestData.equipment_subtype}" завершен без победителя.`;

      return await this.sendNotification(managerId, {
        type: 'auction_closed',
        title: '🏆 Аукцион завершен!',
        message
      });
    } catch (error) {
      console.error('❌ Ошибка при отправке уведомления о завершении аукциона:', error);
      throw error;
    }
  }

  // Уведомление о принятии/отклонении ставки
  static async notifyBidStatus(ownerId, requestData, status, reason = null) {
    try {
      const isAccepted = status === 'accepted';
      const title = isAccepted ? '✅ Ставка принята!' : '❌ Ставка отклонена';
      let message = `Ваша ставка на заявку "${requestData.equipment_type} - ${requestData.equipment_subtype}" ${isAccepted ? 'принята' : 'отклонена'}.`;
      
      if (!isAccepted && reason) {
        message += ` Причина: ${reason}`;
      }

      return await this.sendNotification(ownerId, {
        type: isAccepted ? 'bid_accepted' : 'bid_rejected',
        title,
        message
      });
    } catch (error) {
      console.error('❌ Ошибка при отправке уведомления о статусе ставки:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;
