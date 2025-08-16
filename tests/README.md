# 🧪 Автотесты системы РОСТЕХНОПОИСК

Полное тестовое покрытие всех компонентов системы аренды спецтехники.

## 📋 Структура тестов

```
tests/
├── backend/               # Backend тесты
│   ├── models/           # Тесты моделей данных
│   │   ├── Database.test.js
│   │   ├── User.test.js
│   │   ├── Company.test.js
│   │   ├── Equipment.test.js
│   │   ├── RentalRequest.test.js
│   │   └── RentalBid.test.js
│   ├── routes/           # Тесты API маршрутов
│   │   ├── auth.test.js
│   │   ├── companies.test.js
│   │   ├── users.test.js
│   │   ├── equipment.test.js
│   │   ├── requests.test.js
│   │   └── bids.test.js
│   ├── middleware/       # Тесты middleware
│   │   ├── auth.test.js
│   │   ├── logging.test.js
│   │   └── validation.test.js
│   └── services/         # Тесты сервисов
│       ├── AuctionService.test.js
│       └── NotificationService.test.js
├── frontend/             # Frontend тесты
│   ├── notifications/    # Тесты системы уведомлений
│   │   ├── NotificationCenter.test.js
│   │   └── NotificationManager.test.js
│   ├── timers/          # Тесты таймеров
│   │   ├── AuctionTimer.test.js
│   │   └── RealTimeUpdater.test.js
│   └── ui/              # UI компоненты
│       ├── dashboard.test.js
│       ├── forms.test.js
│       └── modals.test.js
├── e2e/                 # End-to-End тесты
│   ├── auction-flow.test.js
│   ├── user-management.test.js
│   └── company-partnerships.test.js
├── config/              # Конфигурация тестов
│   ├── jest.setup.js
│   ├── setup-test-db.js
│   └── test-helpers.js
└── run-all-tests.js     # Скрипт запуска всех тестов
```

## 🚀 Быстрый старт

### Установка зависимостей

```bash
npm install
```

### Запуск всех тестов

```bash
npm test
```

### Запуск конкретных групп тестов

```bash
# Backend тесты
npm run test:backend

# Frontend тесты  
npm run test:frontend

# E2E тесты
npm run test:e2e

# Тесты моделей
npm run test:models

# Тесты API
npm run test:routes

# UI тесты
npm run test:ui
```

### Покрытие кода

```bash
npm run test:coverage
```

### Отслеживание изменений

```bash
npm run test:watch
```

## 📊 Типы тестов

### 🔧 Backend тесты

#### Модели данных
- **Database.test.js** - Тесты подключения и работы с SQLite
- **User.test.js** - Создание, аутентификация, управление пользователями
- **Company.test.js** - CRUD операции с компаниями и партнерствами
- **Equipment.test.js** - Управление техникой владельцев
- **RentalRequest.test.js** - Логика заявок и аукционов
- **RentalBid.test.js** - Система ставок и скрытого аукциона

#### API маршруты
- **auth.test.js** - Аутентификация и авторизация
- **companies.test.js** - API управления компаниями
- **users.test.js** - CRUD пользователей
- **equipment.test.js** - API техники
- **requests.test.js** - API заявок
- **bids.test.js** - API ставок

#### Middleware
- **auth.test.js** - Проверка ролей и доступа
- **logging.test.js** - Логирование запросов
- **validation.test.js** - Валидация данных

#### Сервисы
- **AuctionService.test.js** - Бизнес-логика аукционов
- **NotificationService.test.js** - Telegram уведомления

### 🎨 Frontend тесты

#### Система уведомлений
- **NotificationCenter.test.js** - Центр уведомлений, фильтрация, отметка прочитанными
- **NotificationManager.test.js** - Toast уведомления, автоскрытие

#### Таймеры и автообновление
- **AuctionTimer.test.js** - Таймеры обратного отсчета, форматирование времени
- **RealTimeUpdater.test.js** - Автообновление данных в реальном времени

#### UI компоненты
- **dashboard.test.js** - Навигация по дашбордам
- **forms.test.js** - Валидация форм, отправка данных
- **modals.test.js** - Модальные окна, взаимодействие

### 🎭 E2E тесты

#### Пользовательские сценарии
- **auction-flow.test.js** - Полный цикл: заявка → ставка → аукцион
- **user-management.test.js** - Создание пользователей, назначение ролей
- **company-partnerships.test.js** - Управление партнерствами

## 🛠️ Конфигурация

### Jest конфигурация

```javascript
{
  "projects": [
    {
      "displayName": "backend",
      "testMatch": ["<rootDir>/tests/backend/**/*.test.js"],
      "testEnvironment": "node"
    },
    {
      "displayName": "frontend", 
      "testMatch": ["<rootDir>/tests/frontend/**/*.test.js"],
      "testEnvironment": "jsdom"
    },
    {
      "displayName": "e2e",
      "testMatch": ["<rootDir>/tests/e2e/**/*.test.js"],
      "testEnvironment": "node"
    }
  ]
}
```

### Тестовая база данных

Автоматически создается изолированная SQLite база для каждого тестового запуска:

```bash
npm run setup:test-db
```

### Моки и помощники

**test-helpers.js** предоставляет:
- `TestDatabase` - Класс для работы с тестовой БД
- `createMockReq/Res` - Моки Express запросов/ответов  
- `TestDataGenerator` - Генератор тестовых данных
- `AsyncTestUtils` - Утилиты для async тестов
- `DOMTestUtils` - Помощники для DOM тестов

## 📈 Покрытие кода

Цели покрытия:
- **Statements**: 90%+
- **Branches**: 85%+  
- **Functions**: 95%+
- **Lines**: 90%+

Отчет генерируется в папку `coverage/`:

```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## 🔍 Детали тестирования

### Backend тестирование

1. **Изоляция** - Каждый тест использует свежую тестовую БД
2. **Моки** - Все внешние зависимости замокированы
3. **Валидация** - Проверка данных на входе/выходе
4. **Безопасность** - Тесты SQL-инъекций, XSS, CSRF
5. **Производительность** - Проверка времени выполнения запросов

### Frontend тестирование

1. **DOM манипуляции** - Тестирование взаимодействий с DOM
2. **События** - Симуляция кликов, ввода, form submit
3. **Асинхронность** - Тестирование AJAX, таймеров, промисов
4. **Состояние** - Проверка изменений состояния компонентов
5. **Адаптивность** - Тесты на разных разрешениях экрана

### E2E тестирование

1. **Реальный браузер** - Puppeteer для автоматизации Chrome
2. **Пользовательские сценарии** - Полные workflow от входа до результата
3. **Кроссбраузерность** - Тестирование в разных браузерах
4. **Производительность** - Измерение времени загрузки и отклика
5. **Ошибки** - Тестирование обработки сетевых ошибок

## 🚨 Отладка тестов

### Запуск отдельного теста

```bash
npm test -- --testNamePattern="должен создать пользователя"
```

### Отладка в режиме watch

```bash
npm run test:watch -- --testPathPattern="User.test"
```

### Verbose вывод

```bash
npm test -- --verbose
```

### Отладка E2E тестов

```bash
# Запуск с видимым браузером
HEADLESS=false npm run test:e2e

# Замедленное выполнение
SLOWMO=250 npm run test:e2e
```

## 🎯 Лучшие практики

### Именование тестов

```javascript
describe('User Model', () => {
  test('должен создать нового пользователя с валидными данными', () => {
    // ...
  });
  
  test('должен отклонить создание с невалидным email', () => {
    // ...
  });
});
```

### Структура теста

```javascript
test('описание того что должно произойти', async () => {
  // Arrange - подготовка данных
  const userData = TestDataGenerator.user();
  
  // Act - выполнение действия
  const result = await User.create(userData);
  
  // Assert - проверка результата
  expect(result.success).toBe(true);
  expect(result.id).toBeDefined();
});
```

### Очистка после тестов

```javascript
afterEach(async () => {
  await testDb.clearAll();
  jest.clearAllMocks();
});
```

## 📝 Отчетность

Автоматическая генерация отчетов:

- **test-report.json** - JSON отчет с результатами
- **coverage/** - HTML отчет покрытия кода
- **Console output** - Цветной вывод в терминал

## 🔧 CI/CD интеграция

Для GitHub Actions:

```yaml
- name: Run tests
  run: |
    npm install
    npm run test:coverage
    
- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## 🆘 Поиск и устранение неисправностей

### Тесты падают локально

1. Убедитесь что тестовая БД создана: `npm run setup:test-db`
2. Очистите node_modules: `rm -rf node_modules && npm install`
3. Проверьте что нет конфликтующих процессов на портах

### E2E тесты не запускаются

1. Установите Puppeteer: `npm install puppeteer`
2. Для Linux: установите зависимости Chrome
3. Проверьте что приложение запущено на правильном порту

### Медленные тесты

1. Используйте `test.concurrent` для параллельного выполнения
2. Оптимизируйте database cleanup
3. Увеличьте timeout для медленных операций

---

**💡 Совет**: Запускайте тесты перед каждым коммитом и следите за покрытием кода!
