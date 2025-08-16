const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const User = require('../models/User');
const TelegramHelper = require('../utils/telegramHelper');
const database = require('../models/Database');

// Установка Telegram ID для пользователя
router.post('/link', requireAuth, async (req, res) => {
  try {
    const { telegram_id } = req.body;
    const userId = req.session.user.id;
    
    if (!telegram_id) {
      return res.status(400).json({
        error: 'Telegram ID обязателен'
      });
    }
    
    // Проверяем валидность Telegram ID
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({
        error: 'Telegram Bot не настроен на сервере'
      });
    }
    
    const chatCheck = await TelegramHelper.getChatInfo(botToken, telegram_id);
    if (!chatCheck.valid) {
      return res.status(400).json({
        error: 'Неверный Telegram ID или бот не может отправить сообщение в этот чат',
        details: chatCheck.error
      });
    }
    
    // Проверяем, не используется ли уже этот Telegram ID
    const existingUser = await User.findByTelegramId(telegram_id);
    if (existingUser && existingUser.id !== userId) {
      return res.status(400).json({
        error: 'Этот Telegram ID уже привязан к другому пользователю'
      });
    }
    
    // Привязываем Telegram ID
    await User.linkTelegram(userId, telegram_id);
    
    // Отправляем тестовое сообщение
    const testMessage = await TelegramHelper.sendTestMessage(botToken, telegram_id);
    
    console.log(`✅ Пользователь #${userId} привязал Telegram ID: ${telegram_id}`);
    
    res.json({
      success: true,
      message: 'Telegram ID успешно привязан',
      test_message_sent: testMessage.success,
      chat_info: chatCheck.chatInfo
    });
    
  } catch (error) {
    console.error('❌ Ошибка привязки Telegram ID:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера',
      details: error.message
    });
  }
});

// Отвязка Telegram ID
router.delete('/unlink', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    await User.linkTelegram(userId, null);
    
    console.log(`🔓 Пользователь #${userId} отвязал Telegram ID`);
    
    res.json({
      success: true,
      message: 'Telegram ID успешно отвязан'
    });
    
  } catch (error) {
    console.error('❌ Ошибка отвязки Telegram ID:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера',
      details: error.message
    });
  }
});

// Проверка статуса Telegram Bot
router.get('/bot-status', requireAuth, async (req, res) => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      return res.json({
        configured: false,
        error: 'TELEGRAM_BOT_TOKEN не настроен'
      });
    }
    
    const validation = await TelegramHelper.validateBotToken(botToken);
    
    res.json({
      configured: true,
      valid: validation.valid,
      bot_info: validation.botInfo,
      error: validation.error
    });
    
  } catch (error) {
    console.error('❌ Ошибка проверки бота:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера',
      details: error.message
    });
  }
});

// Отправка тестового уведомления
router.post('/test-notification', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    // Получаем данные пользователя
    const user = await User.findById(userId);
    if (!user || !user.telegram_id) {
      return res.status(400).json({
        error: 'У вас не настроен Telegram ID'
      });
    }
    
    const NotificationService = require('../services/NotificationService');
    
    const success = await NotificationService.sendNotification(userId, {
      type: 'test',
      title: 'Тестовое уведомление',
      message: `Привет, ${user.name}! Это тестовое уведомление из системы РОСТЕХНОПОИСК.\n\nВаши уведомления настроены корректно! 🎉`
    });
    
    res.json({
      success: success,
      message: success ? 'Тестовое уведомление отправлено' : 'Не удалось отправить уведомление'
    });
    
  } catch (error) {
    console.error('❌ Ошибка отправки тестового уведомления:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера',
      details: error.message
    });
  }
});

// Webhook для обработки команд бота (будущая функциональность)
router.post('/webhook', async (req, res) => {
  try {
    // TODO: Обработка входящих сообщений от пользователей
    // Например, команды /start, /help, /requests и т.д.
    
    console.log('📥 Webhook от Telegram:', req.body);
    
    res.json({ ok: true });
    
  } catch (error) {
    console.error('❌ Ошибка обработки webhook:', error);
    res.status(500).json({ error: 'Webhook error' });
  }
});

module.exports = router;
