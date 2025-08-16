const RentalRequest = require('../models/RentalRequest');
const RentalBid = require('../models/RentalBid');
const Equipment = require('../models/Equipment');
const User = require('../models/User');
const NotificationService = require('./NotificationService');

class AuctionService {
  // Закрытие просроченных аукционов
  static async closeExpiredAuctions() {
    try {
      const expiredRequests = await RentalRequest.findExpiredAuctions();
      
      if (expiredRequests.length === 0) {
        console.log('✅ Просроченных аукционов не найдено');
        return { closed: 0, results: [] };
      }
      
      console.log(`🔍 Найдено ${expiredRequests.length} просроченных аукционов`);
      
      const results = [];
      
      for (const request of expiredRequests) {
        try {
          console.log(`⏰ Закрываем аукцион #${request.id} (${request.equipment_type})`);
          
          const result = await RentalRequest.closeAuction(request.id);
          
          if (result.winner) {
            console.log(`🏆 Аукцион #${request.id} закрыт. Победитель: ${result.winner.owner_name} (${result.winner.total_price} руб.)`);
            
            // Отправляем уведомления
            await this.sendAuctionClosedNotifications(request, result);
          } else {
            console.log(`❌ Аукцион #${request.id} закрыт без ставок`);
            
            // Уведомляем менеджера об отсутствии ставок
            await NotificationService.sendNotification(request.manager_id, {
              type: 'auction_no_bids',
              title: 'Аукцион завершен без ставок',
              message: `По заявке №${request.id} на ${request.equipment_type} не поступило предложений. Попробуйте создать новую заявку с более привлекательными условиями.`
            });
          }
          
          results.push({
            request_id: request.id,
            success: true,
            winner: result.winner,
            bids_count: result.bids.length
          });
          
        } catch (error) {
          console.error(`❌ Ошибка при закрытии аукциона #${request.id}:`, error.message);
          
          results.push({
            request_id: request.id,
            success: false,
            error: error.message
          });
        }
      }
      
      console.log(`✅ Обработано ${results.length} аукционов`);
      
      return {
        closed: results.length,
        results: results
      };
      
    } catch (error) {
      console.error('❌ Ошибка при закрытии просроченных аукционов:', error);
      throw error;
    }
  }
  
  // Отправка уведомлений о закрытии аукциона
  static async sendAuctionClosedNotifications(request, auctionResult) {
    try {
      const { winner, bids } = auctionResult;
      
      // Уведомляем победителя
      await NotificationService.sendNotification(winner.owner_id, {
        type: 'bid_won',
        title: 'Поздравляем! Ваша ставка выиграла',
        message: `Ваша ставка на заявку №${request.id} (${request.equipment_type}) выиграла аукцион! Сумма: ${winner.total_price.toLocaleString()} руб. Ожидайте звонка от заказчика.`
      });
      
      // Уведомляем менеджера с контактами победителя
      await NotificationService.sendNotification(request.manager_id, {
        type: 'auction_closed',
        title: 'Аукцион завершен',
        message: `Аукцион по заявке №${request.id} завершен.\n\n` +
                `🏆 Победитель: ${winner.owner_name}\n` +
                `📞 Телефон: ${winner.owner_phone}\n` +
                `🚜 Техника: ${winner.equipment_name}\n` +
                `💰 Цена: ${winner.total_price.toLocaleString()} руб.\n\n` +
                `Свяжитесь с владельцем для согласования деталей.`
      });
      
      // Уведомляем проигравших участников
      const losingBids = bids.filter(bid => bid.id !== winner.id);
      
      for (const bid of losingBids) {
        await NotificationService.sendNotification(bid.owner_id, {
          type: 'bid_lost',
          title: 'Ваша ставка не была выбрана',
          message: `К сожалению, ваша ставка на заявку №${request.id} (${request.equipment_type}) не была выбрана. Была выбрана ставка с более выгодной ценой.`
        });
      }
      
    } catch (error) {
      console.error('❌ Ошибка при отправке уведомлений о закрытии аукциона:', error);
    }
  }
  
  // Создание нового аукциона
  static async createAuction(requestData) {
    try {
      // Создаем заявку
      const request = await RentalRequest.create(requestData);
      
      // Находим владельцев подходящей техники
      const eligibleOwners = await Equipment.findOwnersForAuction(
        requestData.manager_id,
        requestData.equipment_type,
        requestData.equipment_subtype
      );
      
      if (eligibleOwners.length === 0) {
        throw new Error('Нет доступной техники от партнерских компаний');
      }
      
      // Отправляем уведомления владельцам
      for (const owner of eligibleOwners) {
        await NotificationService.sendNotification(owner.id, {
          type: 'new_request',
          title: 'Новая заявка на аукцион',
          message: `Новая заявка на аренду ${requestData.equipment_type} (${requestData.equipment_subtype})\n\n` +
                  `📅 Период: ${new Date(requestData.start_date).toLocaleDateString()} - ${new Date(requestData.end_date).toLocaleDateString()}\n` +
                  `📍 Место: ${requestData.location}\n` +
                  `⏰ Дедлайн подачи ставок: ${new Date(request.auction_deadline).toLocaleString()}\n\n` +
                  `Подайте свою ставку в личном кабинете!`
        });
      }
      
      console.log(`🎯 Создан аукцион #${request.id}, уведомлено ${eligibleOwners.length} владельцев`);
      
      return {
        request: request,
        eligible_owners: eligibleOwners.length
      };
      
    } catch (error) {
      console.error('❌ Ошибка при создании аукциона:', error);
      throw error;
    }
  }
  
  // Получение статистики по аукционам
  static async getAuctionStats() {
    try {
      const requestStats = await RentalRequest.getStats();
      const bidStats = await RentalBid.getStats();
      
      return {
        requests: requestStats,
        bids: bidStats,
        conversion_rate: requestStats.total > 0 
          ? ((requestStats.closed_auctions / requestStats.total) * 100).toFixed(2)
          : 0
      };
      
    } catch (error) {
      console.error('❌ Ошибка при получении статистики аукционов:', error);
      throw error;
    }
  }
  
  // Проверка возможности участия в аукционе
  static async canParticipateInAuction(ownerId, requestId) {
    try {
      const request = await RentalRequest.findById(requestId);
      
      if (!request) {
        return { canParticipate: false, reason: 'Заявка не найдена' };
      }
      
      if (request.status !== 'auction_active') {
        return { canParticipate: false, reason: 'Аукцион не активен' };
      }
      
      if (new Date(request.auction_deadline) < new Date()) {
        return { canParticipate: false, reason: 'Время подачи ставок истекло' };
      }
      
      // Проверяем, есть ли у владельца подходящая техника
      const availableEquipment = await Equipment.findAvailableForManager(
        request.manager_id,
        request.equipment_type,
        request.equipment_subtype
      );
      
      const ownerEquipment = availableEquipment.filter(eq => eq.owner_id === ownerId);
      
      if (ownerEquipment.length === 0) {
        return { canParticipate: false, reason: 'У вас нет подходящей техники или нет партнерства с заказчиком' };
      }
      
      // Проверяем, не подавал ли уже ставку
      const existingBids = await RentalBid.findByOwnerId(ownerId);
      const hasBid = existingBids.some(bid => bid.request_id === parseInt(requestId));
      
      if (hasBid) {
        return { canParticipate: false, reason: 'Вы уже подали ставку на этот аукцион' };
      }
      
      return {
        canParticipate: true,
        availableEquipment: ownerEquipment,
        deadline: request.auction_deadline
      };
      
    } catch (error) {
      console.error('❌ Ошибка при проверке возможности участия в аукционе:', error);
      return { canParticipate: false, reason: 'Внутренняя ошибка сервера' };
    }
  }
  
  // Принудительное закрытие аукциона (для админа)
  static async forceCloseAuction(requestId, adminId) {
    try {
      const request = await RentalRequest.findById(requestId);
      
      if (!request) {
        throw new Error('Заявка не найдена');
      }
      
      if (request.status !== 'auction_active') {
        throw new Error('Аукцион не активен');
      }
      
      console.log(`⚡ Принудительное закрытие аукциона #${requestId} администратором #${adminId}`);
      
      const result = await RentalRequest.closeAuction(requestId);
      
      if (result.winner) {
        await this.sendAuctionClosedNotifications(request, result);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Ошибка при принудительном закрытии аукциона:', error);
      throw error;
    }
  }
}

module.exports = AuctionService;
