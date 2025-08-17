const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const path = require('path');
const Database = require('./models/Database');
const Equipment = require('./models/Equipment');
const RentalRequest = require('./models/RentalRequest');
const RentalBid = require('./models/RentalBid');
const NotificationService = require('./services/NotificationService');
const { requireTelegramAuth } = require('./middleware/auth');

class TelegramWebApp {
  constructor() {
    this.bot = null;
    this.app = express();
    this.initializeBot();
    this.setupWebApp();
  }

  initializeBot() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.error('TELEGRAM_BOT_TOKEN не установлен в переменных окружения');
      return;
    }

    try {
      this.bot = new TelegramBot(token, { 
        polling: {
          interval: 2000,    // Увеличиваем интервал polling
          autoStart: true,
          params: {
            timeout: 10
          }
        }
      });
      
      // Обработка ошибок polling
      this.bot.on('polling_error', (error) => {
        if (error.code === 'ETELEGRAM' && error.message.includes('409 Conflict')) {
          console.log('⚠️  Обнаружен конфликт множественных экземпляров бота - останавливаем polling');
          this.bot.stopPolling();
          
          // Пытаемся перезапустить через 30 секунд
          setTimeout(() => {
            console.log('🔄 Пытаемся перезапустить бота...');
            try {
              this.bot.startPolling();
            } catch (restartError) {
              console.error('❌ Не удалось перезапустить бота:', restartError.message);
            }
          }, 30000);
        } else {
          console.error('❌ Ошибка Telegram бота:', error.message);
        }
      });
      
      this.setupBotHandlers();
      console.log('✅ Telegram бот инициализирован с обработкой конфликтов');
    } catch (error) {
      console.error('❌ Критическая ошибка инициализации бота:', error.message);
    }
  }

  setupBotHandlers() {
    // Команда /start
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      
      try {
        // Проверяем, есть ли пользователь в системе
        const user = await this.findUserByTelegramId(userId);
        
        if (user) {
          await this.bot.sendMessage(chatId, 
            `Добро пожаловать в РОСТЕХНОПОИСК, ${user.name}!\n\n` +
            `Вы будете получать уведомления о новых заявках на вашу технику.\n\n` +
            `Используйте /menu для просмотра доступных команд.`
          );
        } else {
          await this.bot.sendMessage(chatId, 
            `Добро пожаловать в РОСТЕХНОПОИСК!\n\n` +
            `Ваш Telegram ID: ${userId}\n\n` +
            `Для получения уведомлений о заявках на технику, обратитесь к администратору для добавления этого ID к вашей технике в системе.`
          );
        }
      } catch (error) {
        console.error('Ошибка при обработке /start:', error);
        await this.bot.sendMessage(chatId, 'Произошла ошибка. Попробуйте позже.');
      }
    });

    // Команда /menu
    this.bot.onText(/\/menu/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      
      try {
        const user = await this.findUserByTelegramId(userId);
        
        if (!user) {
          await this.bot.sendMessage(chatId, 
            'Вы не зарегистрированы в системе. Обратитесь к администратору.'
          );
          return;
        }

        const keyboard = {
          inline_keyboard: [
            [{ text: '📋 Мои заявки', callback_data: 'my_requests' }],
            [{ text: '🚜 Моя техника', callback_data: 'my_equipment' }],
            [{ text: '📊 Активные аукционы', callback_data: 'active_auctions' }],
            [{ text: 'ℹ️ Помощь', callback_data: 'help' }]
          ]
        };

        await this.bot.sendMessage(chatId, 
          'Выберите действие:', 
          { reply_markup: keyboard }
        );
      } catch (error) {
        console.error('Ошибка при обработке /menu:', error);
        await this.bot.sendMessage(chatId, 'Произошла ошибка. Попробуйте позже.');
      }
    });

    // Обработка callback запросов
    this.bot.on('callback_query', async (callbackQuery) => {
      const msg = callbackQuery.message;
      const chatId = msg.chat.id;
      const userId = callbackQuery.from.id;
      const data = callbackQuery.data;

      try {
        await this.handleCallbackQuery(chatId, userId, data);
        await this.bot.answerCallbackQuery(callbackQuery.id);
      } catch (error) {
        console.error('Ошибка при обработке callback:', error);
        await this.bot.answerCallbackQuery(callbackQuery.id, { text: 'Произошла ошибка' });
      }
    });
  }

  async handleCallbackQuery(chatId, userId, data) {
    const user = await this.findUserByTelegramId(userId);
    
    if (!user) {
      await this.bot.sendMessage(chatId, 
        'Вы не зарегистрированы в системе. Обратитесь к администратору.'
      );
      return;
    }

    switch (data) {
      case 'my_requests':
        await this.showMyRequests(chatId, user.id);
        break;
      case 'my_equipment':
        await this.showMyEquipment(chatId, user.id);
        break;
      case 'active_auctions':
        await this.showActiveAuctions(chatId, user.id);
        break;
      case 'help':
        await this.showHelp(chatId);
        break;
      default:
        if (data.startsWith('bid_')) {
          await this.handleBidAction(chatId, userId, data);
        } else if (data.startsWith('decline_')) {
          await this.handleDeclineAction(chatId, userId, data);
        } else if (data.startsWith('decline_reason_')) {
          await this.handleDeclineReason(chatId, userId, data);
        }
    }
  }

  async showMyRequests(chatId, userId) {
    try {
      const bids = await RentalBid.findByOwnerId(userId);
      
      if (bids.length === 0) {
        await this.bot.sendMessage(chatId, 'У вас пока нет поданных заявок.');
        return;
      }

      let message = '📋 Ваши заявки:\n\n';
      
      for (const bid of bids.slice(0, 10)) { // Показываем последние 10
        const statusEmoji = {
          'pending': '⏳',
          'accepted': '✅',
          'rejected': '❌',
          'expired': '⏰'
        };

        message += `${statusEmoji[bid.status] || '❓'} *${bid.equipment_type} ${bid.subtype}*\n`;
        message += `Заявка: ${bid.work_description.substring(0, 50)}...\n`;
        message += `Цена: ${bid.total_price} руб.\n`;
        message += `Статус: ${this.getStatusText(bid.status)}\n\n`;
      }

      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Ошибка при показе заявок:', error);
      await this.bot.sendMessage(chatId, 'Ошибка при загрузке заявок.');
    }
  }

  async showMyEquipment(chatId, userId) {
    try {
      const equipment = await Equipment.findByOwnerId(userId);
      
      if (equipment.length === 0) {
        await this.bot.sendMessage(chatId, 'У вас пока нет зарегистрированной техники.');
        return;
      }

      let message = '🚜 Ваша техника:\n\n';
      
      for (const item of equipment.slice(0, 10)) {
        const statusEmoji = {
          'available': '✅',
          'busy': '🔄',
          'maintenance': '🔧'
        };

        message += `${statusEmoji[item.status] || '❓'} *${item.name}*\n`;
        message += `Тип: ${item.type} - ${item.subtype}\n`;
        message += `Цена: ${item.hourly_rate}₽/час, ${item.daily_rate}₽/день\n`;
        message += `Статус: ${this.getEquipmentStatusText(item.status)}\n\n`;
      }

      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Ошибка при показе техники:', error);
      await this.bot.sendMessage(chatId, 'Ошибка при загрузке техники.');
    }
  }

  async showActiveAuctions(chatId, userId) {
    try {
      const activeRequests = await RentalRequest.findActiveForOwner(userId);
      
      if (activeRequests.length === 0) {
        await this.bot.sendMessage(chatId, 'Нет активных аукционов для вашей техники.');
        return;
      }

      let message = '📊 Активные аукционы:\n\n';
      
      for (const request of activeRequests.slice(0, 5)) {
        const deadline = new Date(request.auction_deadline);
        const timeLeft = this.getTimeLeft(deadline);
        
        message += `🎯 *${request.equipment_type} ${request.equipment_subtype}*\n`;
        message += `📍 ${request.location}\n`;
        message += `📅 ${request.start_date} - ${request.end_date}\n`;
        message += `⏰ До завершения: ${timeLeft}\n`;
        message += `💰 Бюджет: ${request.budget_range || 'Не указан'}\n`;
        
        if (request.has_bid) {
          message += `✅ Вы уже подали заявку\n\n`;
        } else {
          message += `❌ Заявка не подана\n\n`;
        }
      }

      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Ошибка при показе аукционов:', error);
      await this.bot.sendMessage(chatId, 'Ошибка при загрузке аукционов.');
    }
  }

  async showHelp(chatId) {
    const helpText = `
ℹ️ *Помощь по РОСТЕХНОПОИСК боту*

*Основные команды:*
/start - Запуск бота
/menu - Главное меню

*Возможности:*
• Получение уведомлений о новых заявках
• Подача ставок через веб-приложение
• Просмотр статуса ваших заявок
• Управление техникой

*Веб-приложение:*
При получении уведомления о новой заявке, вы можете:
• Открыть веб-приложение
• Указать цену
• Принять или отклонить заявку

*Поддержка:* @admin_username
    `;

    await this.bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
  }

  async handleDeclineAction(chatId, userId, data) {
    try {
      const requestId = data.split('_')[1];
      
      const keyboard = {
        inline_keyboard: [
          [{ text: 'Не подходящие условия', callback_data: `decline_reason_${requestId}_conditions` }],
          [{ text: 'Техника занята', callback_data: `decline_reason_${requestId}_busy` }],
          [{ text: 'Низкая цена', callback_data: `decline_reason_${requestId}_price` }],
          [{ text: 'Другое', callback_data: `decline_reason_${requestId}_other` }]
        ]
      };

      await this.bot.sendMessage(chatId, 
        'Укажите причину отклонения заявки:', 
        { reply_markup: keyboard }
      );
    } catch (error) {
      console.error('Ошибка при обработке отклонения:', error);
      await this.bot.sendMessage(chatId, 'Произошла ошибка при отклонении заявки.');
    }
  }

  async handleDeclineReason(chatId, userId, data) {
    try {
      const parts = data.split('_');
      const requestId = parts[2];
      const reason = parts[3];
      
      const reasonTexts = {
        'conditions': 'Не подходящие условия работы',
        'busy': 'Техника уже занята на этот период',
        'price': 'Предложенная цена не подходит',
        'other': 'Другие причины'
      };

      // Логируем отклонение в базе данных (можно создать отдельную таблицу)
      console.log(`Заявка ${requestId} отклонена пользователем ${userId}. Причина: ${reasonTexts[reason]}`);
      
      await this.bot.sendMessage(chatId, 
        `✅ Заявка отклонена.\n\nПричина: ${reasonTexts[reason]}\n\nСпасибо за ответ!`
      );
    } catch (error) {
      console.error('Ошибка при обработке причины отклонения:', error);
      await this.bot.sendMessage(chatId, 'Произошла ошибка.');
    }
  }

  setupWebApp() {
    // Не создаем отдельный сервер, используем главный app
    console.log('Telegram WebApp интегрирован в основной сервер');
  }

  // Метод для настройки роутов на главном сервере
  static setupRoutes(app) {
    // API для получения данных заявки
    app.get('/api/telegram/request/:requestId', requireTelegramAuth, async (req, res) => {
      try {
        const { requestId } = req.params;
        const user = req.user;

        const request = await RentalRequest.findById(requestId);
        if (!request) {
          return res.status(404).json({ 
            success: false,
            error: 'Заявка не найдена' 
          });
        }

        // Проверяем статус аукциона
        if (request.status !== 'auction_active') {
          return res.status(400).json({ 
            success: false,
            error: 'Аукцион неактивен' 
          });
        }

        // Проверяем дедлайн аукциона
        if (new Date(request.auction_deadline) < new Date()) {
          return res.status(400).json({ 
            success: false,
            error: 'Время подачи заявок истекло' 
          });
        }

        // Проверяем партнерские отношения
        const Database = require('./models/Database');
        const partnershipSQL = `
          SELECT cp.id
          FROM company_partnerships cp
          JOIN users u_manager ON cp.manager_company_id = u_manager.company_id
          JOIN users u_owner ON cp.owner_company_id = u_owner.company_id
          WHERE u_manager.id = ? AND u_owner.id = ? AND cp.status = 'active'
        `;
        
        const partnership = await Database.get(partnershipSQL, [request.manager_id, user.id]);
        if (!partnership) {
          return res.status(403).json({ 
            success: false,
            error: 'Нет партнерских отношений с компанией заказчика' 
          });
        }

        // Проверяем подходящую технику
        const equipment = await Equipment.findByOwnerId(user.id);
        const suitableEquipment = equipment.filter(eq => 
          eq.type === request.equipment_type && 
          eq.subtype === request.equipment_subtype &&
          eq.status === 'available'
        );

        if (suitableEquipment.length === 0) {
          return res.status(403).json({ 
            success: false,
            error: 'У вас нет подходящей доступной техники данного типа' 
          });
        }

        // Проверяем существующие ставки
        const existingBids = await RentalBid.findByOwnerId(user.id);
        const hasExistingBid = existingBids.some(bid => bid.request_id == requestId);

        res.json({
          success: true,
          request,
          equipment: suitableEquipment,
          hasExistingBid,
          user
        });
      } catch (error) {
        console.error('Ошибка при получении данных заявки:', error);
        res.status(500).json({ 
          success: false,
          error: 'Внутренняя ошибка сервера' 
        });
      }
    });

    // API для подачи ставки
    app.post('/api/telegram/bid', requireTelegramAuth, async (req, res) => {
      try {
        const { requestId, equipmentId, hourlyRate, dailyRate, totalPrice, comment } = req.body;
        const user = req.user;

        // Валидация входных данных
        if (!requestId || !equipmentId || !hourlyRate || !dailyRate || !totalPrice) {
          return res.status(400).json({
            success: false,
            error: 'Отсутствуют обязательные поля'
          });
        }

        if (totalPrice <= 0 || hourlyRate <= 0 || dailyRate <= 0) {
          return res.status(400).json({
            success: false,
            error: 'Цены должны быть положительными'
          });
        }

        // Проверяем заявку перед созданием ставки
        const request = await RentalRequest.findById(requestId);
        if (!request) {
          return res.status(404).json({
            success: false,
            error: 'Заявка не найдена'
          });
        }

        if (request.status !== 'auction_active') {
          return res.status(400).json({
            success: false,
            error: 'Аукцион неактивен'
          });
        }

        // Проверяем принадлежность техники
        const equipment = await Equipment.findById(equipmentId);
        if (!equipment || equipment.owner_id !== user.id) {
          return res.status(403).json({
            success: false,
            error: 'Техника не принадлежит пользователю'
          });
        }

        if (equipment.status !== 'available') {
          return res.status(400).json({
            success: false,
            error: 'Техника недоступна'
          });
        }

        // Создаем ставку
        const bid = await RentalBid.create({
          request_id: requestId,
          owner_id: user.id,
          equipment_id: equipmentId,
          hourly_rate: hourlyRate,
          daily_rate: dailyRate,
          total_price: totalPrice,
          comment: comment || ''
        });

        // Отправляем уведомление менеджеру
        try {
          await NotificationService.notifyNewBid(
            request.manager_id, 
            requestId, 
            user.name, 
            totalPrice, 
            `${request.equipment_type} - ${request.equipment_subtype}`
          );
        } catch (notificationError) {
          console.error('Ошибка отправки уведомления:', notificationError);
          // Не прерываем выполнение, если уведомление не отправилось
        }

        res.json({ 
          success: true, 
          bid,
          message: 'Ставка успешно подана! Ожидайте результатов аукциона.'
        });
      } catch (error) {
        console.error('Ошибка при подаче ставки:', error);
        
        let statusCode = 500;
        let userMessage = 'Внутренняя ошибка сервера';
        
        // Обработка специфических ошибок
        if (error.name === 'BusinessLogicError') {
          statusCode = 409;
          userMessage = error.message;
        } else if (error.name === 'NotFoundError') {
          statusCode = 404;
          userMessage = error.message;
        } else if (error.name === 'ValidationError') {
          statusCode = 400;
          userMessage = error.message;
        }
        
        res.status(statusCode).json({ 
          success: false,
          error: userMessage 
        });
      }
    });

    // API для отклонения заявки
    app.post('/api/telegram/decline', requireTelegramAuth, async (req, res) => {
      try {
        const { requestId, reason } = req.body;
        const user = req.user;

        if (!requestId) {
          return res.status(400).json({
            success: false,
            error: 'Не указан ID заявки'
          });
        }

        // Проверяем существование заявки
        const request = await RentalRequest.findById(requestId);
        if (!request) {
          return res.status(404).json({
            success: false,
            error: 'Заявка не найдена'
          });
        }

        // Сохраняем отклонение в базу данных (если таблица существует)
        const Database = require('./models/Database');
        try {
          const declineSQL = `
            INSERT INTO request_declines (request_id, owner_id, reason, created_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          `;
          await Database.run(declineSQL, [requestId, user.id, reason || 'Не указана']);
        } catch (dbError) {
          // Если таблица не существует или другая ошибка БД, логируем в консоль
          console.log(`Пользователь ${user.name} (ID: ${user.id}) отклонил заявку ${requestId}. Причина: ${reason || 'Не указана'}`);
          if (dbError.code !== 'SQLITE_ERROR') {
            console.error('Неожиданная ошибка БД при сохранении отклонения:', dbError);
          }
        }

        res.json({ 
          success: true,
          message: 'Заявка отклонена'
        });
      } catch (error) {
        console.error('Ошибка при отклонении заявки:', error);
        res.status(500).json({ 
          success: false,
          error: 'Внутренняя ошибка сервера' 
        });
      }
    });
  }

  // Отправка уведомления о новой заявке
  async notifyNewRequest(requestId) {
    try {
      const request = await RentalRequest.findById(requestId);
      if (!request) return;

      // Находим технику подходящего типа с указанным telegram_id
      const sql = `
        SELECT DISTINCT e.telegram_id, e.owner_id, e.name as equipment_name,
               u.name as owner_name
        FROM equipment e
        JOIN users u ON e.owner_id = u.id
        JOIN companies c ON u.company_id = c.id
        JOIN company_partnerships cp ON c.id = cp.owner_company_id
        JOIN users m ON m.company_id = cp.manager_company_id
        WHERE m.id = ? 
          AND e.type = ? 
          AND e.subtype = ?
          AND e.status = 'available'
          AND e.telegram_id IS NOT NULL
          AND e.telegram_id != ''
          AND u.role = 'owner'
          AND u.status = 'active'
          AND c.status = 'active'
          AND cp.status = 'active'
      `;

      const equipmentList = await Database.all(sql, [
        request.manager_id, 
        request.equipment_type, 
        request.equipment_subtype
      ]);

      for (const equipment of equipmentList) {
        const webAppUrl = `${process.env.WEB_APP_URL || 'http://localhost:3001'}/telegram/request.html?requestId=${requestId}&equipmentId=${equipment.owner_id}&telegramId=${equipment.telegram_id}`;
        
        const keyboard = {
          inline_keyboard: [[
            { 
              text: '📝 Подать заявку', 
              web_app: { url: webAppUrl }
            },
            { 
              text: '❌ Отклонить', 
              callback_data: `decline_${requestId}`
            }
          ]]
        };

        const message = `
🆕 *Новая заявка на вашу технику!*

🚜 *Техника:* ${equipment.equipment_name}
🏷️ *Тип:* ${request.equipment_type} - ${request.equipment_subtype}
📍 *Место работы:* ${request.location}
📅 *Период:* ${request.start_date} - ${request.end_date}
📋 *Описание:* ${request.work_description}
💰 *Бюджет:* ${request.budget_range || 'Не указан'}

⏰ *Время на подачу заявки:* до ${new Date(request.auction_deadline).toLocaleString('ru-RU')}

Нажмите "Подать заявку" чтобы указать цену или "Отклонить" если не можете участвовать.
        `;

        try {
          await this.bot.sendMessage(equipment.telegram_id, message, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
          });
          console.log(`Уведомление отправлено владельцу техники ${equipment.equipment_name} (${equipment.telegram_id})`);
        } catch (sendError) {
          console.error(`Ошибка отправки сообщения в Telegram ID ${equipment.telegram_id}:`, sendError.message);
        }
      }

      console.log(`Отправлено ${equipmentList.length} уведомлений по заявке ${requestId}`);
    } catch (error) {
      console.error('Ошибка при отправке уведомлений:', error);
    }
  }

  // Вспомогательные методы
  async findUserByTelegramId(telegramId) {
    return await TelegramWebApp.findUserByTelegramId(telegramId);
  }

  // Статический метод для поиска пользователя
  static async findUserByTelegramId(telegramId) {
    try {
      const sql = 'SELECT * FROM users WHERE telegram_id = ? AND status = "active"';
      return await Database.get(sql, [telegramId.toString()]);
    } catch (error) {
      console.error('Ошибка при поиске пользователя по Telegram ID:', error);
      return null;
    }
  }

  getStatusText(status) {
    const statusTexts = {
      'pending': 'Ожидание',
      'accepted': 'Принята',
      'rejected': 'Отклонена',
      'expired': 'Истекла'
    };
    return statusTexts[status] || status;
  }

  getEquipmentStatusText(status) {
    const statusTexts = {
      'available': 'Доступна',
      'busy': 'Занята',
      'maintenance': 'На обслуживании'
    };
    return statusTexts[status] || status;
  }

  getTimeLeft(deadline) {
    const now = new Date();
    const diff = deadline - now;
    
    if (diff <= 0) return 'Завершен';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}ч ${minutes}м`;
  }
}

// Глобальная переменная для доступа к экземпляру бота
let botInstance = null;

// Функция для получения экземпляра бота
function getBotInstance() {
  return botInstance;
}

// Функция для уведомления о новой заявке (статический метод)
async function notifyNewRequest(requestId) {
  if (botInstance) {
    return await botInstance.notifyNewRequest(requestId);
  }
  console.warn('Telegram бот не инициализирован');
}

// Модифицируем конструктор для сохранения экземпляра
const originalConstructor = TelegramWebApp;
function TelegramWebAppWithInstance() {
  const instance = new originalConstructor();
  botInstance = instance;
  return instance;
}

// Копируем статические методы
Object.setPrototypeOf(TelegramWebAppWithInstance, originalConstructor);
Object.setPrototypeOf(TelegramWebAppWithInstance.prototype, originalConstructor.prototype);

module.exports = TelegramWebAppWithInstance;
module.exports.getBotInstance = getBotInstance;
module.exports.notifyNewRequest = notifyNewRequest;
