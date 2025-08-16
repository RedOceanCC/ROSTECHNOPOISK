require('dotenv').config({
  path: `./.env.${process.env.NODE_ENV || 'local'}`
});

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');

// Импорт моделей и middleware
const database = require('./models/Database');
const { errorHandler, logRequest } = require('./middleware/auth');

// Импорт утилит и логирования
const logger = require('./utils/logger');
const { requestLogger, errorLogger } = require('./middleware/logging');
const { runMigrations } = require('./database/migrate');

// Импорт роутов
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const companyRoutes = require('./routes/companies');
const equipmentRoutes = require('./routes/equipment');
const requestRoutes = require('./routes/requests');
const bidRoutes = require('./routes/bids');
const telegramRoutes = require('./routes/telegram');
const logRoutes = require('./routes/logs');

// Импорт сервисов
const AuctionService = require('./services/AuctionService');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://xn--e1aggkdcahelgf4b.xn--p1ai',
        'https://ростехнопоиск.рф',
        'http://xn--e1aggkdcahelgf4b.xn--p1ai',
        'http://ростехнопоиск.рф'
      ] 
    : [
        'http://localhost:3000', 
        'http://127.0.0.1:5500', 
        'http://localhost:5500',
        'http://localhost:8080',
        'null' // Для file:// протокола
      ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Настройка сессий
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-super-secret-session-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production' && process.env.HTTPS === 'true', // HTTPS только если SSL настроен
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 часа
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // Для CORS в продакшене
  },
  name: 'rostechnopoisk.sid' // Уникальное имя сессии
}));

// Подробное логирование запросов
app.use(requestLogger);
app.use(logRequest);

// Статические файлы (для фронтенда)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
}

// API роуты
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/logs', logRoutes);


// Роут для проверки здоровья сервера
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Сервер РОСТЕХНОПОИСК работает',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Обслуживание фронтенда в продакшене
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
  });
}

// Обработка 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Маршрут не найден'
  });
});

// Обработка ошибок с подробным логированием
app.use(errorLogger);
app.use(errorHandler);

// Cron задача для закрытия просроченных аукционов
// Запускается каждые 10 минут
cron.schedule('*/10 * * * *', async () => {
  try {
    logger.info('Запуск проверки просроченных аукционов');
    await AuctionService.closeExpiredAuctions();
  } catch (error) {
    logger.error('Ошибка при закрытии просроченных аукционов', { error: error.message, stack: error.stack });
  }
});

// Запуск сервера
async function startServer() {
  try {
    // Подключаемся к базе данных
    await database.connect();
    
    // Автоматически запускаем миграции
    logger.info('Запуск автоматических миграций...');
    await runMigrations();
    logger.info('Миграции выполнены успешно');
    
    // Запускаем сервер
    app.listen(PORT, () => {
      logger.info(`Сервер РОСТЕХНОПОИСК запущен на порту ${PORT}`, {
        port: PORT,
        mode: process.env.NODE_ENV || 'development',
        apiUrl: `http://localhost:${PORT}/api`,
        database: process.env.DB_PATH || path.join(__dirname, 'database/rostechnopolsk.db')
      });
      
      console.log(`🚀 Сервер РОСТЕХНОПОИСК запущен на порту ${PORT}`);
      console.log(`📊 Режим: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API доступно по адресу: http://localhost:${PORT}/api`);
      console.log(`💾 База данных: ${process.env.DB_PATH || path.join(__dirname, 'database/rostechnopolsk.db')}`);
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`\n🎯 Демо пароли для входа:`);
        console.log(`   Админ: admin123`);
        console.log(`   Владелец: owner123`);
        console.log(`   Менеджер: manager123`);
      }
    });
    
  } catch (error) {
    logger.error('Критическая ошибка запуска сервера', { error: error.message, stack: error.stack });
    console.error('❌ Критическая ошибка запуска сервера:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Получен сигнал SIGINT, инициация корректного завершения работы');
  console.log('\n🛑 Получен сигнал SIGINT, завершение работы...');
  
  try {
    await database.close();
    logger.info('База данных корректно отключена');
    console.log('✅ База данных отключена');
    process.exit(0);
  } catch (error) {
    logger.error('Ошибка при завершении работы', { error: error.message, stack: error.stack });
    console.error('❌ Ошибка при завершении работы:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Получен сигнал SIGTERM, завершение работы...');
  
  try {
    await database.close();
    console.log('✅ База данных отключена');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при завершении работы:', error);
    process.exit(1);
  }
});

// Обработка необработанных ошибок
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Необработанное отклонение промиса:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Необработанное исключение:', error);
  process.exit(1);
});

// Запускаем сервер
startServer();
