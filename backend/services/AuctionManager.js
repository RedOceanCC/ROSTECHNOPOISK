const RentalRequest = require('../models/RentalRequest');
const NotificationService = require('./NotificationService');
const logger = require('../utils/logger');

class AuctionManager {
  constructor() {
    this.isRunning = false;
    this.checkInterval = 2000; // Проверять каждые 5 секунд для демо-аукционов
    this.intervalId = null;
  }

  // Запуск мониторинга аукционов
  start() {
    if (this.isRunning) {
      logger.warn('AuctionManager уже запущен');
      return;
    }

    this.isRunning = true;
    logger.info('🚀 Запуск AuctionManager для автоматического закрытия аукционов');
    
    // Немедленная проверка при запуске
    this.checkExpiredAuctions();
    
    // Запуск периодической проверки
    this.intervalId = setInterval(() => {
      this.checkExpiredAuctions();
    }, this.checkInterval);
  }

  // Остановка мониторинга
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    logger.info('⏹️ AuctionManager остановлен');
  }

  // Проверка и закрытие истекших аукционов
  async checkExpiredAuctions() {
    try {
      logger.info('🔍 Проверка истекших аукционов...');
      
      const expiredAuctions = await RentalRequest.findExpiredAuctions();
      
      if (expiredAuctions.length === 0) {
        logger.info('✅ Истекших аукционов не найдено');
        return;
      }

      logger.info(`⏰ Найдено ${expiredAuctions.length} истекших аукционов`);

      for (const auction of expiredAuctions) {
        try {
          await this.closeAuction(auction);
        } catch (error) {
          logger.error(`❌ Ошибка закрытия аукциона ${auction.id}:`, error);
        }
      }

    } catch (error) {
      logger.error('❌ Ошибка при проверке истекших аукционов:', error);
    }
  }

  // Закрытие конкретного аукциона
  async closeAuction(auction) {
    logger.info(`🔐 Закрытие аукциона ${auction.id}: ${auction.equipment_type} ${auction.equipment_subtype}`);

    try {
      const result = await RentalRequest.closeAuction(auction.id);
      
      if (result.winner) {
        logger.info(`🏆 Аукцион ${auction.id} закрыт. Победитель: ${result.winner.owner_name}, цена: ${result.winner.total_price}₽`);
        
        // Уведомляем менеджера о результатах
        try {
          await NotificationService.notifyAuctionClosed(
            auction.manager_id,
            {
              equipment_type: auction.equipment_type,
              equipment_subtype: auction.equipment_subtype
            },
            {
              name: result.winner.owner_name,
              price: result.winner.total_price
            }
          );
        } catch (notificationError) {
          logger.error('❌ Ошибка отправки уведомления о закрытии аукциона:', notificationError);
        }

        // Уведомляем победителя
        try {
          await NotificationService.sendNotification(result.winner.owner_id, {
            type: 'bid_won',
            title: '🎉 Вы выиграли аукцион!',
            message: `Поздравляем! Ваша ставка на ${auction.equipment_type} - ${auction.equipment_subtype} выиграла. Стоимость: ${result.winner.total_price}₽. Ожидайте контакта от менеджера.`
          });
        } catch (notificationError) {
          logger.error('❌ Ошибка отправки уведомления победителю:', notificationError);
        }

        // Уведомляем проигравших
        for (const bid of result.bids) {
          if (bid.id !== result.winner.id) {
            try {
              await NotificationService.sendNotification(bid.owner_id, {
                type: 'bid_lost',
                title: '📉 Аукцион завершен',
                message: `Аукцион на ${auction.equipment_type} - ${auction.equipment_subtype} завершен. К сожалению, ваша ставка не прошла. Спасибо за участие!`
              });
            } catch (notificationError) {
              logger.error(`❌ Ошибка отправки уведомления проигравшему ${bid.owner_id}:`, notificationError);
            }
          }
        }

      } else {
        logger.info(`📭 Аукцион ${auction.id} закрыт без ставок`);
        
        // Уведомляем менеджера об отсутствии ставок
        try {
          await NotificationService.sendNotification(auction.manager_id, {
            type: 'auction_no_bids',
            title: '📭 Аукцион завершен без ставок',
            message: `Аукцион на ${auction.equipment_type} - ${auction.equipment_subtype} завершен. К сожалению, ставок не поступило.`
          });
        } catch (notificationError) {
          logger.error('❌ Ошибка отправки уведомления об отсутствии ставок:', notificationError);
        }
      }

      return result;

    } catch (error) {
      logger.error(`❌ Ошибка при закрытии аукциона ${auction.id}:`, error);
      throw error;
    }
  }

  // Получение статистики
  getStats() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      nextCheck: this.intervalId ? Date.now() + this.checkInterval : null
    };
  }
}

// Создаем единственный экземпляр
const auctionManager = new AuctionManager();

module.exports = auctionManager;
