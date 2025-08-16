const logger = require('./utils/logger');

console.log('🧪 ТЕСТ СИСТЕМЫ ЛОГИРОВАНИЯ\n');

// Тестируем разные уровни логирования
logger.debug('Это debug сообщение', { test: 'debug_data' });
logger.info('Это info сообщение', { test: 'info_data' });
logger.warn('Это warning сообщение', { test: 'warning_data' });
logger.error('Это error сообщение', { test: 'error_data' });

console.log('\n✅ Логирование протестировано');
console.log('📁 Проверьте файлы в папке backend/logs/');
console.log('🔍 Для мониторинга в реальном времени используйте:');
console.log('   tail -f backend/logs/app.log');
console.log('   или');
console.log('   pm2 logs rostechnopolsk-backend');
