#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;

// MIME типы для статических файлов
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
  console.log(`${new Date().toLocaleTimeString()} - ${req.method} ${req.url}`);
  
  const parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname;
  
  // Если запрос к корню, отдаем index.html
  if (pathname === '/') {
    pathname = '/index.html';
  }
  
  // Формируем путь к файлу
  const filePath = path.join(__dirname, pathname);
  
  // Проверяем существование файла
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // Файл не найден
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html');
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>404 - Файл не найден</title>
          <meta charset="utf-8">
        </head>
        <body>
          <h1>404 - Файл не найден</h1>
          <p>Запрашиваемый файл <code>${pathname}</code> не существует.</p>
          <p><a href="/">Вернуться на главную</a></p>
        </body>
        </html>
      `);
      return;
    }
    
    // Определяем MIME тип
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    // Читаем и отдаем файл
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Ошибка сервера при чтении файла');
        return;
      }
      
      res.statusCode = 200;
      res.setHeader('Content-Type', contentType);
      
      // Добавляем заголовки кэширования для статических ресурсов
      if (ext !== '.html') {
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 год
      } else {
        res.setHeader('Cache-Control', 'no-cache'); // HTML не кэшируем
      }
      
      res.end(data);
    });
  });
});

server.listen(PORT, () => {
  console.log('🌐 Фронтенд сервер РОСТЕХНОПОИСК запущен!');
  console.log(`📂 Корневая папка: ${__dirname}`);
  console.log(`🔗 Адрес: http://localhost:${PORT}`);
  console.log(`📋 Файлы для доступа:`);
  console.log(`   • http://localhost:${PORT}/ (index.html)`);
  console.log(`   • http://localhost:${PORT}/test.html`);
  console.log(`   • http://localhost:${PORT}/app.js`);
  console.log(`   • http://localhost:${PORT}/style.css`);
  console.log('\n🚀 Для остановки нажмите Ctrl+C');
  console.log('🎯 Убедитесь, что бэкенд запущен на порту 3001\n');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Порт ${PORT} уже используется!`);
    console.error('Попробуйте:');
    console.error('1. Закрыть другие веб-серверы');
    console.error('2. Использовать другой порт: PORT=3002 node frontend-server.js');
    process.exit(1);
  } else {
    console.error('❌ Ошибка сервера:', err);
    process.exit(1);
  }
});

// Корректное завершение при Ctrl+C
process.on('SIGINT', () => {
  console.log('\n👋 Остановка фронтенд сервера...');
  server.close(() => {
    console.log('✅ Сервер остановлен');
    process.exit(0);
  });
});
