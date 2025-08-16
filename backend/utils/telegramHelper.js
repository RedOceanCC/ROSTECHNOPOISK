const axios = require('axios');

class TelegramHelper {
  
  // Проверка валидности Telegram Bot токена
  static async validateBotToken(token) {
    try {
      const response = await axios.get(`https://api.telegram.org/bot${token}/getMe`, {
        timeout: 5000
      });
      
      if (response.data && response.data.ok) {
        console.log(`✅ Telegram Bot валиден: @${response.data.result.username}`);
        return {
          valid: true,
          botInfo: response.data.result
        };
      } else {
        console.error('❌ Невалидный Telegram Bot токен');
        return { valid: false, error: 'Invalid token' };
      }
      
    } catch (error) {
      console.error('❌ Ошибка проверки Telegram Bot:', error.message);
      return { valid: false, error: error.message };
    }
  }
  
  // Получение информации о чате (проверка telegram_id)
  static async getChatInfo(botToken, chatId) {
    try {
      const response = await axios.get(`https://api.telegram.org/bot${botToken}/getChat`, {
        params: { chat_id: chatId },
        timeout: 5000
      });
      
      if (response.data && response.data.ok) {
        return {
          valid: true,
          chatInfo: response.data.result
        };
      } else {
        return { valid: false, error: 'Chat not found' };
      }
      
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
  
  // Отправка приветственного сообщения для проверки
  static async sendTestMessage(botToken, chatId) {
    try {
      const message = `🤖 *Тест РОСТЕХНОПОИСК бота*\n\nВаш Telegram ID успешно привязан к системе!\n\nВы будете получать уведомления о:\n• Новых аукционах\n• Результатах торгов\n• Обновлениях заявок\n\n_${new Date().toLocaleString('ru-RU')}_`;
      
      const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      }, {
        timeout: 10000
      });
      
      if (response.data && response.data.ok) {
        console.log(`✅ Тестовое сообщение отправлено в чат ${chatId}`);
        return { success: true, messageId: response.data.result.message_id };
      } else {
        console.error('❌ Ошибка отправки тестового сообщения:', response.data);
        return { success: false, error: response.data };
      }
      
    } catch (error) {
      console.error('❌ Ошибка отправки тестового сообщения:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  // Форматирование сообщения для Telegram
  static formatNotificationMessage(notification) {
    const { type, title, message } = notification;
    
    let emoji = '🔔';
    switch (type) {
      case 'new_request':
        emoji = '📋';
        break;
      case 'bid_won':
        emoji = '🏆';
        break;
      case 'bid_lost':
        emoji = '😔';
        break;
      case 'auction_closed':
        emoji = '✅';
        break;
      case 'auction_no_bids':
        emoji = '❌';
        break;
    }
    
    return `${emoji} *${title}*\n\n${message}\n\n_${new Date().toLocaleString('ru-RU')}_`;
  }
}

module.exports = TelegramHelper;
