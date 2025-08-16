// Загрузка конфигурации в зависимости от среды
const envFile = process.env.NODE_ENV === 'production' 
  ? './production-config.env'  // Для продакшена используем production-config.env
  : process.env.NODE_ENV === 'development'
    ? './config.env'          // Для разработки используем config.env  
    : `./.env.${process.env.NODE_ENV || 'local'}`;  // Для остальных стандартные .env файлы

require('dotenv').config({ path: envFile });

// Отладочная информация для продакшена
if (process.env.NODE_ENV === 'production') {
  console.log('🔧 Продакшн режим:');
  console.log(`   ENV файл: ${envFile}`);
  console.log(`   DB_PATH: ${process.env.DB_PATH}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
}

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

// Импорт Telegram бота
let TelegramWebApp = null;
let telegramBot = null;
if (process.env.TELEGRAM_BOT_TOKEN) {
  TelegramWebApp = require('./telegram-bot');
}

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
    secure: false, // Временно отключаем secure для диагностики
    httpOnly: false, // Временно отключаем httpOnly
    maxAge: 24 * 60 * 60 * 1000, // 24 часа
    sameSite: 'lax', // Более мягкий режим
    domain: process.env.NODE_ENV === 'production' ? '.xn--e1aggkdcahelgf4b.xn--p1ai' : undefined
  },
  name: 'rostechnopoisk.sid' // Уникальное имя сессии
}));

// Отладочное middleware для cookies
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.url.startsWith('/api/')) {
    logger.debug('Request debug', {
      url: req.url,
      method: req.method,
      cookies: req.headers.cookie,
      sessionId: req.sessionID,
      hasSession: !!req.session,
      hasUser: !!(req.session && req.session.user)
    });
  }
  next();
});

// Подробное логирование запросов
app.use(requestLogger);
app.use(logRequest);

// Статические файлы (для фронтенда)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
}

// Статические файлы для Telegram WebApp
const telegramWebappPath = path.join(__dirname, '../telegram-webapp');
console.log(`📱 Telegram WebApp путь: ${telegramWebappPath}`);

// Проверяем существование директории
const fs = require('fs');
if (fs.existsSync(telegramWebappPath)) {
  console.log('✅ Директория telegram-webapp найдена');
  
  // Проверяем файл request.html
  const requestHtmlPath = path.join(telegramWebappPath, 'request.html');
  if (fs.existsSync(requestHtmlPath)) {
    console.log('✅ Файл request.html найден');
  } else {
    console.log('❌ Файл request.html НЕ найден в:', requestHtmlPath);
  }
} else {
  console.log('❌ Директория telegram-webapp НЕ найдена:', telegramWebappPath);
  console.log('🔍 Попробуем альтернативные пути...');
  
  // Проверяем альтернативные пути
  const altPaths = [
    path.join(__dirname, '../../telegram-webapp'),  // На уровень выше
    '/root/ROSTECHNOPOISK/telegram-webapp',         // Абсолютный путь
    './telegram-webapp'                             // Относительно текущей директории
  ];
  
  for (const altPath of altPaths) {
    console.log(`🔍 Проверяем: ${altPath}`);
    if (fs.existsSync(altPath)) {
      console.log(`✅ Найдена директория: ${altPath}`);
      app.use('/telegram', express.static(altPath));
      return;
    }
  }
  
  console.log('❌ Директория telegram-webapp не найдена ни по одному из путей');
}

app.use('/telegram', express.static(telegramWebappPath));

// API роуты
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/notifications', require('./routes/notifications'));
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

// Отладочный роут для проверки Telegram WebApp
app.get('/telegram/debug', (req, res) => {
  const fs = require('fs');
  const paths = [
    path.join(__dirname, '../telegram-webapp'),
    path.join(__dirname, '../../telegram-webapp'),
    '/root/ROSTECHNOPOISK/telegram-webapp',
    './telegram-webapp'
  ];
  
  const debugInfo = {
    currentDir: __dirname,
    paths: {},
    files: {}
  };
  
  paths.forEach(testPath => {
    debugInfo.paths[testPath] = fs.existsSync(testPath);
    if (fs.existsSync(testPath)) {
      try {
        debugInfo.files[testPath] = fs.readdirSync(testPath);
      } catch (error) {
        debugInfo.files[testPath] = `Error: ${error.message}`;
      }
    }
  });
  
  res.json(debugInfo);
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
    
    // Инициализируем Telegram бота если токен установлен
    if (process.env.TELEGRAM_BOT_TOKEN && TelegramWebApp) {
      telegramBot = new TelegramWebApp();
      
      // Добавляем роуты Telegram WebApp
      TelegramWebApp.setupRoutes(app);
      
      logger.info('Telegram бот инициализирован');
      console.log('🤖 Telegram бот запущен');
    } else {
      logger.warn('TELEGRAM_BOT_TOKEN не установлен, бот не запущен');
      console.log('⚠️  TELEGRAM_BOT_TOKEN не установлен, бот не запущен');
    }
    
    // Запускаем сервер
    app.listen(PORT, () => {
      logger.info(`Сервер РОСТЕХНОПОИСК запущен на порту ${PORT}`, {
        port: PORT,
        mode: process.env.NODE_ENV || 'development',
        apiUrl: `http://localhost:${PORT}/api`,
        database: process.env.DB_PATH || path.join(__dirname, 'database/rostechnopolsk.db'),
        telegramBot: !!telegramBot
      });
      
      console.log(`🚀 Сервер РОСТЕХНОПОИСК запущен на порту ${PORT}`);
      console.log(`📊 Режим: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API доступно по адресу: http://localhost:${PORT}/api`);
      console.log(`💾 База данных: ${process.env.DB_PATH || path.join(__dirname, 'database/rostechnopolsk.db')}`);
      
      if (telegramBot) {
        console.log(`🤖 Telegram WebApp: http://localhost:${PORT}/telegram/`);
      }
      
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
