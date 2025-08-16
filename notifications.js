// Система уведомлений для пользователя
class NotificationManager {
  constructor() {
    this.notifications = [];
    this.maxNotifications = 5;
    this.defaultDuration = 4000; // 4 секунды
    this.container = null;
    this.init();
  }

  // Инициализация контейнера для уведомлений
  init() {
    // Создаем контейнер только один раз
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'notifications-container';
      this.container.className = 'notifications-container';
      
      // Добавляем стили если их нет
      if (!document.getElementById('notifications-styles')) {
        this.addStyles();
      }
      
      document.body.appendChild(this.container);
    }
  }

  // Добавляем CSS стили для тостов
  addStyles() {
    const style = document.createElement('style');
    style.id = 'notifications-styles';
    style.textContent = `
      .notifications-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        pointer-events: none;
        max-width: 400px;
      }

      .toast {
        background: white;
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        border-left: 4px solid #007bff;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        pointer-events: auto;
        position: relative;
        overflow: hidden;
        max-width: 100%;
      }

      .toast.show {
        opacity: 1;
        transform: translateX(0);
      }

      .toast.success {
        border-left-color: #28a745;
      }

      .toast.error {
        border-left-color: #dc3545;
      }

      .toast.warning {
        border-left-color: #ffc107;
      }

      .toast.info {
        border-left-color: #17a2b8;
      }

      .toast-icon {
        font-size: 18px;
        line-height: 1;
        flex-shrink: 0;
        margin-top: 2px;
      }

      .toast-content {
        flex: 1;
        min-width: 0;
      }

      .toast-title {
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 4px;
        color: #333;
      }

      .toast-message {
        font-size: 13px;
        color: #666;
        line-height: 1.4;
        word-wrap: break-word;
      }

      .toast-close {
        background: none;
        border: none;
        font-size: 16px;
        color: #999;
        cursor: pointer;
        padding: 0;
        margin-left: 8px;
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s;
      }

      .toast-close:hover {
        background: rgba(0,0,0,0.1);
        color: #333;
      }

      .toast-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: currentColor;
        opacity: 0.3;
        transition: width linear;
        border-bottom-left-radius: 8px;
        border-bottom-right-radius: 8px;
      }

      @media (max-width: 480px) {
        .notifications-container {
          top: 10px;
          right: 10px;
          left: 10px;
          max-width: none;
        }
        
        .toast {
          margin-bottom: 6px;
        }
      }

      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @keyframes slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Показать уведомление
  show(message, type = 'info', duration = null) {
    this.init(); // Убеждаемся что контейнер создан
    
    const actualDuration = duration || this.defaultDuration;
    const toast = this.createToast(message, type, actualDuration);
    
    // Добавляем в контейнер
    this.container.appendChild(toast);
    
    // Ограничиваем количество уведомлений
    this.notifications.push(toast);
    if (this.notifications.length > this.maxNotifications) {
      this.hide(this.notifications[0]);
    }
    
    // Анимация появления
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });
    
    // Автоматическое скрытие
    if (actualDuration > 0) {
      setTimeout(() => {
        this.hide(toast);
      }, actualDuration);
    }
    
    return toast;
  }

  // Создать тост уведомление
  createToast(message, type, duration) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Иконка
    const icon = document.createElement('div');
    icon.className = 'toast-icon';
    icon.textContent = this.getTypeIcon(type);
    
    // Контент
    const content = document.createElement('div');
    content.className = 'toast-content';
    
    const title = document.createElement('div');
    title.className = 'toast-title';
    title.textContent = this.getTypeTitle(type);
    
    const messageEl = document.createElement('div');
    messageEl.className = 'toast-message';
    messageEl.textContent = message;
    
    content.appendChild(title);
    content.appendChild(messageEl);
    
    // Кнопка закрытия
    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.innerHTML = '×';
    closeBtn.onclick = () => this.hide(toast);
    
    // Прогресс-бар
    let progressBar = null;
    if (duration > 0) {
      progressBar = document.createElement('div');
      progressBar.className = 'toast-progress';
      progressBar.style.width = '100%';
      progressBar.style.transitionDuration = `${duration}ms`;
    }
    
    // Сборка тоста
    toast.appendChild(icon);
    toast.appendChild(content);
    toast.appendChild(closeBtn);
    
    if (progressBar) {
      toast.appendChild(progressBar);
      
      // Запускаем анимацию прогресса
      setTimeout(() => {
        progressBar.style.width = '0%';
      }, 50);
    }
    
    // Закрытие по клику (кроме кнопки закрытия)
    toast.addEventListener('click', (e) => {
      if (e.target !== closeBtn) {
        this.hide(toast);
      }
    });
    
    return toast;
  }

  // Получить иконку по типу
  getTypeIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'i'
    };
    return icons[type] || icons.info;
  }

  // Получить заголовок по типу
  getTypeTitle(type) {
    const titles = {
      success: 'Успешно',
      error: 'Ошибка',
      warning: 'Внимание',
      info: 'Информация'
    };
    return titles[type] || titles.info;
  }

  // Скрыть уведомление
  hide(toast) {
    if (!toast || !toast.parentNode) return;
    
    toast.classList.remove('show');
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      
      // Удаляем из массива
      const index = this.notifications.indexOf(toast);
      if (index > -1) {
        this.notifications.splice(index, 1);
      }
    }, 300);
  }

  // Скрыть все уведомления
  hideAll() {
    this.notifications.forEach(notification => {
      this.hide(notification);
    });
  }

  // Специализированные методы
  success(message, duration) {
    return this.show(message, 'success', duration);
  }

  error(message, duration) {
    return this.show(message, 'error', duration || 7000); // Ошибки показываем дольше
  }

  warning(message, duration) {
    return this.show(message, 'warning', duration);
  }

  info(message, duration) {
    return this.show(message, 'info', duration);
  }

  // Показать ошибки валидации
  showValidationErrors(errors) {
    if (Array.isArray(errors)) {
      errors.forEach(error => {
        this.error(`${error.field}: ${error.message}`);
      });
    } else if (typeof errors === 'object') {
      Object.entries(errors).forEach(([field, message]) => {
        this.error(`${field}: ${message}`);
      });
    } else {
      this.error(errors);
    }
  }

  // Показать результат API запроса
  showApiResult(response) {
    if (response.success) {
      this.success(response.message || 'Операция выполнена успешно');
    } else {
      if (response.errors && Array.isArray(response.errors)) {
        this.showValidationErrors(response.errors);
      } else {
        this.error(response.message || 'Произошла ошибка');
      }
    }
  }
}

// Создаем глобальный экземпляр
window.notifications = new NotificationManager();

// Логирование клиентских ошибок
class ClientLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 100;
  }

  // Добавить лог
  log(level, message, context = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: JSON.stringify(context),
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    this.logs.unshift(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }
    
    // Отправляем критические ошибки на сервер
    if (level === 'error') {
      this.sendToServer(logEntry);
    }
    
    console[level](`[${level.toUpperCase()}] ${message}`, context);
  }

  // Отправить лог на сервер
  async sendToServer(logEntry) {
    try {
      await fetch('/api/logs/client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(logEntry),
        credentials: 'include'
      });
    } catch (error) {
      // Тихо игнорируем ошибки отправки логов
      console.warn('Не удалось отправить лог на сервер:', error);
    }
  }

  // Специализированные методы
  error(message, context) {
    this.log('error', message, context);
  }

  warn(message, context) {
    this.log('warn', message, context);
  }

  info(message, context) {
    this.log('info', message, context);
  }

  debug(message, context) {
    this.log('debug', message, context);
  }

  // Логирование действий пользователя
  userAction(action, details = {}) {
    this.info(`Действие пользователя: ${action}`, {
      action,
      details,
      timestamp: new Date().toISOString()
    });
  }

  // Логирование ошибок валидации
  validationError(field, error, value) {
    this.warn(`Ошибка валидации: ${field}`, {
      field,
      error,
      value,
      form: document.activeElement?.form?.id
    });
  }

  // Логирование API запросов
  apiRequest(method, url, status, duration) {
    const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
    this.log(level, `API запрос: ${method} ${url}`, {
      method,
      url,
      status,
      duration
    });
  }

  // Получить все логи
  getLogs() {
    return this.logs;
  }

  // Очистить логи
  clearLogs() {
    this.logs = [];
  }
}

// Создаем глобальный экземпляр логгера
window.clientLogger = new ClientLogger();

// Перехватываем глобальные ошибки
window.addEventListener('error', (event) => {
  window.clientLogger.error('Необработанная ошибка JavaScript', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack
  });
});

// Перехватываем отклоненные промисы
window.addEventListener('unhandledrejection', (event) => {
  window.clientLogger.error('Необработанное отклонение промиса', {
    reason: event.reason,
    stack: event.reason?.stack
  });
});

// 🔔 Центр уведомлений
class NotificationCenter {
  constructor() {
    this.notifications = [];
    this.currentFilter = 'all';
    this.isModalOpen = false;
    this.pollInterval = null;
    this.lastUpdateTime = null;
    this.initializeEventListeners();
    this.loadNotifications();
  }

  // Инициализация обработчиков событий
  initializeEventListeners() {
    console.log('🔧 Инициализация обработчиков событий NotificationCenter...');
    
    // Кнопки открытия уведомлений
    const notificationBtns = document.querySelectorAll('.notifications-btn');
    console.log('🔔 Найдено кнопок уведомлений:', notificationBtns.length);
    
    notificationBtns.forEach((btn, index) => {
      console.log(`🔘 Добавляем обработчик для кнопки ${index + 1}:`, btn.id || btn.className);
      btn.addEventListener('click', () => {
        console.log('🔔 Клик по кнопке уведомлений! Открываем модал...');
        this.openModal();
      });
    });

    // Закрытие модального окна
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-backdrop') || 
          e.target.classList.contains('modal-close')) {
        this.closeModal();
      }
    });

    // Фильтры уведомлений
    document.querySelectorAll('.notifications-filter').forEach(filter => {
      filter.addEventListener('click', (e) => {
        this.setFilter(e.target.dataset.filter);
      });
    });

    // Отметить все как прочитанные
    const markAllBtn = document.getElementById('mark-all-read-btn');
    if (markAllBtn) {
      markAllBtn.addEventListener('click', () => this.markAllAsRead());
    }
  }

  // Открыть модальное окно
  openModal() {
    console.log('📂 Попытка открыть модальное окно уведомлений...');
    const modal = document.getElementById('notifications-modal');
    console.log('🔍 Модальное окно найдено:', !!modal);
    
    if (modal) {
      console.log('✅ Открываем модальное окно...');
      modal.classList.remove('hidden');
      this.isModalOpen = true;
      this.renderNotifications();
      console.log('🎯 Модальное окно открыто успешно');
    } else {
      console.error('❌ Модальное окно #notifications-modal не найдено в DOM!');
    }
  }

  // Закрыть модальное окно
  closeModal() {
    const modal = document.getElementById('notifications-modal');
    if (modal) {
      modal.classList.add('hidden');
      this.isModalOpen = false;
    }
  }

  // Установить фильтр
  setFilter(filter) {
    this.currentFilter = filter;
    
    // Обновляем активную кнопку фильтра
    document.querySelectorAll('.notifications-filter').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    this.renderNotifications();
  }

  // Добавить уведомление
  addNotification(notification) {
    const newNotification = {
      id: Date.now() + Math.random(),
      ...notification,
      created_at: notification.created_at || new Date().toISOString(),
      read: notification.read || false
    };
    
    this.notifications.unshift(newNotification);
    this.updateBadges();
    
    if (this.isModalOpen) {
      this.renderNotifications();
    }

    return newNotification;
  }

  // Отметить как прочитанное
  markAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.updateBadges();
      
      if (this.isModalOpen) {
        this.renderNotifications();
      }
    }
  }

  // Отметить все как прочитанные
  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.updateBadges();
    this.renderNotifications();
  }

  // Обновить счетчики на кнопках уведомлений
  updateBadges() {
    const unreadCount = this.notifications.filter(n => !n.read).length;
    
    document.querySelectorAll('.notifications-badge').forEach(badge => {
      badge.textContent = unreadCount;
      badge.classList.toggle('has-notifications', unreadCount > 0);
    });
  }

  // Фильтровать уведомления
  getFilteredNotifications() {
    let filtered = this.notifications;
    
    switch (this.currentFilter) {
      case 'unread':
        filtered = filtered.filter(n => !n.read);
        break;
      case 'requests':
        filtered = filtered.filter(n => n.type === 'request');
        break;
      case 'auctions':
        filtered = filtered.filter(n => n.type === 'auction');
        break;
      case 'system':
        filtered = filtered.filter(n => n.type === 'system');
        break;
    }
    
    return filtered;
  }

  // Отрендерить уведомления
  renderNotifications() {
    const list = document.getElementById('notifications-list');
    if (!list) return;

    const filtered = this.getFilteredNotifications();
    
    if (filtered.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📪</div>
          <h3>Нет уведомлений</h3>
          <p>${this.getEmptyStateMessage()}</p>
        </div>
      `;
      return;
    }

    list.innerHTML = filtered.map(notification => this.createNotificationHTML(notification)).join('');
    
    // Добавляем обработчики событий
    list.querySelectorAll('.notification-item').forEach(item => {
      const id = parseInt(item.dataset.id);
      
      item.addEventListener('click', () => {
        if (!item.classList.contains('read')) {
          this.markAsRead(id);
        }
      });
      
      // Обработчики для действий
      item.querySelectorAll('.notification-action').forEach(action => {
        action.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleNotificationAction(id, action.dataset.action);
        });
      });
    });
  }

  // Создать HTML для уведомления
  createNotificationHTML(notification) {
    const timeAgo = this.getTimeAgo(notification.created_at);
    const isUnread = !notification.read;
    
    return `
      <div class="notification-item ${isUnread ? 'unread' : ''}" data-id="${notification.id}">
        <div class="notification-header">
          <h4 class="notification-title">${notification.title}</h4>
          <span class="notification-time">${timeAgo}</span>
        </div>
        <p class="notification-body">${notification.message}</p>
        <div class="notification-meta">
          <span class="notification-type ${notification.type}">${this.getTypeLabel(notification.type)}</span>
          <div class="notification-actions">
            ${this.getNotificationActions(notification)}
          </div>
        </div>
      </div>
    `;
  }

  // Получить действия для уведомления
  getNotificationActions(notification) {
    const actions = [];
    
    if (notification.type === 'request' && notification.requestId) {
      actions.push(`<button class="notification-action" data-action="view-request">Посмотреть</button>`);
    }
    
    if (notification.type === 'auction' && notification.auctionId) {
      actions.push(`<button class="notification-action" data-action="view-auction">Посмотреть</button>`);
    }
    
    if (!notification.read) {
      actions.push(`<button class="notification-action" data-action="mark-read">Прочитано</button>`);
    }
    
    return actions.join('');
  }

  // Обработать действие уведомления
  handleNotificationAction(notificationId, action) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (!notification) return;

    switch (action) {
      case 'mark-read':
        this.markAsRead(notificationId);
        break;
      case 'view-request':
        this.closeModal();
        // Переход к заявке
        if (notification.requestId) {
          this.navigateToRequest(notification.requestId);
        }
        break;
      case 'view-auction':
        this.closeModal();
        // Переход к аукциону
        if (notification.auctionId) {
          this.navigateToAuction(notification.auctionId);
        }
        break;
    }
  }

  // Навигация к заявке
  navigateToRequest(requestId) {
    // Логика перехода к конкретной заявке
    console.log('Переход к заявке:', requestId);
  }

  // Навигация к аукциону
  navigateToAuction(auctionId) {
    // Логика перехода к конкретному аукциону
    console.log('Переход к аукциону:', auctionId);
  }

  // Получить сообщение для пустого состояния
  getEmptyStateMessage() {
    switch (this.currentFilter) {
      case 'unread':
        return 'Все уведомления прочитаны';
      case 'requests':
        return 'Нет уведомлений о заявках';
      case 'auctions':
        return 'Нет уведомлений об аукционах';
      case 'system':
        return 'Нет системных уведомлений';
      default:
        return 'Здесь будут отображаться уведомления о новых заявках, результатах аукционов и системных событиях';
    }
  }

  // Получить метку типа
  getTypeLabel(type) {
    const labels = {
      request: 'Заявка',
      auction: 'Аукцион',
      system: 'Система'
    };
    return labels[type] || 'Уведомление';
  }

  // Получить время "назад"
  getTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} дн назад`;
    
    return date.toLocaleDateString('ru-RU');
  }

  // Загрузить уведомления с сервера
  async loadNotifications() {
    try {
      console.log('🔄 Начинаем загрузку уведомлений с сервера...');
      
      // Проверяем, авторизован ли пользователь
      if (!window.apiRequest) {
        console.warn('❌ API недоступно, используем локальные уведомления');
        console.log('💡 На проде должен быть доступен window.apiRequest');
        return;
      }

      console.log('✅ window.apiRequest доступен, отправляем запрос...');
      const startTime = Date.now();
      
      const response = await window.apiRequest('/notifications');
      const duration = Date.now() - startTime;
      
      console.log(`📊 Ответ от сервера получен за ${duration}ms:`, {
        success: response.success,
        notificationsCount: response.notifications?.length || 0,
        hasNotificationsArray: Array.isArray(response.notifications),
        responseKeys: Object.keys(response),
        fullResponse: response
      });
      
      if (response.success) {
        // Проверяем, что notifications это массив
        if (Array.isArray(response.notifications)) {
          // Преобразуем серверные уведомления в формат фронтенда
          this.notifications = response.notifications.map(notification => ({
            id: notification.id,
            title: notification.title,
            message: notification.message,
            type: this.mapServerTypeToClient(notification.type),
            created_at: notification.created_at,
            read: notification.read_at !== null
          }));
          
          console.log(`📥 Загружено ${this.notifications.length} уведомлений:`, this.notifications);
        } else {
          console.error('❌ response.notifications не является массивом:', response.notifications);
          this.notifications = [];
        }
        
        this.updateBadges();
        this.lastUpdateTime = new Date();
        
        console.log('🔔 Счетчики обновлены, запускаем периодическое обновление...');
        
        // Запускаем периодическое обновление
        this.startPolling();
      } else {
        console.warn('⚠️ Сервер вернул success: false:', response);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки уведомлений с сервера:', {
        message: error.message,
        stack: error.stack,
        error: error
      });
      
      // Отправляем ошибку в систему логирования если доступна
      if (window.clientLogger) {
        window.clientLogger.error('Ошибка загрузки уведомлений', {
          error: error.message,
          stack: error.stack,
          apiAvailable: !!window.apiRequest
        });
      }
      
      // Продолжаем работу с локальными уведомлениями
    }
  }

  // Преобразование типов уведомлений с сервера в типы фронтенда
  mapServerTypeToClient(serverType) {
    const mapping = {
      'new_request': 'request',
      'bid_accepted': 'auction',
      'bid_rejected': 'auction', 
      'auction_closed': 'auction',
      'bid_won': 'auction',
      'bid_lost': 'auction',
      'auction_no_bids': 'auction',
      'system': 'system'
    };
    
    return mapping[serverType] || 'system';
  }

  // Запустить периодическое обновление уведомлений
  startPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    
    // Обновляем каждые 30 секунд
    this.pollInterval = setInterval(() => {
      this.checkForNewNotifications();
    }, 30000);
  }

  // Остановить периодическое обновление
  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  // Проверить новые уведомления
  async checkForNewNotifications() {
    try {
      if (!window.apiRequest) return;
      
      const response = await window.apiRequest('/notifications/unread');
      if (response.success && response.notifications.length > 0) {
        // Проверяем, есть ли новые уведомления
        const existingIds = new Set(this.notifications.map(n => n.id));
        const newNotifications = response.notifications.filter(n => !existingIds.has(n.id));
        
        if (newNotifications.length > 0) {
          // Добавляем новые уведомления
          newNotifications.forEach(notification => {
            const mappedNotification = {
              id: notification.id,
              title: notification.title,
              message: notification.message,
              type: this.mapServerTypeToClient(notification.type),
              created_at: notification.created_at,
              read: false
            };
            this.notifications.unshift(mappedNotification);
          });
          
          this.updateBadges();
          
          // Показываем toast уведомления о новых сообщениях
          if (window.notificationManager && newNotifications.length > 0) {
            window.notificationManager.show(
              `Получено ${newNotifications.length} нов${newNotifications.length === 1 ? 'ое' : 'ых'} уведомлени${newNotifications.length === 1 ? 'е' : 'й'}`,
              'info',
              5000
            );
          }
        }
      }
    } catch (error) {
      console.warn('Ошибка проверки новых уведомлений:', error);
    }
  }

  // Переопределяем markAsRead для работы с сервером
  async markAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (!notification || notification.read) return;
    
    // Отмечаем локально
    notification.read = true;
    this.updateBadges();
    
    // Отмечаем на сервере
    if (window.apiRequest) {
      try {
        await window.apiRequest(`/notifications/${notificationId}/read`, {
          method: 'POST'
        });
      } catch (error) {
        console.warn('Не удалось отметить уведомление как прочитанное на сервере:', error);
      }
    }
    
    // Обновляем UI
    if (this.isModalOpen) {
      this.renderNotifications();
    }
  }

  // Переопределяем markAllAsRead для работы с сервером
  async markAllAsRead() {
    const unreadNotifications = this.notifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) return;
    
    // Отмечаем локально
    unreadNotifications.forEach(notification => {
      notification.read = true;
    });
    
    this.updateBadges();
    
    // Отмечаем на сервере
    if (window.apiRequest) {
      try {
        await window.apiRequest('/notifications/read-all', {
          method: 'POST'
        });
      } catch (error) {
        console.warn('Не удалось отметить все уведомления как прочитанные на сервере:', error);
      }
    }
    
    // Обновляем UI
    if (this.isModalOpen) {
      this.renderNotifications();
    }
  }

  // Добавить демо уведомления для тестирования
  addDemoNotifications() {
    const demoNotifications = [
      {
        title: 'Новая заявка на экскаватор',
        message: 'Поступила заявка на аренду экскаватора JCB JS220 на период с 15.12.2024 по 20.12.2024',
        type: 'request',
        requestId: 123,
        created_at: new Date(Date.now() - 300000).toISOString() // 5 минут назад
      },
      {
        title: 'Аукцион завершен',
        message: 'Ваша ставка на заявку #122 выиграла аукцион. Цена: 150,000 руб.',
        type: 'auction',
        auctionId: 122,
        created_at: new Date(Date.now() - 3600000).toISOString() // 1 час назад
      },
      {
        title: 'Обновление системы',
        message: 'Система будет недоступна для обслуживания 16.12.2024 с 02:00 до 04:00',
        type: 'system',
        created_at: new Date(Date.now() - 86400000).toISOString() // 1 день назад
      }
    ];

    demoNotifications.forEach(notification => {
      this.addNotification(notification);
    });
  }
}

// Создаем глобальный экземпляр центра уведомлений после загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
  console.log('🔔 Инициализация NotificationCenter...');
  window.notificationCenter = new NotificationCenter();
  console.log('✅ NotificationCenter инициализирован:', !!window.notificationCenter);
});

// Экспорт для использования в модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NotificationManager, ClientLogger, NotificationCenter };
}
