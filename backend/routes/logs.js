const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Endpoint для получения клиентских логов
router.post('/client', (req, res) => {
  try {
    const { level, message, context, timestamp } = req.body;
    
    // Логируем клиентские сообщения
    const clientMessage = `[CLIENT] ${message}`;
    const clientContext = {
      ...context,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      timestamp: timestamp || new Date().toISOString()
    };
    
    // Выбираем уровень логирования
    switch (level) {
      case 'error':
        logger.error(clientMessage, clientContext);
        break;
      case 'warn':
        logger.warn(clientMessage, clientContext);
        break;
      case 'debug':
        logger.debug(clientMessage, clientContext);
        break;
      default:
        logger.info(clientMessage, clientContext);
    }
    
    res.json({ success: true, message: 'Log recorded' });
  } catch (error) {
    logger.error('Ошибка записи клиентского лога', { error: error.message });
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;