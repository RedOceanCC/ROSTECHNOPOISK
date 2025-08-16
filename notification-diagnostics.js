// 🔧 ДИАГНОСТИЧЕСКИЙ МОДУЛЬ ДЛЯ УВЕДОМЛЕНИЙ НА ПРОДЕ
// Добавьте этот скрипт на страницу для детальной диагностики

class NotificationDiagnostics {
  constructor() {
    this.startTime = Date.now();
    this.logs = [];
  }

  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const entry = {
      timestamp,
      level,
      message,
      data,
      elapsed: Date.now() - this.startTime
    };
    
    this.logs.push(entry);
    console.log(`[${level.toUpperCase()}] ${message}`, data);
    
    // Отправляем критические ошибки на сервер
    if (level === 'error') {
      this.sendToServer(entry);
    }
  }

  async sendToServer(logEntry) {
    try {
      await fetch('/api/logs/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'notification_diagnostics',
          ...logEntry
        }),
        credentials: 'include'
      });
    } catch (e) {
      console.warn('Не удалось отправить диагностику на сервер:', e);
    }
  }

  // Основная диагностика
  async runFullDiagnostics() {
    this.log('info', '🔧 ЗАПУСК ПОЛНОЙ ДИАГНОСТИКИ УВЕДОМЛЕНИЙ');
    
    // 1. Проверка окружения
    await this.checkEnvironment();
    
    // 2. Проверка DOM элементов
    this.checkDOMElements();
    
    // 3. Проверка глобальных объектов
    this.checkGlobalObjects();
    
    // 4. Проверка API
    await this.checkAPI();
    
    // 5. Проверка авторизации
    await this.checkAuth();
    
    // 6. Проверка инициализации
    this.checkInitialization();
    
    // 7. Создание отчета
    this.generateReport();
  }

  checkEnvironment() {
    this.log('info', '🌍 Проверка окружения');
    
    const env = {
      userAgent: navigator.userAgent,
      url: window.location.href,
      protocol: window.location.protocol,
      nodeEnv: window.NODE_ENV || 'unknown',
      timestamp: new Date().toISOString()
    };
    
    this.log('info', 'Окружение проверено', env);
  }

  checkDOMElements() {
    this.log('info', '📄 Проверка DOM элементов');
    
    const elements = {
      notificationBtns: document.querySelectorAll('.notifications-btn').length,
      notificationModal: !!document.getElementById('notifications-modal'),
      notificationsList: !!document.getElementById('notifications-list'),
      notificationBadges: document.querySelectorAll('.notifications-badge').length,
      markAllBtn: !!document.getElementById('mark-all-read-btn'),
      notificationFilters: document.querySelectorAll('.notifications-filter').length
    };
    
    this.log('info', 'DOM элементы проверены', elements);
    
    // Проверяем CSS классы модального окна
    const modal = document.getElementById('notifications-modal');
    if (modal) {
      const modalState = {
        classes: Array.from(modal.classList),
        hidden: modal.classList.contains('hidden'),
        display: window.getComputedStyle(modal).display,
        visibility: window.getComputedStyle(modal).visibility
      };
      this.log('info', 'Состояние модального окна', modalState);
    }
  }

  checkGlobalObjects() {
    this.log('info', '🌐 Проверка глобальных объектов');
    
    const globals = {
      notifications: typeof window.notifications,
      notificationManager: typeof window.notificationManager,
      notificationCenter: typeof window.notificationCenter,
      clientLogger: typeof window.clientLogger,
      apiRequest: typeof window.apiRequest,
      fetch: typeof window.fetch,
      console: typeof window.console
    };
    
    this.log('info', 'Глобальные объекты проверены', globals);
    
    // Детальная проверка NotificationCenter
    if (window.notificationCenter) {
      const centerState = {
        notifications: window.notificationCenter.notifications?.length || 0,
        currentFilter: window.notificationCenter.currentFilter,
        isModalOpen: window.notificationCenter.isModalOpen,
        pollInterval: !!window.notificationCenter.pollInterval,
        lastUpdateTime: window.notificationCenter.lastUpdateTime
      };
      this.log('info', 'Состояние NotificationCenter', centerState);
    }
  }

  async checkAPI() {
    this.log('info', '🌐 Проверка API');
    
    const apiTests = [];
    
    // Тест 1: Проверка fetch
    try {
      const healthResponse = await fetch('/api/health');
      const healthData = await healthResponse.json();
      apiTests.push({
        test: 'health_endpoint',
        status: healthResponse.status,
        success: healthData.success,
        data: healthData
      });
    } catch (error) {
      apiTests.push({
        test: 'health_endpoint',
        error: error.message
      });
    }
    
    // Тест 2: Проверка window.apiRequest
    if (window.apiRequest) {
      try {
        const notificationResponse = await window.apiRequest('/notifications');
        apiTests.push({
          test: 'notifications_api',
          success: notificationResponse.success,
          count: notificationResponse.notifications?.length || 0,
          data: notificationResponse
        });
      } catch (error) {
        apiTests.push({
          test: 'notifications_api',
          error: error.message
        });
      }
    } else {
      apiTests.push({
        test: 'notifications_api',
        error: 'window.apiRequest недоступен'
      });
    }
    
    this.log('info', 'API тесты завершены', apiTests);
  }

  async checkAuth() {
    this.log('info', '🔐 Проверка авторизации');
    
    try {
      const response = await fetch('/api/users/current', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const userData = await response.json();
        this.log('info', 'Пользователь авторизован', {
          userId: userData.user?.id,
          userName: userData.user?.name,
          role: userData.user?.role
        });
      } else {
        this.log('warn', 'Пользователь не авторизован', {
          status: response.status,
          statusText: response.statusText
        });
      }
    } catch (error) {
      this.log('error', 'Ошибка проверки авторизации', {
        error: error.message
      });
    }
  }

  checkInitialization() {
    this.log('info', '⚙️ Проверка инициализации');
    
    // Проверяем DOMContentLoaded
    const domState = {
      readyState: document.readyState,
      domContentLoaded: document.readyState === 'complete' || document.readyState === 'interactive'
    };
    
    this.log('info', 'Состояние DOM', domState);
    
    // Проверяем обработчики событий
    const eventListeners = {
      notificationBtns: 0,
      modalClose: 0,
      filters: 0
    };
    
    // Попытка найти обработчики (приблизительно)
    document.querySelectorAll('.notifications-btn').forEach(btn => {
      if (btn.onclick || btn.addEventListener.length) {
        eventListeners.notificationBtns++;
      }
    });
    
    this.log('info', 'Обработчики событий', eventListeners);
  }

  generateReport() {
    this.log('info', '📊 ГЕНЕРАЦИЯ ОТЧЕТА');
    
    const report = {
      totalTime: Date.now() - this.startTime,
      totalLogs: this.logs.length,
      errors: this.logs.filter(log => log.level === 'error').length,
      warnings: this.logs.filter(log => log.level === 'warn').length,
      recommendations: this.generateRecommendations()
    };
    
    this.log('info', 'Диагностика завершена', report);
    
    // Сохраняем отчет в localStorage для отладки
    localStorage.setItem('notificationDiagnostics', JSON.stringify({
      timestamp: new Date().toISOString(),
      logs: this.logs,
      report
    }));
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Анализ логов и генерация рекомендаций
    const hasApiErrors = this.logs.some(log => 
      log.level === 'error' && log.message.includes('API')
    );
    
    const hasAuthErrors = this.logs.some(log => 
      log.level === 'error' && log.message.includes('авторизац')
    );
    
    const hasInitErrors = this.logs.some(log => 
      log.level === 'error' && log.message.includes('инициализац')
    );
    
    if (hasApiErrors) {
      recommendations.push('Проверьте работу backend API и базы данных');
    }
    
    if (hasAuthErrors) {
      recommendations.push('Проверьте настройки авторизации и сессий');
    }
    
    if (hasInitErrors) {
      recommendations.push('Проверьте порядок загрузки скриптов');
    }
    
    if (!window.notificationCenter) {
      recommendations.push('NotificationCenter не инициализирован - проверьте notifications.js');
    }
    
    return recommendations;
  }

  // Быстрая диагностика - только критичные проверки
  quickDiagnostics() {
    const issues = [];
    
    if (!window.notificationCenter) {
      issues.push('❌ NotificationCenter не инициализирован');
    }
    
    if (!window.apiRequest) {
      issues.push('⚠️ window.apiRequest недоступен');
    }
    
    if (!document.getElementById('notifications-modal')) {
      issues.push('❌ Модальное окно уведомлений не найдено');
    }
    
    if (document.querySelectorAll('.notifications-btn').length === 0) {
      issues.push('❌ Кнопки уведомлений не найдены');
    }
    
    console.log('🔍 БЫСТРАЯ ДИАГНОСТИКА УВЕДОМЛЕНИЙ:');
    if (issues.length === 0) {
      console.log('✅ Все основные компоненты на месте');
    } else {
      issues.forEach(issue => console.log(issue));
    }
    
    return issues;
  }
}

// Автоматически создаем экземпляр и запускаем быструю диагностику
window.notificationDiagnostics = new NotificationDiagnostics();

// Запускаем быструю диагностику при загрузке
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    window.notificationDiagnostics.quickDiagnostics();
  }, 1000);
});

// Функция для ручного запуска полной диагностики из консоли
window.runNotificationDiagnostics = () => {
  return window.notificationDiagnostics.runFullDiagnostics();
};

console.log('🔧 Модуль диагностики уведомлений загружен');
console.log('💡 Запустите runNotificationDiagnostics() для полной диагностики');
