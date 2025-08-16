#!/usr/bin/env node
/**
 * Скрипт подготовки проекта для продакшена
 * Исправляет все проблемы и создает готовую к деплою версию
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 ПОДГОТОВКА ПРОЕКТА К ПРОДАКШЕНУ...\n');

// Создаем папку для продакшена
const productionDir = './production-ready';
if (fs.existsSync(productionDir)) {
  console.log('🗑️  Удаляем старую папку production-ready...');
  fs.rmSync(productionDir, { recursive: true, force: true });
}

console.log('📁 Создаем папку production-ready...');
fs.mkdirSync(productionDir, { recursive: true });

// Список файлов для копирования
const filesToCopy = [
  'index.html',
  'app.js', 
  'style.css',
  'notifications.js',
  'validation.js',
  'frontend-server.js',
  'Special_Equipment_Catalog.csv'
];

// Копируем основные файлы
console.log('📋 Копируем основные файлы...');
filesToCopy.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join(productionDir, file));
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - не найден`);
  }
});

// Копируем backend папку
console.log('\n📂 Копируем backend...');
const backendSource = './backend';
const backendDest = path.join(productionDir, 'backend');

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      // Пропускаем node_modules и logs
      if (entry.name === 'node_modules' || entry.name === 'logs') {
        continue;
      }
      copyDirectory(srcPath, destPath);
    } else {
      // Пропускаем package-lock.json
      if (entry.name === 'package-lock.json') {
        continue;
      }
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDirectory(backendSource, backendDest);

// Исправляем импорты bcrypt на bcryptjs
console.log('\n🔧 Исправляем импорты bcrypt -> bcryptjs...');

function fixBcryptImports(filePath) {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Заменяем require('bcrypt') на require('bcryptjs')
    content = content.replace(/require\(['"]bcrypt['"]\)/g, "require('bcryptjs')");
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Исправлен: ${filePath}`);
      return true;
    }
  }
  return false;
}

const filesToFix = [
  path.join(backendDest, 'database/init.js'),
  path.join(backendDest, 'models/User.js')
];

filesToFix.forEach(file => {
  fixBcryptImports(file);
});

// Копируем production конфигурации
console.log('\n⚙️  Копируем production конфигурации...');

// Корневой package.json
fs.copyFileSync('./production-package.json', path.join(productionDir, 'package.json'));
console.log('✅ package.json');

// Backend package.json
fs.copyFileSync('./backend-production-package.json', path.join(backendDest, 'package.json'));
console.log('✅ backend/package.json');

// Production environment file
fs.copyFileSync('./.env.production', path.join(backendDest, '.env.production'));
console.log('✅ backend/.env.production');

// Создаем PM2 конфигурацию
console.log('\n🔄 Создаем PM2 конфигурацию...');
const pm2Config = {
  apps: [
    {
      name: 'rostechnopolsk-backend',
      script: './backend/server.js',
      cwd: '/path/to/your/project',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true
    },
    {
      name: 'rostechnopolsk-frontend',
      script: './frontend-server.js',
      cwd: '/path/to/your/project',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '200M',
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true
    }
  ]
};

fs.writeFileSync(
  path.join(productionDir, 'ecosystem.config.js'),
  `module.exports = ${JSON.stringify(pm2Config, null, 2)};`
);
console.log('✅ ecosystem.config.js');

// Создаем nginx конфигурацию
console.log('\n🌐 Создаем Nginx конфигурацию...');
const nginxConfig = `server {
    listen 80;
    server_name xn--e1aggkdcahelgf4b.xn--p1ai ростехнопоиск.рф;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Статические файлы
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}`;

fs.writeFileSync(path.join(productionDir, 'nginx.conf'), nginxConfig);
console.log('✅ nginx.conf');

// Создаем README для продакшена
console.log('\n📄 Создаем инструкции...');
const readmeContent = `# РОСТЕХНОПОИСК - PRODUCTION READY

Эта папка содержит готовую к деплою версию проекта.

## 🚀 БЫСТРЫЙ ДЕПЛОЙ

1. Загрузите эту папку на сервер
2. Выполните команды из DEPLOY-GUIDE.md
3. Настройте Nginx (nginx.conf)
4. Запустите через PM2 (ecosystem.config.js)

## ✅ ИСПРАВЛЕНИЯ

- ✅ Заменен bcrypt на bcryptjs
- ✅ Удалены тестовые зависимости
- ✅ Настроены production конфигурации
- ✅ Созданы PM2 и Nginx конфигурации

## 📁 СТРУКТУРА

\`\`\`
production-ready/
├── index.html              # Frontend
├── app.js                  # Frontend логика
├── style.css               # Стили
├── notifications.js        # Уведомления
├── validation.js           # Валидация
├── frontend-server.js      # Frontend сервер
├── package.json            # Корневые зависимости
├── ecosystem.config.js     # PM2 конфигурация
├── nginx.conf              # Nginx конфигурация
├── Special_Equipment_Catalog.csv
└── backend/                # Backend
    ├── package.json        # Backend зависимости (с bcryptjs)
    ├── config.env          # Production конфигурация
    ├── server.js           # Главный сервер
    └── ... (все остальные файлы)
\`\`\`

## 🔐 БЕЗОПАСНОСТЬ

⚠️  **ОБЯЗАТЕЛЬНО ИЗМЕНИТЕ:**
- \`SESSION_SECRET\` в \`backend/config.env\`
- Домен в \`nginx.conf\`
- Пути в \`ecosystem.config.js\`
`;

fs.writeFileSync(path.join(productionDir, 'README.md'), readmeContent);
console.log('✅ README.md');

console.log('\n🎉 ПОДГОТОВКА ЗАВЕРШЕНА!');
console.log('\n📂 Готовая версия находится в папке: production-ready/');
console.log('📖 Следуйте инструкциям в DEPLOY-GUIDE.md');
