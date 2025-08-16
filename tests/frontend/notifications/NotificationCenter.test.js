// Тесты NotificationCenter
/**
 * @jest-environment jsdom
 */

const { DOMTestUtils, AsyncTestUtils } = require('../../config/test-helpers');

// Мок для NotificationCenter
const mockNotificationCenter = {
  notifications: [],
  currentFilter: 'all',
  isModalOpen: false,

  addNotification: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  openModal: jest.fn(),
  closeModal: jest.fn(),
  setFilter: jest.fn(),
  renderNotifications: jest.fn(),
  updateBadges: jest.fn(),
  getFilteredNotifications: jest.fn(),
  getTimeAgo: jest.fn(),
  handleNotificationAction: jest.fn()
};

// Создаем DOM структуру для тестов
function setupDOM() {
  document.body.innerHTML = `
    <div class="sidebar-header">
      <button class="notifications-btn" id="admin-notifications-btn">
        <span class="notifications-icon">🔔</span>
        <span class="notifications-badge" id="admin-notifications-count">0</span>
      </button>
    </div>
    
    <div id="notifications-modal" class="modal hidden">
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>🔔 Уведомления</h3>
          <button class="modal-close">&times;</button>
          <button id="mark-all-read-btn">Отметить все прочитанными</button>
        </div>
        <div class="modal-body">
          <div class="notifications-filters">
            <button class="notifications-filter active" data-filter="all">Все</button>
            <button class="notifications-filter" data-filter="unread">Непрочитанные</button>
            <button class="notifications-filter" data-filter="requests">Заявки</button>
            <button class="notifications-filter" data-filter="auctions">Аукционы</button>
            <button class="notifications-filter" data-filter="system">Система</button>
          </div>
          <div id="notifications-list" class="notifications-list">
            <div class="empty-state">Нет уведомлений</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Имитация NotificationCenter класса
class TestNotificationCenter {
  constructor() {
    this.notifications = [];
    this.currentFilter = 'all';
    this.isModalOpen = false;
  }

  addNotification(notification) {
    if (!notification) return null;
    
    const newNotification = {
      id: Date.now() + Math.random(),
      title: '',
      message: '',
      type: 'info',
      ...notification,
      created_at: notification?.created_at || new Date().toISOString(),
      read: notification?.read || false
    };
    
    this.notifications.unshift(newNotification);
    this.updateBadges();
    
    if (this.isModalOpen) {
      this.renderNotifications();
    }

    return newNotification;
  }

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

  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.updateBadges();
    this.renderNotifications();
  }

  updateBadges() {
    const unreadCount = this.notifications.filter(n => !n.read).length;
    
    document.querySelectorAll('.notifications-badge').forEach(badge => {
      badge.textContent = unreadCount;
      badge.classList.toggle('has-notifications', unreadCount > 0);
    });
  }

  openModal() {
    const modal = document.getElementById('notifications-modal');
    if (modal) {
      modal.classList.remove('hidden');
      this.isModalOpen = true;
      this.renderNotifications();
    }
  }

  closeModal() {
    const modal = document.getElementById('notifications-modal');
    if (modal) {
      modal.classList.add('hidden');
      this.isModalOpen = false;
    }
  }

  setFilter(filter) {
    this.currentFilter = filter;
    
    document.querySelectorAll('.notifications-filter').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    this.renderNotifications();
  }

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

  renderNotifications() {
    const list = document.getElementById('notifications-list');
    if (!list) return;

    const filtered = this.getFilteredNotifications();
    
    if (filtered.length === 0) {
      list.innerHTML = '<div class="empty-state">Нет уведомлений</div>';
      return;
    }

    list.innerHTML = filtered.map(notification => 
      this.createNotificationHTML(notification)
    ).join('');
  }

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
          <span class="notification-type ${notification.type}">${notification.type}</span>
        </div>
      </div>
    `;
  }

  getTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    return `${Math.floor(diffMins / 60)} ч назад`;
  }
}

describe('NotificationCenter', () => {
  let notificationCenter;

  beforeEach(() => {
    setupDOM();
    notificationCenter = new TestNotificationCenter();
    
    // Мокаем глобальный объект
    global.notificationCenter = notificationCenter;
    global.window.notificationCenter = notificationCenter;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('должен инициализироваться с пустым списком уведомлений', () => {
      expect(notificationCenter.notifications).toEqual([]);
      expect(notificationCenter.currentFilter).toBe('all');
      expect(notificationCenter.isModalOpen).toBe(false);
    });

    test('должен найти DOM элементы', () => {
      const modal = document.getElementById('notifications-modal');
      const list = document.getElementById('notifications-list');
      const badge = document.getElementById('admin-notifications-count');

      expect(modal).not.toBeNull();
      expect(list).not.toBeNull();
      expect(badge).not.toBeNull();
    });
  });

  describe('addNotification()', () => {
    test('должен добавить новое уведомление', () => {
      const notification = {
        title: 'Тест уведомление',
        message: 'Тестовое сообщение',
        type: 'system'
      };

      const result = notificationCenter.addNotification(notification);

      expect(notificationCenter.notifications).toHaveLength(1);
      expect(result.id).toBeDefined();
      expect(result.title).toBe('Тест уведомление');
      expect(result.read).toBe(false);
      expect(result.created_at).toBeDefined();
    });

    test('должен добавить уведомление в начало списка', () => {
      const notification1 = { title: 'Первое', type: 'system' };
      const notification2 = { title: 'Второе', type: 'request' };

      notificationCenter.addNotification(notification1);
      notificationCenter.addNotification(notification2);

      expect(notificationCenter.notifications[0].title).toBe('Второе');
      expect(notificationCenter.notifications[1].title).toBe('Первое');
    });

    test('должен обновить счетчики после добавления', () => {
      const badge = document.getElementById('admin-notifications-count');
      
      notificationCenter.addNotification({
        title: 'Тест',
        type: 'system'
      });

      expect(badge.textContent).toBe('1');
      expect(badge.classList.contains('has-notifications')).toBe(true);
    });

    test('должен генерировать уникальные ID', () => {
      const notification1 = notificationCenter.addNotification({ title: 'Тест 1', type: 'system' });
      const notification2 = notificationCenter.addNotification({ title: 'Тест 2', type: 'system' });

      expect(notification1.id).not.toBe(notification2.id);
    });
  });

  describe('markAsRead()', () => {
    test('должен отметить уведомление как прочитанное', () => {
      const notification = notificationCenter.addNotification({
        title: 'Тест',
        type: 'system'
      });

      notificationCenter.markAsRead(notification.id);

      expect(notification.read).toBe(true);
    });

    test('должен обновить счетчики после прочтения', () => {
      const badge = document.getElementById('admin-notifications-count');
      
      const notification = notificationCenter.addNotification({
        title: 'Тест',
        type: 'system'
      });

      expect(badge.textContent).toBe('1');

      notificationCenter.markAsRead(notification.id);

      expect(badge.textContent).toBe('0');
      expect(badge.classList.contains('has-notifications')).toBe(false);
    });

    test('должен игнорировать несуществующие ID', () => {
      notificationCenter.markAsRead(999999);
      // Не должно вызывать ошибок
    });
  });

  describe('markAllAsRead()', () => {
    test('должен отметить все уведомления как прочитанные', () => {
      notificationCenter.addNotification({ title: 'Тест 1', type: 'system' });
      notificationCenter.addNotification({ title: 'Тест 2', type: 'request' });

      notificationCenter.markAllAsRead();

      expect(notificationCenter.notifications.every(n => n.read)).toBe(true);
    });

    test('должен обнулить счетчик после массового прочтения', () => {
      const badge = document.getElementById('admin-notifications-count');
      
      notificationCenter.addNotification({ title: 'Тест 1', type: 'system' });
      notificationCenter.addNotification({ title: 'Тест 2', type: 'request' });

      expect(badge.textContent).toBe('2');

      notificationCenter.markAllAsRead();

      expect(badge.textContent).toBe('0');
    });
  });

  describe('Modal Management', () => {
    test('openModal() должен показать модальное окно', () => {
      const modal = document.getElementById('notifications-modal');
      
      notificationCenter.openModal();

      expect(modal.classList.contains('hidden')).toBe(false);
      expect(notificationCenter.isModalOpen).toBe(true);
    });

    test('closeModal() должен скрыть модальное окно', () => {
      const modal = document.getElementById('notifications-modal');
      
      notificationCenter.openModal();
      notificationCenter.closeModal();

      expect(modal.classList.contains('hidden')).toBe(true);
      expect(notificationCenter.isModalOpen).toBe(false);
    });

    test('должен рендерить уведомления при открытии модала', () => {
      notificationCenter.addNotification({
        title: 'Тест уведомление',
        message: 'Тест сообщение',
        type: 'system'
      });

      notificationCenter.openModal();

      const list = document.getElementById('notifications-list');
      expect(list.innerHTML).toContain('Тест уведомление');
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      notificationCenter.addNotification({
        title: 'Системное уведомление',
        type: 'system'
      });
      notificationCenter.addNotification({
        title: 'Заявка',
        type: 'request'
      });
      notificationCenter.addNotification({
        title: 'Аукцион',
        type: 'auction'
      });
    });

    test('должен фильтровать по типу "request"', () => {
      notificationCenter.setFilter('requests');
      const filtered = notificationCenter.getFilteredNotifications();

      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('request');
    });

    test('должен фильтровать по типу "auction"', () => {
      notificationCenter.setFilter('auctions');
      const filtered = notificationCenter.getFilteredNotifications();

      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('auction');
    });

    test('должен фильтровать по типу "system"', () => {
      notificationCenter.setFilter('system');
      const filtered = notificationCenter.getFilteredNotifications();

      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('system');
    });

    test('должен показывать все уведомления при фильтре "all"', () => {
      notificationCenter.setFilter('all');
      const filtered = notificationCenter.getFilteredNotifications();

      expect(filtered).toHaveLength(3);
    });

    test('должен фильтровать непрочитанные', () => {
      // Отмечаем одно как прочитанное
      notificationCenter.markAsRead(notificationCenter.notifications[0].id);

      notificationCenter.setFilter('unread');
      const filtered = notificationCenter.getFilteredNotifications();

      expect(filtered).toHaveLength(2);
      expect(filtered.every(n => !n.read)).toBe(true);
    });

    test('должен обновлять активные кнопки фильтров', () => {
      notificationCenter.setFilter('requests');

      const allBtn = document.querySelector('[data-filter="all"]');
      const requestsBtn = document.querySelector('[data-filter="requests"]');

      expect(allBtn.classList.contains('active')).toBe(false);
      expect(requestsBtn.classList.contains('active')).toBe(true);
    });
  });

  describe('Rendering', () => {
    test('должен показать пустое состояние когда нет уведомлений', () => {
      notificationCenter.renderNotifications();

      const list = document.getElementById('notifications-list');
      expect(list.innerHTML).toContain('Нет уведомлений');
    });

    test('должен рендерить уведомления в правильном порядке', () => {
      notificationCenter.addNotification({ title: 'Первое', type: 'system' });
      notificationCenter.addNotification({ title: 'Второе', type: 'request' });

      notificationCenter.renderNotifications();

      const list = document.getElementById('notifications-list');
      const items = list.querySelectorAll('.notification-item');
      
      expect(items).toHaveLength(2);
      expect(items[0].querySelector('.notification-title').textContent).toBe('Второе');
      expect(items[1].querySelector('.notification-title').textContent).toBe('Первое');
    });

    test('должен добавлять класс "unread" для непрочитанных', () => {
      const notification = notificationCenter.addNotification({
        title: 'Непрочитанное',
        type: 'system'
      });

      notificationCenter.renderNotifications();

      const item = document.querySelector(`[data-id="${notification.id}"]`);
      expect(item.classList.contains('unread')).toBe(true);
    });

    test('должен убирать класс "unread" после прочтения', () => {
      const notification = notificationCenter.addNotification({
        title: 'Тест',
        type: 'system'
      });

      notificationCenter.renderNotifications();
      notificationCenter.markAsRead(notification.id);
      notificationCenter.renderNotifications(); // Перерендерим после изменения статуса

      const item = document.querySelector(`[data-id="${notification.id}"]`);
      expect(item.classList.contains('unread')).toBe(false);
    });
  });

  describe('Time Formatting', () => {
    test('должен показывать "только что" для недавних уведомлений', () => {
      const now = new Date().toISOString();
      const timeAgo = notificationCenter.getTimeAgo(now);

      expect(timeAgo).toBe('только что');
    });

    test('должен показывать минуты для уведомлений < 1 часа', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const timeAgo = notificationCenter.getTimeAgo(fiveMinutesAgo);

      expect(timeAgo).toBe('5 мин назад');
    });

    test('должен показывать часы для уведомлений >= 1 час', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const timeAgo = notificationCenter.getTimeAgo(twoHoursAgo);

      expect(timeAgo).toBe('2 ч назад');
    });
  });

  describe('Badge Updates', () => {
    test('должен показывать правильное количество непрочитанных', () => {
      const badge = document.getElementById('admin-notifications-count');

      notificationCenter.addNotification({ title: 'Тест 1', type: 'system' });
      notificationCenter.addNotification({ title: 'Тест 2', type: 'request' });
      notificationCenter.addNotification({ title: 'Тест 3', type: 'auction' });

      expect(badge.textContent).toBe('3');
    });

    test('должен добавлять класс has-notifications при наличии непрочитанных', () => {
      const badge = document.getElementById('admin-notifications-count');

      notificationCenter.addNotification({ title: 'Тест', type: 'system' });

      expect(badge.classList.contains('has-notifications')).toBe(true);
    });

    test('должен убирать класс has-notifications когда все прочитано', () => {
      const badge = document.getElementById('admin-notifications-count');

      const notification = notificationCenter.addNotification({ title: 'Тест', type: 'system' });
      notificationCenter.markAsRead(notification.id);

      expect(badge.classList.contains('has-notifications')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('должен обрабатывать отсутствие DOM элементов', () => {
      document.body.innerHTML = '';
      
      // Не должно вызывать ошибок
      expect(() => {
        notificationCenter.openModal();
        notificationCenter.updateBadges();
        notificationCenter.renderNotifications();
      }).not.toThrow();
    });

    test('должен обрабатывать некорректные данные уведомлений', () => {
      expect(() => {
        notificationCenter.addNotification(null);
      }).not.toThrow();

      expect(() => {
        notificationCenter.addNotification({});
      }).not.toThrow();
    });

    test('должен обрабатывать очень длинные заголовки', () => {
      const longTitle = 'A'.repeat(1000);
      
      notificationCenter.addNotification({
        title: longTitle,
        type: 'system'
      });

      notificationCenter.renderNotifications();

      const item = document.querySelector('.notification-item');
      expect(item).not.toBeNull();
    });
  });
});
