// Тесты AuctionTimer
/**
 * @jest-environment jsdom
 */

const { DOMTestUtils, AsyncTestUtils } = require('../../config/test-helpers');

// Имитация AuctionTimer класса
class TestAuctionTimer {
  constructor() {
    this.timers = new Map();
    this.activeAuctions = new Map();
  }

  createTimer(elementId, deadline, options = {}) {
    const element = document.getElementById(elementId);
    if (!element) return;

    this.stopTimer(elementId);

    const deadlineTime = new Date(deadline).getTime();
    
    const updateTimer = () => {
      const now = new Date().getTime();
      const timeLeft = deadlineTime - now;

      if (timeLeft <= 0) {
        element.innerHTML = options.expiredText || '⏰ Время истекло';
        element.className = options.expiredClass || 'timer-expired';
        this.stopTimer(elementId);
        
        if (options.onExpired) {
          options.onExpired();
        }
        return;
      }

      const timeString = this.formatTimeLeft(timeLeft);
      element.innerHTML = `${options.prefix || '⏰'} ${timeString}`;
      element.className = options.activeClass || 'timer-active';
      
      if (timeLeft <= 3600000) { // Меньше часа
        element.className = options.urgentClass || 'timer-urgent';
      }
    };

    updateTimer();
    
    const interval = setInterval(updateTimer, 1000);
    this.timers.set(elementId, interval);
  }

  stopTimer(elementId) {
    const interval = this.timers.get(elementId);
    if (interval) {
      clearInterval(interval);
      this.timers.delete(elementId);
    }
  }

  stopAllTimers() {
    this.timers.forEach((interval, elementId) => {
      clearInterval(interval);
    });
    this.timers.clear();
  }

  formatTimeLeft(timeLeft) {
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    if (days > 0) {
      return `${days}д ${hours}ч ${minutes}м`;
    } else if (hours > 0) {
      return `${hours}ч ${minutes}м ${seconds}с`;
    } else if (minutes > 0) {
      return `${minutes}м ${seconds}с`;
    } else {
      return `${seconds}с`;
    }
  }

  getAuctionStatus(deadline) {
    const deadlineTime = new Date(deadline).getTime();
    const now = new Date().getTime();
    const timeLeft = deadlineTime - now;

    if (timeLeft <= 0) {
      return { status: 'expired', class: 'timer-expired', text: 'Истек' };
    } else if (timeLeft <= 3600000) { // Меньше часа
      return { status: 'urgent', class: 'timer-urgent', text: 'Срочно' };
    } else if (timeLeft <= 21600000) { // Меньше 6 часов
      return { status: 'warning', class: 'timer-warning', text: 'Скоро' };
    } else {
      return { status: 'active', class: 'timer-active', text: 'Активен' };
    }
  }
}

describe('AuctionTimer', () => {
  let auctionTimer;
  let mockElement;

  beforeEach(() => {
    auctionTimer = new TestAuctionTimer();
    
    // Создаем тестовый элемент
    document.body.innerHTML = `
      <div id="test-timer" class="timer"></div>
      <div id="test-timer-2" class="timer"></div>
    `;
    
    mockElement = document.getElementById('test-timer');
    
    // Мокаем Date.now для предсказуемых тестов
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    auctionTimer.stopAllTimers();
    document.body.innerHTML = '';
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    test('должен инициализироваться с пустыми картами таймеров', () => {
      expect(auctionTimer.timers.size).toBe(0);
      expect(auctionTimer.activeAuctions.size).toBe(0);
    });
  });

  describe('createTimer()', () => {
    test('должен создать новый таймер', () => {
      const deadline = new Date('2024-01-01T13:00:00Z'); // Через час
      
      auctionTimer.createTimer('test-timer', deadline);

      expect(auctionTimer.timers.has('test-timer')).toBe(true);
      expect(mockElement.innerHTML).toContain('1ч 0м 0с');
    });

    test('должен обновлять содержимое элемента', () => {
      const deadline = new Date('2024-01-01T12:30:00Z'); // Через 30 минут
      
      auctionTimer.createTimer('test-timer', deadline);

      expect(mockElement.innerHTML).toContain('30м 0с');
    });

    test('должен применять пользовательские опции', () => {
      const deadline = new Date('2024-01-01T13:00:00Z');
      const options = {
        prefix: '⏳',
        activeClass: 'custom-active'
      };
      
      auctionTimer.createTimer('test-timer', deadline, options);

      expect(mockElement.innerHTML).toContain('⏳');
      expect(mockElement.className).toBe('custom-active');
    });

    test('должен использовать значения по умолчанию', () => {
      const deadline = new Date('2024-01-01T13:00:00Z');
      
      auctionTimer.createTimer('test-timer', deadline);

      expect(mockElement.innerHTML).toContain('⏰');
      expect(mockElement.className).toBe('timer-active');
    });

    test('должен игнорировать несуществующие элементы', () => {
      const deadline = new Date('2024-01-01T13:00:00Z');
      
      expect(() => {
        auctionTimer.createTimer('nonexistent', deadline);
      }).not.toThrow();
      
      expect(auctionTimer.timers.has('nonexistent')).toBe(false);
    });

    test('должен заменять существующий таймер', () => {
      const deadline1 = new Date('2024-01-01T13:00:00Z');
      const deadline2 = new Date('2024-01-01T14:00:00Z');
      
      auctionTimer.createTimer('test-timer', deadline1);
      const firstInterval = auctionTimer.timers.get('test-timer');
      
      auctionTimer.createTimer('test-timer', deadline2);
      const secondInterval = auctionTimer.timers.get('test-timer');
      
      expect(firstInterval).not.toBe(secondInterval);
      expect(mockElement.innerHTML).toContain('2ч 0м 0с');
    });
  });

  describe('Timer Updates', () => {
    test('должен обновляться каждую секунду', () => {
      const deadline = new Date('2024-01-01T12:01:00Z'); // Через минуту
      
      auctionTimer.createTimer('test-timer', deadline);
      
      expect(mockElement.innerHTML).toContain('1м 0с');
      
      // Прокручиваем время на 30 секунд
      jest.advanceTimersByTime(30000);
      
      expect(mockElement.innerHTML).toContain('0м 30с');
    });

    test('должен переключаться в urgent режим', () => {
      const deadline = new Date('2024-01-01T12:30:00Z'); // Через 30 минут
      const options = {
        urgentClass: 'timer-urgent-test'
      };
      
      auctionTimer.createTimer('test-timer', deadline, options);
      
      expect(mockElement.className).toBe('timer-active');
      
      // Прокручиваем время до менее часа
      jest.advanceTimersByTime(25 * 60 * 1000); // 25 минут
      
      expect(mockElement.className).toBe('timer-urgent-test');
    });

    test('должен останавливаться по истечении времени', () => {
      const deadline = new Date('2024-01-01T12:00:30Z'); // Через 30 секунд
      const onExpired = jest.fn();
      
      auctionTimer.createTimer('test-timer', deadline, {
        expiredText: 'Время вышло!',
        expiredClass: 'timer-expired-test',
        onExpired
      });
      
      // Прокручиваем время за дедлайн
      jest.advanceTimersByTime(31000);
      
      expect(mockElement.innerHTML).toBe('Время вышло!');
      expect(mockElement.className).toBe('timer-expired-test');
      expect(onExpired).toHaveBeenCalled();
      expect(auctionTimer.timers.has('test-timer')).toBe(false);
    });
  });

  describe('stopTimer()', () => {
    test('должен остановить конкретный таймер', () => {
      const deadline = new Date('2024-01-01T13:00:00Z');
      
      auctionTimer.createTimer('test-timer', deadline);
      expect(auctionTimer.timers.has('test-timer')).toBe(true);
      
      auctionTimer.stopTimer('test-timer');
      expect(auctionTimer.timers.has('test-timer')).toBe(false);
    });

    test('должен игнорировать несуществующие таймеры', () => {
      expect(() => {
        auctionTimer.stopTimer('nonexistent');
      }).not.toThrow();
    });
  });

  describe('stopAllTimers()', () => {
    test('должен остановить все таймеры', () => {
      const deadline = new Date('2024-01-01T13:00:00Z');
      
      auctionTimer.createTimer('test-timer', deadline);
      auctionTimer.createTimer('test-timer-2', deadline);
      
      expect(auctionTimer.timers.size).toBe(2);
      
      auctionTimer.stopAllTimers();
      
      expect(auctionTimer.timers.size).toBe(0);
    });

    test('должен работать с пустым списком таймеров', () => {
      expect(() => {
        auctionTimer.stopAllTimers();
      }).not.toThrow();
    });
  });

  describe('formatTimeLeft()', () => {
    test('должен форматировать секунды', () => {
      const result = auctionTimer.formatTimeLeft(30000); // 30 секунд
      expect(result).toBe('30с');
    });

    test('должен форматировать минуты и секунды', () => {
      const result = auctionTimer.formatTimeLeft(90000); // 1 минута 30 секунд
      expect(result).toBe('1м 30с');
    });

    test('должен форматировать часы, минуты и секунды', () => {
      const result = auctionTimer.formatTimeLeft(3690000); // 1 час 1 минута 30 секунд
      expect(result).toBe('1ч 1м 30с');
    });

    test('должен форматировать дни, часы и минуты', () => {
      const result = auctionTimer.formatTimeLeft(90060000); // 1 день 1 час 1 минута
      expect(result).toBe('1д 1ч 1м');
    });

    test('должен обрабатывать ноль', () => {
      const result = auctionTimer.formatTimeLeft(0);
      expect(result).toBe('0с');
    });

    test('должен обрабатывать отрицательные значения', () => {
      const result = auctionTimer.formatTimeLeft(-1000);
      expect(result).toBe('0с'); // Отрицательные секунды становятся 0
    });
  });

  describe('getAuctionStatus()', () => {
    test('должен вернуть статус "expired" для прошедшего времени', () => {
      const pastDeadline = new Date('2024-01-01T11:00:00Z'); // Час назад
      
      const status = auctionTimer.getAuctionStatus(pastDeadline);
      
      expect(status).toEqual({
        status: 'expired',
        class: 'timer-expired',
        text: 'Истек'
      });
    });

    test('должен вернуть статус "urgent" для времени < 1 час', () => {
      const deadline = new Date('2024-01-01T12:30:00Z'); // Через 30 минут
      
      const status = auctionTimer.getAuctionStatus(deadline);
      
      expect(status).toEqual({
        status: 'urgent',
        class: 'timer-urgent',
        text: 'Срочно'
      });
    });

    test('должен вернуть статус "warning" для времени < 6 часов', () => {
      const deadline = new Date('2024-01-01T15:00:00Z'); // Через 3 часа
      
      const status = auctionTimer.getAuctionStatus(deadline);
      
      expect(status).toEqual({
        status: 'warning',
        class: 'timer-warning',
        text: 'Скоро'
      });
    });

    test('должен вернуть статус "active" для времени > 6 часов', () => {
      const deadline = new Date('2024-01-01T20:00:00Z'); // Через 8 часов
      
      const status = auctionTimer.getAuctionStatus(deadline);
      
      expect(status).toEqual({
        status: 'active',
        class: 'timer-active',
        text: 'Активен'
      });
    });
  });

  describe('Multiple Timers', () => {
    test('должен управлять несколькими таймерами одновременно', () => {
      const deadline1 = new Date('2024-01-01T13:00:00Z');
      const deadline2 = new Date('2024-01-01T14:00:00Z');
      
      auctionTimer.createTimer('test-timer', deadline1);
      auctionTimer.createTimer('test-timer-2', deadline2);
      
      expect(auctionTimer.timers.size).toBe(2);
      
      const element1 = document.getElementById('test-timer');
      const element2 = document.getElementById('test-timer-2');
      
      expect(element1.innerHTML).toContain('1ч 0м 0с');
      expect(element2.innerHTML).toContain('2ч 0м 0с');
    });

    test('должен останавливать таймеры независимо', () => {
      const deadline = new Date('2024-01-01T13:00:00Z');
      
      auctionTimer.createTimer('test-timer', deadline);
      auctionTimer.createTimer('test-timer-2', deadline);
      
      auctionTimer.stopTimer('test-timer');
      
      expect(auctionTimer.timers.has('test-timer')).toBe(false);
      expect(auctionTimer.timers.has('test-timer-2')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('должен обрабатывать некорректные даты', () => {
      expect(() => {
        auctionTimer.createTimer('test-timer', 'invalid-date');
      }).not.toThrow();
    });

    test('должен обрабатывать null deadline', () => {
      expect(() => {
        auctionTimer.createTimer('test-timer', null);
      }).not.toThrow();
    });

    test('должен обрабатывать удаление элемента во время работы таймера', () => {
      const deadline = new Date('2024-01-01T13:00:00Z');
      
      auctionTimer.createTimer('test-timer', deadline);
      
      // Удаляем элемент из DOM
      mockElement.remove();
      
      // Таймер должен продолжать работать без ошибок
      expect(() => {
        jest.advanceTimersByTime(1000);
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    test('должен эффективно управлять множественными таймерами', () => {
      const deadline = new Date('2024-01-01T13:00:00Z');
      
      // Создаем много элементов
      for (let i = 0; i < 100; i++) {
        const element = document.createElement('div');
        element.id = `timer-${i}`;
        document.body.appendChild(element);
        auctionTimer.createTimer(`timer-${i}`, deadline);
      }
      
      expect(auctionTimer.timers.size).toBe(100);
      
      // Остановка всех таймеров должна быть быстрой
      const start = performance.now();
      auctionTimer.stopAllTimers();
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(10); // Менее 10мс
      expect(auctionTimer.timers.size).toBe(0);
    });
  });

  describe('Memory Management', () => {
    test('должен очищать интервалы при остановке', () => {
      const deadline = new Date('2024-01-01T13:00:00Z');
      
      auctionTimer.createTimer('test-timer', deadline);
      const intervalId = auctionTimer.timers.get('test-timer');
      
      // Мокаем clearInterval для проверки
      const originalClearInterval = global.clearInterval;
      global.clearInterval = jest.fn();
      
      auctionTimer.stopTimer('test-timer');
      
      expect(global.clearInterval).toHaveBeenCalledWith(intervalId);
      
      global.clearInterval = originalClearInterval;
    });

    test('должен автоматически очищать истекшие таймеры', () => {
      const deadline = new Date('2024-01-01T12:00:01Z'); // Через 1 секунду
      
      auctionTimer.createTimer('test-timer', deadline);
      expect(auctionTimer.timers.size).toBe(1);
      
      // Прокручиваем время за дедлайн
      jest.advanceTimersByTime(2000);
      
      expect(auctionTimer.timers.size).toBe(0);
    });
  });
});
