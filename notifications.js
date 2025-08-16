/**
 * Система уведомлений v2.0 - самодостаточная реализация
 */

console.log('🔧 Загрузка NotificationSystem v2.0...');

class EventEmitter {
  constructor() {
    this.events = new Map();
  }
  
  on(eventName, listener) {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, new Set());
    }
    this.events.get(eventName).add(listener);
  }
  
  emit(eventName, ...args) {
    const listeners = this.events.get(eventName);
    if (listeners) {
      listeners.forEach(listener => {
        try { 
          listener(...args); 
        } catch (error) { 
          console.error(error); 
        }
      });
    }
  }
}

class ToastChannel {
  constructor() {
    this.toasts = [];
    this.maxToasts = 5;
    this.init();
  }
  
  init() {
    this.container = document.createElement('div');
    this.container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:10000;max-width:400px;display:flex;flex-direction:column;gap:8px;';
    this.addStyles();
    document.body.appendChild(this.container);
  }
  
  async handle(notification) {
    this.showToast(this.createToast(notification), notification);
  }
  
  createToast(notification) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${notification.type}`;
    const icon = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' }[notification.type] || 'ℹ️';
    toast.innerHTML = `<div style="display:flex;align-items:flex-start;gap:12px;padding:12px 16px;"><div style="font-size:18px;">${icon}</div><div style="flex:1;"><div style="font-weight:600;font-size:14px;margin-bottom:4px;">${notification.title}</div><div style="font-size:13px;color:#666;">${notification.message}</div></div></div>`;
    return toast;
  }
  
  showToast(toast, notification) {
    this.enforceLimits();
    this.container.appendChild(toast);
    this.toasts.push(toast);
    requestAnimationFrame(() => toast.classList.add('toast-show'));
    setTimeout(() => this.hideToast(toast), 4000);
  }
  
  hideToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.add('toast-hide');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
      const index = this.toasts.indexOf(toast);
      if (index > -1) this.toasts.splice(index, 1);
    }, 300);
  }
  
  enforceLimits() {
    while (this.toasts.length >= this.maxToasts) {
      this.hideToast(this.toasts[0]);
    }
  }
  
  addStyles() {
    if (document.getElementById('toast-styles')) return;
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = '.toast{background:white;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);border-left:4px solid #007bff;opacity:0;transform:translateX(100%);transition:all 0.3s;pointer-events:auto;position:relative;max-width:100%;}.toast.toast-show{opacity:1;transform:translateX(0);}.toast.toast-hide{opacity:0;transform:translateX(100%);}.toast.toast-success{border-left-color:#28a745;}.toast.toast-error{border-left-color:#dc3545;}.toast.toast-warning{border-left-color:#ffc107;}.toast.toast-info{border-left-color:#17a2b8;}';
    document.head.appendChild(style);
  }
}

class NotificationManagerV2 extends EventEmitter {
  constructor() {
    super();
    this.notifications = new Map();
    this.toastChannel = new ToastChannel();
    console.log('✅ NotificationManager v2.0 инициализирован');
  }
  
  async create(notificationData) {
    const notification = {
      id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      type: notificationData.type || 'info',
      title: notificationData.title || this.getDefaultTitle(notificationData.type || 'info'),
      message: notificationData.message,
      createdAt: new Date()
    };
    this.notifications.set(notification.id, notification);
    await this.toastChannel.handle(notification);
    return notification;
  }
  
  show(message, type = 'info') {
    return this.create({ message, type, title: this.getDefaultTitle(type) });
  }
  
  success(message) { 
    return this.show(message, 'success'); 
  }
  
  error(message) { 
    return this.show(message, 'error'); 
  }
  
  warning(message) { 
    return this.show(message, 'warning'); 
  }
  
  info(message) { 
    return this.show(message, 'info'); 
  }
  
  showApiResult(response) {
    if (response.success) {
      this.success(response.message || 'Операция выполнена успешно');
    } else {
      this.error(response.message || 'Произошла ошибка');
    }
  }
  
  getDefaultTitle(type) {
    return { 
      success: 'Успешно', 
      error: 'Ошибка', 
      warning: 'Внимание', 
      info: 'Информация' 
    }[type] || 'Информация';
  }
}

class NotificationCenter {
  constructor() {
    this.notifications = [];
    this.clickHandler = null; // Храним ссылку на обработчик
    this.init();
  }
  
  init() {
    document.querySelectorAll('.notifications-btn').forEach(btn => {
      btn.addEventListener('click', () => this.openModal());
    });
    
    // Обработчики для закрытия модального окна
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => this.closeModal());
    });
    
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', () => this.closeModal());
    });
    
    // Закрытие по ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
      }
    });
    
    this.loadNotifications();
  }
  
  openModal() {
    const modal = document.getElementById('notifications-modal');
    if (modal) {
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      this.renderNotifications();
    }
  }
  
  closeModal() {
    const modal = document.getElementById('notifications-modal');
    if (modal) {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
    }
  }
  
  async loadNotifications() {
    try {
      if (!window.apiRequest) return;
      const response = await window.apiRequest('/notifications');
      if (response.success && Array.isArray(response.notifications)) {
        this.notifications = response.notifications;
        this.updateBadges();
      }
    } catch (error) {
      console.error('Ошибка загрузки уведомлений:', error);
    }
  }
  
  addNotification(data) {
    // Создаем уникальный ID на основе контента для предотвращения дублей
    const contentHash = this.generateContentId(data);
    
    // Проверяем, нет ли уже такого уведомления
    const existing = this.notifications.find(n => 
      n.contentId === contentHash || 
      (n.title === data.title && n.message === data.message && Math.abs(new Date() - new Date(n.created_at)) < 5000)
    );
    
    if (existing) {
      console.log('🔄 Дублирующееся уведомление пропущено:', data.title);
      return existing;
    }
    
    const notification = { 
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9), 
      contentId: contentHash,
      ...data, 
      created_at: new Date().toISOString(), 
      read: false 
    };
    
    this.notifications.unshift(notification);
    this.updateBadges();
    
    if (window.notifications) {
      window.notifications.show(notification.message, notification.type);
    }
    
    console.log('✅ Новое уведомление добавлено:', notification.title);
    return notification;
  }
  
  generateContentId(data) {
    // Простой хеш на основе заголовка и сообщения
    const content = `${data.title || ''}_${data.message || ''}_${data.type || ''}`;
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Преобразуем в 32-битное целое
    }
    return hash.toString();
  }
  
  markAsRead(id) {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) { 
      notification.read = true; 
      this.updateBadges(); 
      return true; 
    }
    return false;
  }
  
  markAllAsRead() {
    let count = 0;
    this.notifications.forEach(n => { 
      if (!n.read) { 
        n.read = true; 
        count++; 
      } 
    });
    this.updateBadges();
    return count;
  }
  
  updateBadges() {
    const unreadCount = this.notifications.filter(n => !n.read).length;
    document.querySelectorAll('.notifications-badge, .notification-badge').forEach(badge => {
      badge.textContent = unreadCount;
      badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    });
  }
  
  async renderNotifications() {
    const list = document.getElementById('notifications-list');
    const loading = document.getElementById('notifications-loading');
    if (!list) return;
    
    try {
      // Показываем загрузку
      if (loading) loading.style.display = 'block';
      
      // Загружаем уведомления с сервера
      await this.loadNotifications();
      
      // Скрываем загрузку
      if (loading) loading.style.display = 'none';
      
      if (this.notifications.length === 0) {
        list.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📪</div>
            <h3>Нет уведомлений</h3>
            <p>Здесь будут отображаться уведомления о новых заявках, результатах аукционов и системных событиях</p>
          </div>
        `;
        return;
      }
      
      // Отображаем уведомления
      list.innerHTML = this.notifications.map(notification => `
        <div class="notification-item ${notification.read ? 'read' : 'unread'}" data-id="${notification.id}">
          <div class="notification-header">
            <div class="notification-type ${notification.type}">${this.getTypeIcon(notification.type)}</div>
            <div class="notification-time">${this.formatTimeAgo(notification.created_at)}</div>
          </div>
          <div class="notification-content">
            <h4 class="notification-title">${notification.title}</h4>
            <p class="notification-message">${notification.message}</p>
          </div>
          <div class="notification-actions">
            ${!notification.read ? `
              <button class="btn btn--small btn--secondary mark-read-btn" data-id="${notification.id}">
                Отметить как прочитанное
              </button>
            ` : ''}
          </div>
        </div>
      `).join('');
      
      // Добавляем обработчики событий (только один раз)
      if (!this.clickHandler) {
        this.clickHandler = this.handleNotificationClick.bind(this);
      }
      // Удаляем старый обработчик если есть
      list.removeEventListener('click', this.clickHandler);
      // Добавляем новый
      list.addEventListener('click', this.clickHandler);
      
    } catch (error) {
      console.error('Ошибка отображения уведомлений:', error);
      if (loading) loading.style.display = 'none';
      list.innerHTML = `
        <div class="error-state">
          <div class="error-icon">⚠️</div>
          <h3>Ошибка загрузки</h3>
          <p>Не удалось загрузить уведомления: ${error.message}</p>
          <button class="btn btn--primary" onclick="window.notificationCenter.renderNotifications()">Повторить</button>
        </div>
      `;
    }
  }
  
  getTypeIcon(type) {
    const icons = {
      'success': '✅',
      'error': '❌', 
      'warning': '⚠️',
      'info': 'ℹ️',
      'system': '⚙️',
      'request': '📋',
      'auction': '🏆'
    };
    return icons[type] || 'ℹ️';
  }
  
  formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffMinutes < 1) return 'только что';
    if (diffMinutes < 60) return `${diffMinutes} мин назад`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} ч назад`;
    return `${Math.floor(diffMinutes / 1440)} дн назад`;
  }
  
  async handleNotificationClick(e) {
    if (e.target.matches('.mark-read-btn')) {
      const notificationId = e.target.dataset.id;
      const button = e.target;
      
      // Защита от повторных кликов
      if (button.disabled) {
        console.log('🔄 Клик проигнорирован - кнопка уже обрабатывается');
        return;
      }
      
      try {
        button.disabled = true;
        button.textContent = 'Обрабатывается...';
        
        console.log('📝 Отмечаем уведомление как прочитанное:', notificationId);
        
        // markAsRead синхронный метод
        const success = this.markAsRead(notificationId);
        
        if (success) {
          // Обновляем отображение
          const notificationItem = button.closest('.notification-item');
          if (notificationItem) {
            notificationItem.classList.remove('unread');
            notificationItem.classList.add('read');
            button.remove(); // Убираем кнопку
          }
          
          if (window.notifications) {
            window.notifications.success('Уведомление отмечено как прочитанное');
          }
          
          console.log('✅ Уведомление успешно отмечено как прочитанное');
        } else {
          console.error('❌ Не удалось отметить уведомление как прочитанное');
          button.disabled = false;
          button.textContent = 'Отметить как прочитанное';
        }
        
      } catch (error) {
        console.error('❌ Ошибка при отметке уведомления:', error);
        button.disabled = false;
        button.textContent = 'Отметить как прочитанное';
        
        if (window.notifications) {
          window.notifications.error('Ошибка при отметке уведомления');
        }
      }
    }
  }
}

// Создание экземпляров
const notificationManager = new NotificationManagerV2();
const notificationCenter = new NotificationCenter();

// Глобальные объекты для обратной совместимости
window.notifications = notificationManager;
window.notificationCenter = notificationCenter;
window.notificationManager = notificationManager;

console.log('🔔 NotificationSystem v2.0 готова!');
console.log('✅ Доступны методы: window.notifications.success(), .error(), .warning(), .info()');
console.log('✅ Модальное окно: window.notificationCenter.openModal()');

// Экспорт для CommonJS если нужен
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { notificationManager, notificationCenter };
}
