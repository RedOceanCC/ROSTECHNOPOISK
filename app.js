// Конфигурация API
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3001/api'
  : '/api';

// Глобальные данные приложения
const appData = {
  currentUser: null,
  equipmentTypes: {} // Будет загружено с сервера
};

// API функции
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  try {
    console.log(`🌐 API запрос: ${options.method || 'GET'} ${url}`);
    
    const response = await fetch(url, config);
    
    console.log(`📡 Ответ сервера: ${response.status} ${response.statusText}`);
    
    // Проверяем, является ли ответ JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('❌ Сервер вернул не JSON:', text);
      return {
        success: false,
        status: response.status,
        message: `Сервер вернул ${response.status}: ${text.substring(0, 200)}`,
        error: 'INVALID_RESPONSE_TYPE'
      };
    }
    
    const data = await response.json();
    console.log('📋 Данные ответа:', data);
    
    // Для неудачных запросов возвращаем данные с информацией об ошибке
    // вместо броска исключения, чтобы вызывающий код мог обработать ошибку
    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        message: data.message || `HTTP ${response.status}: ${response.statusText}`,
        ...data
      };
    }
    
    return data;
  } catch (error) {
    console.error('❌ API Error:', error);
    console.error('❌ URL:', url);
    console.error('❌ Config:', config);
    
    // Возвращаем объект ошибки вместо броска исключения
    return {
      success: false,
      status: 0,
      message: error.message || 'Ошибка сети или сервера',
      error: 'NETWORK_ERROR',
      originalError: error
    };
  }
}

// Утилиты
function showPage(pageId) {
  // Очищаем все таймеры при смене страницы
  if (typeof auctionTimer !== 'undefined') {
    auctionTimer.stopAllTimers();
  }
  
  // Останавливаем автообновление
  if (typeof realTimeUpdater !== 'undefined') {
    realTimeUpdater.stop();
  }
  
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
}

function showTab(tabId) {
  // Очищаем таймеры при смене табов
  if (typeof auctionTimer !== 'undefined') {
    auctionTimer.stopAllTimers();
  }
  
  // Скрываем все табы
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  
  // Показываем нужный таб
  const targetTab = document.getElementById(tabId);
  if (targetTab) {
    targetTab.classList.add('active');
  } else {
    console.error(`Таб "${tabId}" не найден!`);
  }
  
  // Обновляем кнопки
  document.querySelectorAll('.sidebar-nav-item[data-tab]').forEach(item => {
    item.classList.remove('active');
  });
  
  const buttonDataTab = tabId.replace('-tab', '');
  const tabButton = document.querySelector(`[data-tab="${buttonDataTab}"]`);
  if (tabButton) {
    tabButton.classList.add('active');
  } else {
    console.error(`Кнопка для "${buttonDataTab}" не найдена!`);
  }
}

function showModal(modalId) {
  document.getElementById(modalId).classList.remove('hidden');
}

function hideModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
}

// generateId больше не нужна, ID генерируются на сервере

function formatDate(date) {
  return new Date(date).toLocaleDateString('ru-RU');
}

// Глобальные функции для onclick handlers
window.deleteUser = async function(userId) {
  if (userId === appData.currentUser.id) {
    alert('Нельзя удалить текущего пользователя');
    return;
  }
  
  if (confirm('Вы уверены, что хотите удалить этого пользователя?')) {
    try {
      await apiRequest(`/users/${userId}`, { method: 'DELETE' });
      await renderUsersTable();
      alert('Пользователь удален успешно');
    } catch (error) {
      alert('Ошибка при удалении пользователя: ' + error.message);
    }
  }
};

window.deleteEquipment = async function(equipmentId) {
  if (confirm('Вы уверены, что хотите удалить эту технику?')) {
    try {
      await apiRequest(`/equipment/${equipmentId}`, { method: 'DELETE' });
      await renderEquipmentGrid();
      alert('Техника удалена успешно');
    } catch (error) {
      alert('Ошибка при удалении техники: ' + error.message);
    }
  }
};

window.editEquipment = function(equipmentId) {
  alert('Функция редактирования будет добавлена в следующих версиях');
};

window.editUser = async function(userId) {
  try {
    // Получаем данные пользователя
    const response = await apiRequest(`/users/${userId}`);
    if (!response.success) {
      throw new Error(response.message);
    }
    
    const user = response.user;
    
    // Заполняем форму
    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('edit-user-name').value = user.name;
    document.getElementById('edit-user-phone').value = user.phone || '';
    document.getElementById('edit-user-telegram-id').value = user.telegram_id || '';
    document.getElementById('edit-user-role').value = user.role;
    document.getElementById('edit-user-company').value = user.company_id || '';
    document.getElementById('edit-user-password').value = '';
    
    // Загружаем список компаний и открываем модал
    await populateEditCompaniesSelect();
    showModal('edit-user-modal');
  } catch (error) {
    alert('Ошибка при загрузке данных пользователя: ' + error.message);
  }
};

window.deleteCompany = async function(companyId) {
  if (confirm('Вы уверены, что хотите удалить эту компанию? Это действие нельзя отменить.')) {
    try {
      await apiRequest(`/companies/${companyId}`, { method: 'DELETE' });
      await renderCompaniesTable();
      
      if (window.notificationManager) {
        window.notificationManager.show('Компания удалена успешно', 'success');
      } else {
        alert('Компания удалена успешно');
      }
    } catch (error) {
      console.error('Ошибка при удалении компании:', error);
      
      if (window.notificationManager) {
        window.notificationManager.show('Ошибка при удалении компании: ' + error.message, 'error');
      } else {
        alert('Ошибка при удалении компании: ' + error.message);
      }
    }
  }
};

window.editCompany = function(companyId) {
  if (window.notificationManager) {
    window.notificationManager.show('Функция редактирования будет добавлена в следующих версиях', 'info');
  } else {
    alert('Функция редактирования будет добавлена в следующих версиях');
  }
};

// Функция показа результатов аукциона
window.showAuctionResults = async function(requestId) {
  console.log(`🔍 Загружаем результаты аукциона #${requestId}...`);
  
  const response = await apiRequest(`/requests/${requestId}/results`);
  console.log('📋 Ответ API:', response);
  
  if (!response.success) {
    console.warn(`⚠️ Ошибка загрузки результатов: ${response.message}`);
    
    // Если аукцион еще не завершен, показываем информативное сообщение
    if (response.message && response.message.includes('не завершен')) {
      alert('⏳ Аукцион еще обрабатывается на сервере. Попробуйте через несколько секунд.');
      return;
    }
    
    alert('Ошибка загрузки результатов аукциона: ' + (response.message || 'Неизвестная ошибка'));
    return;
  }

  const { request, winner, statistics } = response;
  
  const modal = document.getElementById('auction-results-modal');
  if (!modal) {
    console.error('Модальное окно результатов аукциона не найдено');
    return;
  }

  const content = document.getElementById('auction-results-content');
  
  let resultsHTML = `
    <div class="auction-results-header">
      <h3>🏁 Результаты аукциона</h3>
      <div class="auction-info">
        <h4>${request.equipment_type} - ${request.equipment_subtype}</h4>
        <p><strong>Местоположение:</strong> ${request.location}</p>
        <p><strong>Период:</strong> ${formatDate(request.start_date)} - ${formatDate(request.end_date)}</p>
        <p><strong>Завершен:</strong> ${new Date(request.auction_deadline).toLocaleString()}</p>
      </div>
    </div>
  `;

  if (winner) {
    resultsHTML += `
      <div class="winner-section">
        <div class="winner-header">
          <span class="winner-icon">🏆</span>
          <h4>Победитель аукциона</h4>
        </div>
        <div class="winner-contact-card">
          <div class="contact-info">
            <div class="contact-field">
              <span class="contact-label">👤 Имя:</span>
              <span class="contact-value">${winner.owner_name}</span>
            </div>
            <div class="contact-field">
              <span class="contact-label">📞 Телефон:</span>
              <span class="contact-value">
                <a href="tel:${winner.owner_phone}" class="phone-link">${winner.owner_phone}</a>
              </span>
            </div>
            ${winner.company_name ? `
              <div class="contact-field">
                <span class="contact-label">🏢 Компания:</span>
                <span class="contact-value">${winner.company_name}</span>
              </div>
            ` : ''}
            <div class="contact-field">
              <span class="contact-label">🚜 Техника:</span>
              <span class="contact-value">${winner.equipment_name}</span>
            </div>
          </div>
          <div class="price-info">
            <div class="price-main">
              <span class="price-label">💰 Итоговая цена:</span>
              <span class="price-value">${winner.total_price.toLocaleString()} ₽</span>
            </div>
            ${winner.hourly_rate ? `
              <div class="price-detail">
                <span class="price-label">Почасовая ставка:</span>
                <span class="price-value">${winner.hourly_rate.toLocaleString()} ₽/час</span>
              </div>
            ` : ''}
            ${winner.daily_rate ? `
              <div class="price-detail">
                <span class="price-label">Дневная ставка:</span>
                <span class="price-value">${winner.daily_rate.toLocaleString()} ₽/день</span>
              </div>
            ` : ''}
          </div>
        </div>
        ${winner.comment ? `
          <div class="winner-comment">
            <h5>💬 Комментарий:</h5>
            <p>${winner.comment}</p>
          </div>
        ` : ''}
      </div>
    `;
  } else {
    resultsHTML += `
      <div class="no-winner-section">
        <div class="no-winner-card">
          <span class="no-winner-icon">❌</span>
          <h4>Аукцион завершен без победителя</h4>
          <p>К сожалению, на данный аукцион не было подано ни одной ставки.</p>
        </div>
      </div>
    `;
  }

  if (statistics.total_bids > 0) {
    resultsHTML += `
      <div class="statistics-section">
        <h4>📊 Статистика аукциона</h4>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Всего ставок:</span>
            <span class="stat-value">${statistics.total_bids}</span>
          </div>
          ${statistics.min_price ? `
            <div class="stat-item">
              <span class="stat-label">Минимальная цена:</span>
              <span class="stat-value">${statistics.min_price.toLocaleString()} ₽</span>
            </div>
          ` : ''}
          ${statistics.max_price ? `
            <div class="stat-item">
              <span class="stat-label">Максимальная цена:</span>
              <span class="stat-value">${statistics.max_price.toLocaleString()} ₽</span>
            </div>
          ` : ''}
          ${statistics.avg_price ? `
            <div class="stat-item">
              <span class="stat-label">Средняя цена:</span>
              <span class="stat-value">${statistics.avg_price.toLocaleString()} ₽</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  content.innerHTML = resultsHTML;
  showModal('auction-results-modal');
};



window.respondToOrder = async function(orderId) {
  try {
    // Получаем детали заявки
    const response = await apiRequest(`/requests/${orderId}`);
    if (!response.success) {
      alert('Ошибка загрузки заявки');
      return;
    }
    
    const order = response.request;
  const modal = document.getElementById('respond-order-modal');
  const detailsDiv = document.getElementById('order-details-display');
    const equipmentSelect = document.getElementById('bid-equipment');
  
    // Отображаем детали заявки
  detailsDiv.innerHTML = `
    <h4>Детали заявки</h4>
      <p><strong>Тип техники:</strong> ${order.equipment_type}</p>
      <p><strong>Подтип:</strong> ${order.equipment_subtype}</p>
      <p><strong>Период:</strong> ${formatDate(order.start_date)} - ${formatDate(order.end_date)}</p>
    <p><strong>Местоположение:</strong> ${order.location}</p>
      <p><strong>Описание:</strong> ${order.work_description}</p>
      <p><strong>Заказчик:</strong> ${order.manager_name || 'Неизвестно'}</p>
      ${order.auction_deadline ? `<p><strong>Дедлайн:</strong> ${new Date(order.auction_deadline).toLocaleString()}</p>` : ''}
    `;
    
    // Загружаем подходящую технику пользователя
    const equipmentResponse = await apiRequest('/equipment');
    if (equipmentResponse.success) {
      const userEquipment = equipmentResponse.equipment.filter(eq => 
        eq.type === order.equipment_type && 
        eq.subtype === order.equipment_subtype &&
        eq.status === 'available'
      );
      
      equipmentSelect.innerHTML = '<option value="">Выберите технику</option>';
      userEquipment.forEach(equipment => {
        const option = document.createElement('option');
        option.value = equipment.id;
        option.textContent = `${equipment.name} (${equipment.location || 'Местоположение не указано'})`;
        equipmentSelect.appendChild(option);
      });
      
      if (userEquipment.length === 0) {
        equipmentSelect.innerHTML = '<option value="">У вас нет подходящей техники</option>';
        alert('У вас нет подходящей техники для этой заявки');
        return;
      }
    }
    
    showModal('respond-order-modal');
    modal.dataset.orderId = orderId;
    
  } catch (error) {
    alert('Ошибка: ' + error.message);
  }
};

// Старые функции удалены, так как теперь используется аукционная система

// Система авторизации
async function handleLogin(event) {
  event.preventDefault();
  
  const passwordInput = document.getElementById('password');
  const loginError = document.getElementById('login-error');
  const password = passwordInput.value.trim();
  
  const response = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password })
  });
  
  if (response.success) {
    appData.currentUser = response.user;
    loginError.classList.add('hidden');
    
    // Загружаем типы техники
    await loadEquipmentTypes();
    
    switch (response.user.role) {
      case 'admin':
        showPage('admin-dashboard');
        await initAdminDashboard();
        break;
      case 'owner':
        showPage('owner-dashboard');
        await initOwnerDashboard();
        break;
      case 'manager':
        showPage('manager-dashboard');
        await initManagerDashboard();
        break;
    }
  } else {
    loginError.classList.remove('hidden');
    loginError.textContent = response.message || 'Ошибка авторизации';
    passwordInput.value = '';
  }
}

async function handleLogout() {
  const response = await apiRequest('/auth/logout', { method: 'POST' });
  if (!response.success) {
    console.error('Ошибка при выходе:', response);
  }
  
  appData.currentUser = null;
  showPage('login-page');
  document.getElementById('password').value = '';
  document.getElementById('login-error').classList.add('hidden');
}

// Загрузка типов техники с сервера
async function loadEquipmentTypes() {
  const response = await apiRequest('/equipment/equipment-types');
  if (response.success) {
    appData.equipmentTypes = response.data;
    console.log('Типы техники загружены:', appData.equipmentTypes);
    
    // Обновляем все выпадающие списки после загрузки
    updateEquipmentTypeSelects();
  } else {
    console.error('Ошибка загрузки типов техники:', response);
    // Используем резервные данные
    appData.equipmentTypes = {
      "Самосвал": ["3-осный (6x4)", "4-осный (8x4)"],
      "Автокран (колёсный)": ["16 т", "25 т", "32 т"],
      "Экскаватор (гусеничный, полноповоротный)": ["Мини (2 т)", "Средний (20 т)"]
    };
    updateEquipmentTypeSelects();
  }
}

// Обновление всех выпадающих списков типов техники
function updateEquipmentTypeSelects() {
  // Обновляем список типов в форме добавления техники
  const equipmentTypeSelect = document.getElementById('equipment-type');
  if (equipmentTypeSelect) {
    equipmentTypeSelect.innerHTML = '<option value="">Выберите тип</option>';
    Object.keys(appData.equipmentTypes).forEach(type => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type;
      equipmentTypeSelect.appendChild(option);
    });
  }
  
  // Обновляем список типов в форме создания заявки
  const orderTypeSelect = document.getElementById('order-type');
  if (orderTypeSelect) {
    orderTypeSelect.innerHTML = '<option value="">Выберите тип техники</option>';
    Object.keys(appData.equipmentTypes).forEach(type => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type;
      orderTypeSelect.appendChild(option);
    });
  }
}

// Админский дашборд
async function initAdminDashboard() {
  // Настраиваем табы сначала
  setupAdminTabs();

  // Рендерим только активную вкладку (Пользователи)
  await renderUsersTable();
  setupCreateUserModal();
  setupEditUserModal();
  setupCreateCompanyModal();

  // Запускаем автообновление
  realTimeUpdater.start('admin-dashboard');

  // Остальные вкладки загружаются по требованию
}

async function renderUsersTable() {
  const tbody = document.getElementById('users-table-body');
  tbody.innerHTML = '<tr><td colspan="6">Загрузка...</td></tr>';
  
  try {
    const response = await apiRequest('/users');
    if (response.success) {
      tbody.innerHTML = '';
      
      response.users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${user.id}</td>
          <td>${user.name}</td>
          <td>${getRoleLabel(user.role)}</td>
          <td>${user.company_name || 'Не назначена'}</td>
          <td>${user.telegram_id || '<span class="text-muted">Не указан</span>'}</td>
          <td>
            <button class="btn btn--secondary btn--small" onclick="editUser(${user.id})" style="margin-right: 8px;">
              Редактировать
            </button>
            <button class="btn btn--danger btn--small" onclick="deleteUser(${user.id})">
              Удалить
            </button>
          </td>
        `;
        tbody.appendChild(row);
      });
    }
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="6">Ошибка загрузки: ${error.message}</td></tr>`;
  }
}

function getRoleLabel(role) {
  const labels = {
    admin: 'Администратор',
    owner: 'Владелец техники',
    manager: 'Менеджер'
  };
  return labels[role] || role;
}

function setupCreateUserModal() {
  const createBtn = document.getElementById('create-user-btn');
  const modal = document.getElementById('create-user-modal');
  const form = document.getElementById('create-user-form');
  
  createBtn.onclick = async () => {
    // Загружаем список компаний перед открытием модала
    await populateCompaniesSelect();
    showModal('create-user-modal');
  };
  
  modal.querySelector('.modal-close').onclick = () => hideModal('create-user-modal');
  modal.querySelector('.modal-cancel').onclick = () => hideModal('create-user-modal');
  modal.querySelector('.modal-backdrop').onclick = () => hideModal('create-user-modal');
  
  form.onsubmit = async (e) => {
    e.preventDefault();
    
    const newUser = {
      name: document.getElementById('new-user-name').value,
      phone: document.getElementById('new-user-phone').value,
      telegram_id: document.getElementById('new-user-telegram-id').value || null,
      role: document.getElementById('new-user-role').value,
      company_id: parseInt(document.getElementById('new-user-company').value) || null,
      password: document.getElementById('new-user-password').value
    };
    
    try {
      await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify(newUser)
      });
      
      await renderUsersTable();
    hideModal('create-user-modal');
    form.reset();
      alert('Пользователь создан успешно');
    } catch (error) {
      alert('Ошибка при создании пользователя: ' + error.message);
    }
  };
}

// Настройка модального окна редактирования пользователя
function setupEditUserModal() {
  const modal = document.getElementById('edit-user-modal');
  const form = document.getElementById('edit-user-form');
  
  modal.querySelector('.modal-close').onclick = () => hideModal('edit-user-modal');
  modal.querySelector('.modal-cancel').onclick = () => hideModal('edit-user-modal');
  modal.querySelector('.modal-backdrop').onclick = () => hideModal('edit-user-modal');
  
  form.onsubmit = async (e) => {
    e.preventDefault();
    
    const userId = document.getElementById('edit-user-id').value;
    const userData = {
      name: document.getElementById('edit-user-name').value,
      phone: document.getElementById('edit-user-phone').value || null,
      telegram_id: document.getElementById('edit-user-telegram-id').value || null,
      role: document.getElementById('edit-user-role').value,
      company_id: parseInt(document.getElementById('edit-user-company').value) || null
    };
    
    const password = document.getElementById('edit-user-password').value;
    if (password) {
      userData.password = password;
    }
    
    try {
      await apiRequest(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(userData)
      });
      
      await renderUsersTable();
      hideModal('edit-user-modal');
      form.reset();
      alert('Пользователь обновлен успешно');
    } catch (error) {
      alert('Ошибка при обновлении пользователя: ' + error.message);
    }
  };
}

// Заполнение списка компаний в форме создания пользователя
async function populateCompaniesSelect() {
  const select = document.getElementById('new-user-company');
  
  if (!select) {
    console.error('Селект компаний не найден!');
    return;
  }
  
  try {
    const response = await apiRequest('/companies');
    
    if (response.success && response.companies) {
      // Очищаем список
      select.innerHTML = '<option value="">Выберите компанию</option>';
      
      let activeCompaniesCount = 0;
      
      // Добавляем компании
      response.companies.forEach(company => {
        if (company.status === 'active') { // Только активные компании
          const option = document.createElement('option');
          option.value = company.id;
          option.textContent = company.name;
          select.appendChild(option);
          activeCompaniesCount++;
        }
      });
      
      if (activeCompaniesCount === 0) {
        select.innerHTML = '<option value="">Нет активных компаний</option>';
      }
    } else {
      console.error('Некорректный ответ API компаний:', response);
      select.innerHTML = '<option value="">Ошибка загрузки компаний</option>';
    }
  } catch (error) {
    console.error('Ошибка загрузки компаний:', error);
    select.innerHTML = '<option value="">Ошибка загрузки компаний</option>';
  }
}

// Заполнение списка компаний в форме редактирования пользователя
async function populateEditCompaniesSelect() {
  const select = document.getElementById('edit-user-company');
  
  if (!select) {
    console.error('Селект компаний для редактирования не найден!');
    return;
  }
  
  try {
    const response = await apiRequest('/companies');
    
    if (response.success && response.companies) {
      // Сохраняем текущее значение
      const currentValue = select.value;
      
      // Очищаем и заполняем опции
      select.innerHTML = '<option value="">Выберите компанию</option>';
      
      response.companies.forEach(company => {
        if (company.status === 'active') {
          const option = document.createElement('option');
          option.value = company.id;
          option.textContent = company.name;
          select.appendChild(option);
        }
      });
      
      // Восстанавливаем значение
      select.value = currentValue;
    } else {
      select.innerHTML = '<option value="">Ошибка загрузки компаний</option>';
    }
  } catch (error) {
    console.error('Ошибка при загрузке компаний:', error);
    select.innerHTML = '<option value="">Ошибка загрузки компаний</option>';
  }
}

// Управление вкладками админа
function setupAdminTabs() {
  const tabItems = document.querySelectorAll('#admin-dashboard .sidebar-nav-item[data-tab]');
  
  tabItems.forEach((item, index) => {
    const tabName = item.dataset.tab;
    
    item.onclick = (e) => {
      e.preventDefault();
      
      const tab = item.dataset.tab;
      showTab(tab + '-tab');
      
      if (tab === 'companies') {
        renderCompaniesTable();
      } else if (tab === 'partnerships') {
        renderPartnershipsMatrix();
      }
    };
  });
}

// Рендеринг грида компаний
async function renderCompaniesTable() {
  const grid = document.getElementById('companies-grid');
  grid.innerHTML = '<div class="empty-state">Загрузка компаний...</div>';
  
  try {
    const response = await apiRequest('/companies');
    
    if (response.success && response.companies) {
      grid.innerHTML = '';
      
      if (response.companies.length === 0) {
        grid.innerHTML = `
          <div class="empty-state">
            <h3>Нет компаний</h3>
            <p>Создайте первую компанию для начала работы с системой</p>
          </div>
        `;
        return;
      }
      
      for (const company of response.companies) {
        // Получаем количество партнеров и пользователей
        const [partnersResponse, usersResponse] = await Promise.all([
          apiRequest(`/companies/${company.id}/partnerships`),
          apiRequest('/users')
        ]);
        
        const partnersCount = partnersResponse.success ? partnersResponse.partnerships.length : 0;
        const usersCount = usersResponse.success ? 
          usersResponse.users.filter(user => user.company_id === company.id).length : 0;
        
        // Генерируем иконку компании (первая буква названия)
        const companyIcon = company.name.charAt(0).toUpperCase();
        
        const card = document.createElement('div');
        card.className = 'company-card';
        card.innerHTML = `
          <div class="company-header">
            <div class="company-title">
              <div class="company-icon">${companyIcon}</div>
              <div>
                <h3>${company.name}</h3>
                <span class="company-id">ID: ${company.id}</span>
              </div>
            </div>
            <span class="badge ${company.status === 'active' ? 'badge--success' : 'badge--warning'}">
              ${company.status === 'active' ? 'Активна' : 'Неактивна'}
            </span>
          </div>
          
          <div class="company-info">
            <p><strong>Описание:</strong> ${company.description || 'Не указано'}</p>
            ${company.contact_info ? `<p><strong>Контакты:</strong> ${company.contact_info}</p>` : ''}
          </div>
          
          <div class="company-stats">
            <div class="company-stat">
              <span class="company-stat-value">${usersCount}</span>
              <span class="company-stat-label">Сотрудники</span>
            </div>
            <div class="company-stat">
              <span class="company-stat-value">${partnersCount}</span>
              <span class="company-stat-label">Партнеры</span>
            </div>
          </div>
          
          <div class="company-actions">
            <button class="btn btn--secondary btn--small" onclick="editCompany(${company.id})">
              Редактировать
            </button>
            <button class="btn btn--danger btn--small" onclick="deleteCompany(${company.id})">
              Удалить
            </button>
          </div>
        `;
        grid.appendChild(card);
      }
    }
  } catch (error) {
    grid.innerHTML = `
      <div class="empty-state">
        <h3>Ошибка загрузки</h3>
        <p>Не удалось загрузить список компаний: ${error.message}</p>
      </div>
    `;
    console.error('Ошибка загрузки компаний:', error);
  }
}

// Настройка модала создания компании
function setupCreateCompanyModal() {
  const btn = document.getElementById('create-company-btn');
  const modal = document.getElementById('create-company-modal');
  const form = document.getElementById('create-company-form');
  
  btn.onclick = () => showModal('create-company-modal');
  modal.querySelector('.modal-close').onclick = () => hideModal('create-company-modal');
  modal.querySelector('.modal-cancel').onclick = () => hideModal('create-company-modal');
  modal.querySelector('.modal-backdrop').onclick = () => hideModal('create-company-modal');
  
  form.onsubmit = async (e) => {
    e.preventDefault();
    
    const newCompany = {
      name: document.getElementById('new-company-name').value.trim(),
      description: document.getElementById('new-company-description').value.trim(),
      contact_info: document.getElementById('new-company-contact').value.trim()
    };
    
    try {
      const response = await apiRequest('/companies', {
        method: 'POST',
        body: JSON.stringify(newCompany)
      });
      
      if (response.success) {
        await renderCompaniesTable();
        hideModal('create-company-modal');
        form.reset();
        
        // Показываем уведомление
        if (window.notificationManager) {
          window.notificationManager.show('Компания создана успешно', 'success');
        } else {
          alert('Компания создана успешно');
        }
      }
    } catch (error) {
      console.error('Ошибка создания компании:', error);
      
      if (window.notificationManager) {
        window.notificationManager.show('Ошибка при создании компании: ' + error.message, 'error');
      } else {
        alert('Ошибка при создании компании: ' + error.message);
      }
    }
  };
}

// Удаление компании
async function deleteCompany(companyId) {
  if (!confirm('Вы уверены, что хотите удалить эту компанию?')) {
    return;
  }
  
  try {
    const response = await apiRequest(`/companies/${companyId}`, {
      method: 'DELETE'
    });
    
    if (response.success) {
      await renderCompaniesTable();
      
      if (window.notificationManager) {
        window.notificationManager.show('Компания удалена успешно', 'success');
      } else {
        alert('Компания удалена успешно');
      }
    }
  } catch (error) {
    console.error('Ошибка удаления компании:', error);
    
    if (window.notificationManager) {
      window.notificationManager.show('Ошибка при удалении компании: ' + error.message, 'error');
    } else {
      alert('Ошибка при удалении компании: ' + error.message);
    }
  }
}

// Глобальная переменная для хранения изменений партнерств
let partnershipsChanges = new Map();

// Рендеринг современной матрицы партнерств
async function renderPartnershipsMatrix() {
  const grid = document.getElementById('partnerships-grid');
  grid.innerHTML = '<div class="empty-state">Загрузка партнерств...</div>';
  
  try {
    // Загружаем компании
    const companiesResponse = await apiRequest('/companies');
    if (!companiesResponse.success) {
      throw new Error('Не удалось загрузить компании');
    }
    
    const companies = companiesResponse.companies;
    if (companies.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <h3>Нет компаний</h3>
          <p>Создайте компании для настройки партнерств</p>
        </div>
      `;
      return;
    }
    
    // Загружаем существующие партнерства
    const partnershipsResponse = await apiRequest('/companies/admin/partnerships');
    const existingPartnerships = partnershipsResponse.success ? partnershipsResponse.partnerships : [];
    
    // Создаем современные карточки партнерств
    buildModernPartnershipsMatrix(companies, existingPartnerships);
    
    // Настраиваем обработчики
    setupPartnershipsHandlers();
    
  } catch (error) {
    console.error('Ошибка загрузки матрицы партнерств:', error);
    grid.innerHTML = `
      <div class="empty-state">
        <h3>Ошибка загрузки</h3>
        <p>Не удалось загрузить матрицу партнерств: ${error.message}</p>
      </div>
    `;
  }
}

// Построение матрицы партнерств
function buildPartnershipsMatrix(companies, existingPartnerships) {
  const matrix = document.getElementById('partnerships-matrix');
  const thead = matrix.querySelector('thead tr');
  const tbody = document.getElementById('partnerships-matrix-body');
  
  // Очищаем предыдущую матрицу
  thead.innerHTML = '<th class="matrix-corner">Владельцы → <br> ↓ Менеджеры</th>';
  tbody.innerHTML = '';
  
  // Добавляем заголовки колонок (компании владельцев)
  companies.forEach(company => {
    const th = document.createElement('th');
    th.textContent = company.name;
    th.title = `Компания владельцев: ${company.name}`;
    thead.appendChild(th);
  });
  
  // Создаем строки (компании менеджеров)
  companies.forEach(managerCompany => {
    const row = document.createElement('tr');
    
    // Первая ячейка - название компании менеджеров
    const labelCell = document.createElement('td');
    labelCell.className = 'company-label';
    labelCell.textContent = managerCompany.name;
    labelCell.title = `Компания менеджеров: ${managerCompany.name}`;
    row.appendChild(labelCell);
    
    // Ячейки партнерств
    companies.forEach(ownerCompany => {
      const cell = document.createElement('td');
      cell.className = 'partnership-cell';
      
      // Проверяем существующее партнерство
      const existingPartnership = existingPartnerships.find(p => 
        p.owner_company_id === ownerCompany.id && 
        p.manager_company_id === managerCompany.id &&
        p.status === 'active'
      );
      
      const toggle = document.createElement('div');
      toggle.className = `partnership-toggle ${existingPartnership ? 'active' : ''}`;
      toggle.dataset.ownerCompany = ownerCompany.id;
      toggle.dataset.managerCompany = managerCompany.id;
      toggle.title = `${existingPartnership ? 'Убрать' : 'Создать'} партнерство между ${ownerCompany.name} и ${managerCompany.name}`;
      
      // Обработчик клика
      toggle.onclick = () => togglePartnership(toggle, ownerCompany, managerCompany);
      
      cell.appendChild(toggle);
      row.appendChild(cell);
    });
    
    tbody.appendChild(row);
  });
}

// Построение современной матрицы партнерств
function buildModernPartnershipsMatrix(companies, existingPartnerships) {
  const grid = document.getElementById('partnerships-grid');
  grid.innerHTML = '';
  
  // Создаем карточки для всех возможных комбинаций компаний
  companies.forEach(managerCompany => {
    companies.forEach(ownerCompany => {
      // Пропускаем одинаковые компании
      if (managerCompany.id === ownerCompany.id) return;
      
      // Проверяем существующее партнерство
      const existingPartnership = existingPartnerships.find(p => 
        p.owner_company_id === ownerCompany.id && 
        p.manager_company_id === managerCompany.id &&
        p.status === 'active'
      );
      
      const card = document.createElement('div');
      card.className = 'partnership-card';
      
      // Генерируем иконки для компаний
      const ownerIcon = ownerCompany.name.charAt(0).toUpperCase();
      const managerIcon = managerCompany.name.charAt(0).toUpperCase();
      
      card.innerHTML = `
        <div class="partnership-header">
          <div class="partnership-companies">
            <div class="company-avatar">${ownerIcon}</div>
            <div class="company-info">
              <div class="company-name">${ownerCompany.name}</div>
              <div class="company-role">Владелец</div>
            </div>
            <div class="partnership-arrow">→</div>
            <div class="company-avatar">${managerIcon}</div>
            <div class="company-info">
              <div class="company-name">${managerCompany.name}</div>
              <div class="company-role">Менеджер</div>
            </div>
          </div>
          <button class="partnership-toggle ${existingPartnership ? 'active' : ''}" 
                  data-owner-company="${ownerCompany.id}" 
                  data-manager-company="${managerCompany.id}">
          </button>
        </div>
        <div class="partnership-status">
          ${existingPartnership ? 
            'Активное партнерство - менеджеры могут создавать заявки для этого владельца' : 
            'Партнерство отключено - доступ к аукционам ограничен'
          }
        </div>
      `;
      
      // Добавляем обработчик для переключателя
      const toggle = card.querySelector('.partnership-toggle');
      toggle.onclick = (e) => {
        e.stopPropagation();
        toggleModernPartnership(toggle, ownerCompany, managerCompany);
      };
      
      grid.appendChild(card);
    });
  });
}

// Переключение современного партнерства
function toggleModernPartnership(toggle, ownerCompany, managerCompany) {
  const isActive = toggle.classList.contains('active');
  const partnershipKey = `${ownerCompany.id}-${managerCompany.id}`;
  
  // Визуальное переключение
  toggle.classList.toggle('active');
  
  // Обновляем статус
  const statusElement = toggle.closest('.partnership-card').querySelector('.partnership-status');
  statusElement.textContent = toggle.classList.contains('active') ? 
    'Активное партнерство - менеджеры могут создавать заявки для этого владельца' : 
    'Партнерство отключено - доступ к аукционам ограничен';
  
  // Сохраняем изменение
  partnershipsChanges.set(partnershipKey, {
    owner_company_id: ownerCompany.id,
    manager_company_id: managerCompany.id,
    action: isActive ? 'delete' : 'create',
    ownerName: ownerCompany.name,
    managerName: managerCompany.name
  });
  
  // Обновляем индикатор изменений
  updateChangesIndicator();
}

// Переключение партнерства
function togglePartnership(toggle, ownerCompany, managerCompany) {
  const isActive = toggle.classList.contains('active');
  const partnershipKey = `${ownerCompany.id}-${managerCompany.id}`;
  
  // Визуальное переключение
  toggle.classList.toggle('active');
  
  // Сохраняем изменение
  partnershipsChanges.set(partnershipKey, {
    owner_company_id: ownerCompany.id,
    manager_company_id: managerCompany.id,
    action: isActive ? 'delete' : 'create',
    ownerName: ownerCompany.name,
    managerName: managerCompany.name
  });
  
  // Обновляем tooltip
  toggle.title = `${!isActive ? 'Убрать' : 'Создать'} партнерство между ${ownerCompany.name} и ${managerCompany.name}`;
  
  // Показываем индикатор изменений
  updateChangesIndicator();
}

// Обновление индикатора изменений
function updateChangesIndicator() {
  const actionsPanel = document.getElementById('partnerships-actions');
  const changesCount = document.getElementById('changes-count');
  const saveBtn = document.getElementById('save-partnerships-btn');
  const resetBtn = document.getElementById('reset-partnerships-btn');
  
  if (partnershipsChanges.size > 0) {
    actionsPanel.style.display = 'flex';
    changesCount.textContent = `${partnershipsChanges.size} изменение${partnershipsChanges.size > 1 ? 'й' : ''}`;
    saveBtn.disabled = false;
    resetBtn.disabled = false;
  } else {
    actionsPanel.style.display = 'none';
    saveBtn.disabled = true;
    resetBtn.disabled = true;
  }
}

// Настройка обработчиков партнерств
function setupPartnershipsHandlers() {
  const saveBtn = document.getElementById('save-partnerships-btn');
  const resetBtn = document.getElementById('reset-partnerships-btn');
  
  saveBtn.onclick = savePartnerships;
  resetBtn.onclick = resetPartnerships;
  
  // Изначально кнопки неактивны
  updateChangesIndicator();
}

// Сохранение изменений партнерств
async function savePartnerships() {
  if (partnershipsChanges.size === 0) return;
  
  const saveBtn = document.getElementById('save-partnerships-btn');
  const originalText = saveBtn.textContent;
  saveBtn.textContent = 'Сохранение...';
  saveBtn.disabled = true;
  
  try {
    for (const [key, change] of partnershipsChanges) {
      if (change.action === 'create') {
        await apiRequest('/companies/admin/partnerships', {
          method: 'POST',
          body: JSON.stringify({
            owner_company_id: change.owner_company_id,
            manager_company_id: change.manager_company_id
          })
        });
      } else if (change.action === 'delete') {
        // Найдем ID партнерства для удаления
        const partnershipsResponse = await apiRequest('/companies/admin/partnerships');
        if (partnershipsResponse.success) {
          const partnership = partnershipsResponse.partnerships.find(p => 
            p.owner_company_id === change.owner_company_id && 
            p.manager_company_id === change.manager_company_id
          );
          
          if (partnership) {
            await apiRequest(`/companies/admin/partnerships/${partnership.id}`, {
              method: 'DELETE'
            });
          }
        }
      }
    }
    
    // Очищаем изменения
    partnershipsChanges.clear();
    updateChangesIndicator();
    
    // Показываем уведомление
    if (window.notificationManager) {
      window.notificationManager.show('Партнерства успешно обновлены', 'success');
    } else {
      alert('Партнерства успешно обновлены');
    }
    
  } catch (error) {
    console.error('Ошибка сохранения партнерств:', error);
    
    if (window.notificationManager) {
      window.notificationManager.show('Ошибка при сохранении партнерств: ' + error.message, 'error');
    } else {
      alert('Ошибка при сохранении партнерств: ' + error.message);
    }
  } finally {
    saveBtn.textContent = originalText;
    saveBtn.disabled = false;
  }
}

// Сброс изменений
function resetPartnerships() {
  if (partnershipsChanges.size === 0) return;
  
  if (!confirm('Отменить все несохраненные изменения?')) return;
  
  // Очищаем изменения
  partnershipsChanges.clear();
  
  // Обновляем индикатор
  updateChangesIndicator();
  
  // Перерендериваем матрицу
  renderPartnershipsMatrix();
}

// Дашборд владельца
async function initOwnerDashboard() {
  await renderEquipmentGrid();
  await renderOwnerOrders();
  setupAddEquipmentModal();
  setupOwnerTabs();
  setupRespondOrderModal();
  
  // Запускаем автообновление
  realTimeUpdater.start('owner-dashboard');
}

function setupOwnerTabs() {
  document.querySelectorAll('#owner-dashboard .sidebar-nav-item[data-tab]').forEach(item => {
    item.onclick = () => {
      const tab = item.dataset.tab;
      showTab(tab + '-tab');
      if (tab === 'orders') {
        renderOwnerOrders();
      }
    };
  });
}

async function renderEquipmentGrid() {
  const grid = document.getElementById('equipment-grid');
  grid.innerHTML = '<div class="empty-state"><p>Загрузка...</p></div>';
  
  try {
    const response = await apiRequest('/equipment');
    if (response.success) {
      const userEquipment = response.equipment;
  
  if (userEquipment.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <h3>Техника не добавлена</h3>
        <p>Нажмите "Добавить технику" чтобы добавить свою технику</p>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = '';
  userEquipment.forEach(equipment => {
    const card = document.createElement('div');
    card.className = 'equipment-card';
    card.innerHTML = `
      <h3>${equipment.name}</h3>
      <div class="equipment-info">
        <p><strong>Тип:</strong> ${equipment.type}</p>
        <p><strong>Подтип:</strong> ${equipment.subtype}</p>
            <p><strong>Владелец:</strong> ${equipment.owner_name || 'Не указан'}</p>
        <p><strong>Телефон:</strong> ${equipment.phone}</p>
            ${equipment.location ? `<p><strong>Местоположение:</strong> ${equipment.location}</p>` : ''}
      </div>
      <div class="equipment-badges">
        <span class="badge badge--${equipment.status === 'available' ? 'available' : 'busy'}">
              ${equipment.status === 'available' ? 'Доступна' : equipment.status === 'busy' ? 'Занята' : 'На обслуживании'}
        </span>
            ${equipment.is_off_road ? '<span class="badge badge--offroad">Вездеход</span>' : ''}
      </div>
      <div class="equipment-actions">
        <button class="btn btn--secondary btn--sm" onclick="editEquipment(${equipment.id})">
          Редактировать
        </button>
        <button class="btn btn--danger btn--sm" onclick="deleteEquipment(${equipment.id})">
          Удалить
        </button>
      </div>
    `;
    grid.appendChild(card);
  });
    }
  } catch (error) {
    grid.innerHTML = `<div class="empty-state"><h3>Ошибка загрузки</h3><p>${error.message}</p></div>`;
  }
}

async function renderOwnerOrders() {
  const grid = document.getElementById('owner-orders-grid');
  grid.innerHTML = '<div class="empty-state"><p>Загрузка...</p></div>';
  
  try {
    const response = await apiRequest('/requests');
    if (response.success) {
      const relevantOrders = response.requests;
  
  if (relevantOrders.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <h3>Нет подходящих заявок</h3>
        <p>Заявки, подходящие под вашу технику, появятся здесь</p>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = '';
  relevantOrders.forEach(order => {
    const card = document.createElement('div');
    card.className = 'order-card';
        
    const deadline = order.auction_deadline;
    const timerId = `owner-timer-${order.id}`;
    const timeLeft = deadline ? Math.max(0, new Date(deadline) - new Date()) : 0;
    
    card.innerHTML = `
      <h3>Заявка на ${order.equipment_type}</h3>
      <div class="order-info">
        <p><strong>Подтип:</strong> ${order.equipment_subtype}</p>
        <p><strong>Период:</strong> ${formatDate(order.start_date)} - ${formatDate(order.end_date)}</p>
        <p><strong>Местоположение:</strong> ${order.location}</p>
        <p><strong>Описание:</strong> ${order.work_description}</p>
        <p><strong>Заказчик:</strong> ${order.manager_name || 'Неизвестно'}</p>
        ${deadline ? `<p><strong>До окончания:</strong> <span id="${timerId}" class="auction-timer">Загрузка...</span></p>` : ''}
      </div>
      <div class="order-badges">
        <span class="badge badge--${order.has_bid ? 'available' : 'pending'}">
          ${order.has_bid ? 'Ставка подана' : 'Можно подать ставку'}
        </span>
      </div>
      <div class="order-actions">
        ${!order.has_bid && timeLeft > 0 ? `
        <button class="btn btn--primary btn--sm" onclick="respondToOrder(${order.id})">
            Подать ставку
        </button>
        ` : ''}
        ${order.has_bid ? '<p style="color: var(--muted-foreground); font-size: 12px;">Ваша ставка принята к рассмотрению</p>' : ''}
        ${timeLeft <= 0 ? '<p style="color: var(--destructive); font-size: 12px;">Время подачи ставок истекло</p>' : ''}
      </div>
    `;
    grid.appendChild(card);

    // Запускаем таймер для этой карточки
    if (deadline) {
      const status = auctionTimer.getAuctionStatus(deadline);
      auctionTimer.createTimer(timerId, deadline, {
        prefix: '⏰',
        activeClass: `auction-timer ${status.class}`,
        urgentClass: 'auction-timer urgent',
        expiredClass: 'auction-timer expired',
        expiredText: '⏱️ Время истекло'
        // Убираем onExpired чтобы избежать рекурсивных вызовов
      });
    }
  });
    }
  } catch (error) {
    grid.innerHTML = `<div class="empty-state"><h3>Ошибка загрузки</h3><p>${error.message}</p></div>`;
  }
}

function setupRespondOrderModal() {
  const modal = document.getElementById('respond-order-modal');
  const form = document.getElementById('respond-order-form');
  
  modal.querySelector('.modal-close').onclick = () => hideModal('respond-order-modal');
  modal.querySelector('.modal-backdrop').onclick = () => hideModal('respond-order-modal');
  modal.querySelector('.modal-cancel').onclick = () => hideModal('respond-order-modal');
  
  // Автоматический расчет общей стоимости
  const hourlyRateInput = document.getElementById('bid-hourly-rate');
  const dailyRateInput = document.getElementById('bid-daily-rate');
  const totalPriceInput = document.getElementById('bid-total-price');
  
  const calculateTotal = () => {
    const hourlyRate = parseFloat(hourlyRateInput.value) || 0;
    const dailyRate = parseFloat(dailyRateInput.value) || 0;
    
    // Простой расчет: берем большее значение из почасовой и дневной ставки
    if (dailyRate > 0) {
      totalPriceInput.value = dailyRate;
    } else if (hourlyRate > 0) {
      totalPriceInput.value = hourlyRate * 8; // 8 часов в день по умолчанию
    }
  };
  
  hourlyRateInput.oninput = calculateTotal;
  dailyRateInput.oninput = calculateTotal;
  
  form.onsubmit = async (e) => {
    e.preventDefault();
    
    const orderId = parseInt(modal.dataset.orderId);
    const equipmentId = document.getElementById('bid-equipment').value;
    const hourlyRate = parseFloat(document.getElementById('bid-hourly-rate').value);
    const dailyRate = parseFloat(document.getElementById('bid-daily-rate').value);
    const totalPrice = parseFloat(document.getElementById('bid-total-price').value);
    const comment = document.getElementById('bid-comment').value;
    
    if (!equipmentId) {
      alert('Выберите технику');
      return;
    }
    
    const bidData = {
      request_id: orderId,
      equipment_id: parseInt(equipmentId),
      hourly_rate: hourlyRate,
      daily_rate: dailyRate,
      total_price: totalPrice,
      comment: comment || null
    };
    
    try {
      await apiRequest('/bids', {
        method: 'POST',
        body: JSON.stringify(bidData)
      });
      
      // Уведомление о подаче ставки
      if (window.notificationCenter) {
        window.notificationCenter.addNotification({
          title: '💰 Ставка подана',
          message: `Ваша ставка на заявку #${orderId} успешно подана. Общая стоимость: ${totalPrice.toLocaleString()} ₽`,
          type: 'auction',
          auctionId: orderId,
          requestId: orderId
        });
      }
      
      if (window.notifications) {
        window.notifications.success('Ваша ставка подана успешно!');
      } else {
        alert('Ваша ставка подана успешно!');
      }
      
      await renderOwnerOrders();
      hideModal('respond-order-modal');
      form.reset();
    } catch (error) {
      alert('Ошибка при подаче ставки: ' + error.message);
    }
  };
}

function setupAddEquipmentModal() {
  const addBtn = document.getElementById('add-equipment-btn');
  const modal = document.getElementById('add-equipment-modal');
  const form = document.getElementById('add-equipment-form');
  const typeSelect = document.getElementById('equipment-type');
  const subtypeSelect = document.getElementById('equipment-subtype');
  
  // Функция для заполнения типов техники
  function populateEquipmentTypes() {
    typeSelect.innerHTML = '<option value="">Выберите тип</option>';
  Object.keys(appData.equipmentTypes).forEach(type => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    typeSelect.appendChild(option);
  });
  }
  
  // Зависимые списки
  typeSelect.onchange = () => {
    const selectedType = typeSelect.value;
    subtypeSelect.innerHTML = '<option value="">Выберите подтип</option>';
    
    if (selectedType && appData.equipmentTypes[selectedType]) {
      subtypeSelect.disabled = false;
      const subtypes = appData.equipmentTypes[selectedType];
      
      if (Array.isArray(subtypes)) {
        subtypes.forEach(subtypeData => {
        const option = document.createElement('option');
          // Если это объект с данными, берем subtype, иначе используем как строку
          const subtypeValue = typeof subtypeData === 'object' ? subtypeData.subtype : subtypeData;
          option.value = subtypeValue;
          option.textContent = subtypeValue;
        subtypeSelect.appendChild(option);
      });
      }
    } else {
      subtypeSelect.disabled = true;
    }
  };
  
  addBtn.onclick = () => {
    populateEquipmentTypes(); // Заполняем типы при открытии модала
    document.getElementById('equipment-owner').value = appData.currentUser.name;
    document.getElementById('equipment-phone').value = appData.currentUser.phone || '';
    showModal('add-equipment-modal');
  };
  
  modal.querySelector('.modal-close').onclick = () => hideModal('add-equipment-modal');
  modal.querySelector('.modal-cancel').onclick = () => hideModal('add-equipment-modal');
  modal.querySelector('.modal-backdrop').onclick = () => hideModal('add-equipment-modal');
  
  form.onsubmit = async (e) => {
    e.preventDefault();
    
    const newEquipment = {
      name: document.getElementById('equipment-name').value,
      phone: document.getElementById('equipment-phone').value,
      telegram_id: document.getElementById('equipment-telegram').value || null,
      license_plate: document.getElementById('equipment-plate').value || null,
      type: document.getElementById('equipment-type').value,
      subtype: document.getElementById('equipment-subtype').value,
      is_off_road: document.getElementById('equipment-offroad').checked,
      additional_equipment: document.getElementById('equipment-additional').value || null,
      description: document.getElementById('equipment-description').value || null,
      location: 'Москва' // По умолчанию, можно добавить поле в форму
    };
    
    try {
      await apiRequest('/equipment', {
        method: 'POST',
        body: JSON.stringify(newEquipment)
      });
      
      // Уведомление о добавлении техники
      if (window.notificationCenter) {
        window.notificationCenter.addNotification({
          title: '🚜 Техника добавлена',
          message: `Техника "${newEquipment.name}" (${newEquipment.type} - ${newEquipment.subtype}) успешно добавлена в ваш парк`,
          type: 'system'
        });
      }
      
      if (window.notifications) {
        window.notifications.success('Техника добавлена успешно');
      } else {
        alert('Техника добавлена успешно');
      }
      
      await renderEquipmentGrid();
      hideModal('add-equipment-modal');
      form.reset();
      
      subtypeSelect.innerHTML = '<option value="">Сначала выберите тип</option>';
      subtypeSelect.disabled = true;
    } catch (error) {
      alert('Ошибка при добавлении техники: ' + error.message);
    }
  };
}

// Дашборд менеджера
async function initManagerDashboard() {
  await setupCreateOrderForm(); // Делаем асинхронным для загрузки типов техники
  await renderManagerOrders();
  setupManagerTabs();
  
  // Запускаем автообновление
  realTimeUpdater.start('manager-dashboard');
}

function setupManagerTabs() {
  document.querySelectorAll('#manager-dashboard .sidebar-nav-item[data-tab]').forEach(item => {
    item.onclick = () => {
      const tab = item.dataset.tab;
      showTab(tab + '-tab');
      if (tab === 'my-orders') {
        renderManagerOrders();
      }
    };
  });
}

async function setupCreateOrderForm() {
  const form = document.getElementById('create-order-form');
  const typeSelect = document.getElementById('order-type');
  const subtypeSelect = document.getElementById('order-subtype');
  
  // Функция для заполнения типов техники
  async function populateOrderTypes() {
    typeSelect.innerHTML = '<option value="">Загрузка типов техники...</option>';
    
    try {
      // Загружаем доступные типы техники для текущего менеджера
      const typesResponse = await apiRequest('/equipment/types');
      
      if (typesResponse.success && typesResponse.types.length > 0) {
        typeSelect.innerHTML = '<option value="">Выберите тип техники</option>';
        
        // Группируем типы техники
        const groupedTypes = {};
        typesResponse.types.forEach(typeData => {
          if (!groupedTypes[typeData.type]) {
            groupedTypes[typeData.type] = [];
          }
          groupedTypes[typeData.type].push(typeData);
        });
        
        // Заполняем селект
        Object.keys(groupedTypes).forEach(type => {
          const option = document.createElement('option');
          option.value = type;
          option.textContent = `${type} (доступно ${groupedTypes[type].length} подтипов)`;
          typeSelect.appendChild(option);
        });
        
        // Сохраняем в appData для зависимых списков
        appData.equipmentTypes = groupedTypes;
      } else {
        typeSelect.innerHTML = '<option value="">Нет доступной техники от партнерских компаний</option>';
        typeSelect.disabled = true;
      }
    } catch (error) {
      console.error('Ошибка загрузки типов техники:', error);
      typeSelect.innerHTML = '<option value="">Ошибка загрузки</option>';
    }
  }
  
  // Заполняем типы при инициализации (будет перезаполнено после загрузки данных)
  await populateOrderTypes();
  
  // Зависимые списки для заявок
  typeSelect.onchange = () => {
    const selectedType = typeSelect.value;
    subtypeSelect.innerHTML = '<option value="">Выберите подтип</option>';
    
    if (selectedType && appData.equipmentTypes[selectedType]) {
      subtypeSelect.disabled = false;
      const subtypes = appData.equipmentTypes[selectedType];
      
      if (Array.isArray(subtypes)) {
        subtypes.forEach(subtypeData => {
          const option = document.createElement('option');
          // Новый формат: объект с полями type, subtype, count
          const subtypeValue = subtypeData.subtype;
          const count = subtypeData.count || 0;
          option.value = subtypeValue;
          option.textContent = `${subtypeValue} (${count} ед.)`;
          subtypeSelect.appendChild(option);
        });
      }
    } else {
      subtypeSelect.disabled = true;
    }
  };
  
  // Устанавливаем минимальную дату
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const startDateInput = document.getElementById('order-start-date');
  const endDateInput = document.getElementById('order-end-date');
  
  startDateInput.min = tomorrow.toISOString().split('T')[0];
  endDateInput.min = tomorrow.toISOString().split('T')[0];
  
  startDateInput.onchange = () => {
    endDateInput.min = startDateInput.value;
    if (endDateInput.value && endDateInput.value < startDateInput.value) {
      endDateInput.value = startDateInput.value;
    }
  };
  
  form.onsubmit = async (e) => {
    e.preventDefault();
    
    const newOrder = {
      equipment_type: document.getElementById('order-type').value,
      equipment_subtype: document.getElementById('order-subtype').value,
      start_date: document.getElementById('order-start-date').value,
      end_date: document.getElementById('order-end-date').value,
      location: document.getElementById('order-location').value,
      work_description: document.getElementById('order-description').value
    };
    
    try {
      const response = await apiRequest('/requests', {
        method: 'POST',
        body: JSON.stringify(newOrder)
      });
      
    form.reset();
    
    subtypeSelect.innerHTML = '<option value="">Сначала выберите тип</option>';
    subtypeSelect.disabled = true;
    
      // Уведомление о создании заявки
      if (window.notificationCenter) {
        window.notificationCenter.addNotification({
          title: '✅ Заявка создана',
          message: `Ваша заявка на ${newOrder.equipment_type} - ${newOrder.equipment_subtype} успешно создана. Уведомлено ${response.available_owners} владельцев техники.`,
          type: 'request',
          requestId: response.request_id
        });
      }
      
      if (window.notifications) {
        window.notifications.success(`Заявка успешно создана! Аукцион начался. Уведомлено ${response.available_owners} владельцев техники.`);
      } else {
        alert(`Заявка успешно создана! Аукцион начался. Уведомлено ${response.available_owners} владельцев техники.`);
      }
      
      showTab('my-orders-tab');
      await renderManagerOrders();
    } catch (error) {
      alert('Ошибка при создании заявки: ' + error.message);
    }
  };
}

async function renderManagerOrders() {
  const grid = document.getElementById('manager-orders-grid');
  grid.innerHTML = '<div class="empty-state"><p>Загрузка...</p></div>';
  
  try {
    const response = await apiRequest('/requests');
    if (response.success) {
      const userOrders = response.requests;
  
  if (userOrders.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <h3>Заявки не созданы</h3>
        <p>Создайте заявку на технику, и владельцы смогут откликнуться на неё</p>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = '';
  userOrders.forEach(order => {
    const card = document.createElement('div');
    card.className = 'order-card';
    
        let statusText = '';
        let statusClass = '';
        let bidsInfo = null; // Объявляем переменную вне switch
        
        switch (order.status) {
          case 'auction_active':
            const bidsCount = order.bids_count || 0;
            bidsInfo = formatBidsCount(bidsCount);
            statusText = `Аукцион активен`;
            statusClass = 'pending';
            break;
          case 'auction_closed':
            statusText = 'Аукцион завершен';
            statusClass = 'available';
            break;
          case 'completed':
            statusText = 'Завершена';
            statusClass = 'busy';
            break;
          case 'cancelled':
            statusText = 'Отменена';
            statusClass = 'busy';
            break;
          default:
            statusText = 'Ожидает';
            statusClass = 'pending';
        }
        
        const deadline = order.auction_deadline;
        const timerId = `manager-timer-${order.id}`;
        
                let winnerInfo = '';
        if (order.status === 'auction_closed' && order.winning_owner_name) {
          winnerInfo = `
            <div class="winner-card">
              <div class="winner-header">
                <span class="winner-icon">🏆</span>
                <h4>Победитель аукциона</h4>
              </div>
              <div class="winner-details">
                <div class="winner-contact">
                  <p><strong>👤 ${order.winning_owner_name}</strong></p>
                  <p>📞 <a href="tel:${order.winning_owner_phone}">${order.winning_owner_phone}</a></p>
                </div>
                <div class="winner-price">
                  <span class="price-label">Цена:</span>
                  <span class="price-value">${order.winning_price ? order.winning_price.toLocaleString() + ' ₽' : 'Не указана'}</span>
                </div>
              </div>
            </div>
          `;
        } else if (order.status === 'auction_closed') {
          winnerInfo = `
            <div class="no-winner-card">
              <p>❌ Аукцион завершен без победителя</p>
            </div>
          `;
        }
    
    card.innerHTML = `
      <h3>${order.equipment_type} - ${order.equipment_subtype}</h3>
      <div class="order-info">
        <p><strong>Период:</strong> ${formatDate(order.start_date)} - ${formatDate(order.end_date)}</p>
        <p><strong>Местоположение:</strong> ${order.location}</p>
        <p><strong>Описание:</strong> ${order.work_description}</p>
        <p><strong>Создана:</strong> ${formatDate(order.created_at)}</p>
        ${deadline && order.status === 'auction_active' ? 
          `<p><strong>До окончания:</strong> <span id="${timerId}" class="auction-timer">Загрузка...</span></p>` : 
          deadline ? `<p><strong>Завершен:</strong> ${new Date(deadline).toLocaleString()}</p>` : ''
        }
      </div>
      <div class="order-badges">
        <span class="badge badge--${statusClass}">
          ${statusText}
        </span>
        ${order.status === 'auction_active' && bidsInfo ? 
          `<span class="badge badge--info bids-counter ${bidsInfo.class}">
            ${bidsInfo.icon} ${bidsInfo.text}
          </span>` : ''
        }
      </div>
      ${winnerInfo}
    `;
    grid.appendChild(card);

    // Запускаем таймер для активных аукционов
    if (deadline && order.status === 'auction_active') {
      const status = auctionTimer.getAuctionStatus(deadline);
              auctionTimer.createTimer(timerId, deadline, {
          prefix: '⏰',
          activeClass: `auction-timer ${status.class}`,
          urgentClass: 'auction-timer urgent',
          expiredClass: 'auction-timer expired',
          expiredText: '⏱️ Аукцион завершен'
          // Убираем onExpired чтобы избежать рекурсивных вызовов
          // Автообновление будет обрабатывать завершенные аукционы
        });
    }
  });
    }
  } catch (error) {
    grid.innerHTML = `<div class="empty-state"><h3>Ошибка загрузки</h3><p>${error.message}</p></div>`;
  }
}

// ⏰ Система таймеров для аукционов
class AuctionTimer {
  constructor() {
    this.timers = new Map(); // id_элемента -> interval
    this.activeAuctions = new Map(); // id_аукциона -> deadline
  }

  // Создать таймер для элемента
  createTimer(elementId, deadline, options = {}) {
    const element = document.getElementById(elementId);
    if (!element) return;

    // Останавливаем предыдущий таймер для этого элемента
    this.stopTimer(elementId);

    const deadlineTime = new Date(deadline).getTime();
    
    const updateTimer = () => {
      const now = new Date().getTime();
      const timeLeft = deadlineTime - now;

      if (timeLeft <= 0) {
        // Время истекло
        element.innerHTML = options.expiredText || '⏰ Время истекло';
        element.className = options.expiredClass || 'timer-expired';
        this.stopTimer(elementId);
        
        // Вызываем callback при истечении времени
        if (options.onExpired) {
          options.onExpired();
        }
        return;
      }

      // Форматируем оставшееся время
      const timeString = this.formatTimeLeft(timeLeft);
      element.innerHTML = `${options.prefix || '⏰'} ${timeString}`;
      element.className = options.activeClass || 'timer-active';
      
      // Изменяем стиль при приближении конца
      if (timeLeft <= 3600000) { // Меньше часа
        element.className = options.urgentClass || 'timer-urgent';
      }
    };

    // Первое обновление
    updateTimer();
    
    // Устанавливаем интервал обновления
    const interval = setInterval(updateTimer, 1000);
    this.timers.set(elementId, interval);
  }

  // Остановить таймер
  stopTimer(elementId) {
    const interval = this.timers.get(elementId);
    if (interval) {
      clearInterval(interval);
      this.timers.delete(elementId);
    }
  }

  // Остановить все таймеры
  stopAllTimers() {
    this.timers.forEach((interval, elementId) => {
      clearInterval(interval);
    });
    this.timers.clear();
  }

  // Форматировать оставшееся время
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

  // Получить статус аукциона
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

// Глобальный экземпляр таймера
const auctionTimer = new AuctionTimer();

// Система автообновления
class RealTimeUpdater {
  constructor() {
    this.intervals = new Map();
    this.isActive = false;
  }

  // Запустить автообновление для текущей страницы
  start(pageName) {
    this.stop(); // Останавливаем предыдущие обновления
    this.isActive = true;

    switch (pageName) {
      case 'owner-dashboard':
        this.startOwnerUpdates();
        break;
      case 'manager-dashboard':
        this.startManagerUpdates();
        break;
      case 'admin-dashboard':
        this.startAdminUpdates();
        break;
    }
  }

  // Остановить все обновления
  stop() {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();
    this.isActive = false;
  }

  // Автообновление для владельцев
  startOwnerUpdates() {
    // Обновляем заявки каждые 30 секунд (оптимизировано) и проверяем новые
    const ordersInterval = setInterval(async () => {
      if (this.isActive && document.getElementById('owner-orders-tab')?.classList.contains('active')) {
        // Объединяем проверку и рендеринг в один запрос
        await this.updateOwnerOrdersWithNotifications();
      }
    }, 30000);
    this.intervals.set('owner-orders', ordersInterval);

    // Обновляем технику каждые 60 секунд
    const equipmentInterval = setInterval(() => {
      if (this.isActive && document.getElementById('equipment-tab')?.classList.contains('active')) {
        renderEquipmentGrid();
      }
    }, 60000);
    this.intervals.set('owner-equipment', equipmentInterval);
  }

  // Автообновление для менеджеров
  startManagerUpdates() {
    // Обновляем заявки каждые 30 секунд (оптимизировано) и проверяем завершенные аукционы
    const ordersInterval = setInterval(async () => {
      if (this.isActive && document.getElementById('my-orders-tab')?.classList.contains('active')) {
        // Объединяем проверку и рендеринг в один запрос
        await this.updateManagerOrdersWithNotifications();
      }
    }, 30000); // Увеличено с 15 до 30 секунд
    this.intervals.set('manager-orders', ordersInterval);
  }

  // Автообновление для админов
  startAdminUpdates() {
    // Обновляем пользователей каждые 60 секунд
    const usersInterval = setInterval(() => {
      if (this.isActive && document.getElementById('users-tab')?.classList.contains('active')) {
        renderUsersTable();
      }
    }, 60000);
    this.intervals.set('admin-users', usersInterval);
  }

  // Проверка новых заявок для владельцев
  async checkForNewOwnerOrders() {
    if (!this.lastOrderCheck) {
      this.lastOrderCheck = new Date();
      return;
    }

    try {
      const response = await apiRequest('/requests');
      if (response.success) {
        const newOrders = response.requests.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate > this.lastOrderCheck;
        });

        newOrders.forEach(order => {
          if (window.notificationCenter) {
            window.notificationCenter.addNotification({
              title: '🚜 Новая заявка!',
              message: `Поступила заявка на ${order.equipment_type} - ${order.equipment_subtype}. Период: ${formatDate(order.start_date)} - ${formatDate(order.end_date)}`,
              type: 'request',
              requestId: order.id
            });
          }
        });

        this.lastOrderCheck = new Date();
      }
    } catch (error) {
      console.error('Ошибка проверки новых заявок:', error);
    }
  }

  // Проверка завершенных аукционов для менеджеров
  async checkForCompletedAuctions() {
    if (!this.lastAuctionCheck) {
      this.lastAuctionCheck = new Date();
      return;
    }

    try {
      const response = await apiRequest('/requests');
      if (response.success) {
        const completedAuctions = response.requests.filter(order => {
          return order.status === 'auction_closed' && 
                 order.winning_owner_name &&
                 new Date(order.auction_deadline) > this.lastAuctionCheck;
        });

        completedAuctions.forEach(order => {
          if (window.notificationCenter) {
            window.notificationCenter.addNotification({
              title: '🏆 Аукцион завершен!',
              message: `Заявка "${order.equipment_type} - ${order.equipment_subtype}" завершена. Победитель: ${order.winning_owner_name}. Цена: ${order.winning_price?.toLocaleString() || 'Не указана'} ₽`,
              type: 'auction',
              auctionId: order.id,
              requestId: order.id
            });
          }
        });

        this.lastAuctionCheck = new Date();
      }
    } catch (error) {
      console.error('Ошибка проверки завершенных аукционов:', error);
    }
  }

  // Оптимизированный метод для менеджеров - один запрос вместо двух
  async updateManagerOrdersWithNotifications() {
    if (!this.lastAuctionCheck) {
      this.lastAuctionCheck = new Date();
    }

    try {
      const response = await apiRequest('/requests');
      if (response.success) {
        // Проверяем завершенные аукционы для уведомлений
        const completedAuctions = response.requests.filter(order => {
          return order.status === 'auction_closed' && 
                 order.winning_owner_name &&
                 new Date(order.auction_deadline) > this.lastAuctionCheck;
        });

        completedAuctions.forEach(order => {
          if (window.notificationCenter) {
            window.notificationCenter.addNotification({
              title: '🏆 Аукцион завершен!',
              message: `Заявка "${order.equipment_type} - ${order.equipment_subtype}" завершена. Победитель: ${order.winning_owner_name}. Цена: ${order.winning_price?.toLocaleString() || 'Не указана'} ₽`,
              type: 'auction',
              auctionId: order.id,
              requestId: order.id
            });
          }
        });

        this.lastAuctionCheck = new Date();
        
        // Рендерим заявки (используем уже полученные данные)
        this.renderManagerOrdersFromData(response.requests);
      }
    } catch (error) {
      console.error('Ошибка обновления заявок менеджера:', error);
    }
  }

  // Оптимизированный метод для владельцев - один запрос вместо двух
  async updateOwnerOrdersWithNotifications() {
    if (!this.lastOrderCheck) {
      this.lastOrderCheck = new Date();
    }

    try {
      const response = await apiRequest('/requests');
      if (response.success) {
        // Проверяем новые заявки для уведомлений
        const newOrders = response.requests.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate > this.lastOrderCheck;
        });

        newOrders.forEach(order => {
          if (window.notificationCenter) {
            window.notificationCenter.addNotification({
              title: '🚜 Новая заявка!',
              message: `Поступила заявка на ${order.equipment_type} - ${order.equipment_subtype}. Период: ${formatDate(order.start_date)} - ${formatDate(order.end_date)}`,
              type: 'request',
              requestId: order.id
            });
          }
        });

        this.lastOrderCheck = new Date();
        
        // Рендерим заявки (используем уже полученные данные)
        this.renderOwnerOrdersFromData(response.requests);
      }
    } catch (error) {
      console.error('Ошибка обновления заявок владельца:', error);
    }
  }

  // Рендеринг заявок из уже полученных данных
  renderManagerOrdersFromData(userOrders) {
    const grid = document.getElementById('manager-orders-grid');
    if (!grid) return;

    if (userOrders.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <h3>Заявки не созданы</h3>
          <p>Создайте заявку на технику, и владельцы смогут откликнуться на неё</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = '';
    // Используем существующую логику рендеринга из renderManagerOrders
    // но без нового API запроса
    userOrders.forEach(order => {
      // Копируем логику из renderManagerOrders (строки 1629-1732)
      const card = document.createElement('div');
      card.className = 'order-card';
      
      let statusText = '';
      let statusClass = '';
      let bidsInfo = null;
      
      switch (order.status) {
        case 'auction_active':
          const bidsCount = order.bids_count || 0;
          bidsInfo = formatBidsCount(bidsCount);
          statusText = `Аукцион активен`;
          statusClass = 'pending';
          break;
        case 'auction_closed':
          statusText = 'Аукцион завершен';
          statusClass = 'available';
          break;
        case 'completed':
          statusText = 'Завершена';
          statusClass = 'busy';
          break;
        case 'cancelled':
          statusText = 'Отменена';
          statusClass = 'busy';
          break;
        default:
          statusText = 'Ожидает';
          statusClass = 'pending';
      }
      
      const deadline = order.auction_deadline;
      const timerId = `manager-timer-${order.id}`;
      
      let winnerInfo = '';
      if (order.status === 'auction_closed' && order.winning_owner_name) {
        winnerInfo = `
          <div class="winner-card">
            <div class="winner-header">
              <span class="winner-icon">🏆</span>
              <h4>Победитель аукциона</h4>
            </div>
            <div class="winner-details">
              <div class="winner-contact">
                <p><strong>👤 ${order.winning_owner_name}</strong></p>
                <p>📞 <a href="tel:${order.winning_owner_phone}">${order.winning_owner_phone}</a></p>
              </div>
              <div class="winner-price">
                <span class="price-label">Цена:</span>
                <span class="price-value">${order.winning_price ? order.winning_price.toLocaleString() + ' ₽' : 'Не указана'}</span>
              </div>
            </div>
          </div>
        `;
      } else if (order.status === 'auction_closed') {
        winnerInfo = `
          <div class="no-winner-card">
            <p>❌ Аукцион завершен без победителя</p>
          </div>
        `;
      }

      // Добавляем класс для кликабельности завершенных аукционов
      if (order.status === 'auction_closed') {
        card.classList.add('clickable');
        card.style.cursor = 'pointer';
        card.onclick = () => showAuctionResults(order.id);
      }

      card.innerHTML = `
        <h3>${order.equipment_type} - ${order.equipment_subtype}</h3>
        <div class="order-info">
          <p><strong>Период:</strong> ${formatDate(order.start_date)} - ${formatDate(order.end_date)}</p>
          <p><strong>Местоположение:</strong> ${order.location}</p>
          <p><strong>Описание:</strong> ${order.work_description}</p>
          <p><strong>Создана:</strong> ${formatDate(order.created_at)}</p>
          ${deadline && order.status === 'auction_active' ? 
            `<p><strong>До окончания:</strong> <span id="${timerId}" class="auction-timer">Загрузка...</span></p>` : 
            deadline ? `<p><strong>Завершен:</strong> ${new Date(deadline).toLocaleString()}</p>` : ''
          }
        </div>
        <div class="order-badges">
          <span class="badge badge--${statusClass}">
            ${statusText}
          </span>
          ${order.status === 'auction_active' && bidsInfo ? 
            `<span class="badge badge--info bids-counter ${bidsInfo.class}">
              ${bidsInfo.icon} ${bidsInfo.text}
            </span>` : ''
          }
          ${order.status === 'auction_closed' ? 
            `<span class="badge badge--secondary clickable-hint">
              👁️ Нажмите для просмотра результатов
            </span>` : ''
          }
        </div>
        
        
        ${winnerInfo}
      `;
      grid.appendChild(card);

      // Запускаем таймер для активных аукционов 
      if (deadline && order.status === 'auction_active') {
        const status = auctionTimer.getAuctionStatus(deadline);
        
        // Если аукцион уже истек, обновляем статус сразу
        if (status.expired) {
          this.handleExpiredAuction(card, order.id);
        } else {
          auctionTimer.createTimer(timerId, deadline, {
            prefix: '⏰',
            activeClass: `auction-timer ${status.class}`,
            urgentClass: 'auction-timer urgent',
            expiredClass: 'auction-timer expired',
            expiredText: '⏱️ Аукцион завершен',
            onExpired: () => {
              this.handleExpiredAuction(card, order.id);
            }
          });
        }
      }
    });
  }

  // Обработка истекшего аукциона на фронтенде
  handleExpiredAuction(card, orderId) {
    try {
      // Обновляем визуальное состояние карточки
      const statusBadge = card.querySelector('.badge--pending');
      if (statusBadge) {
        statusBadge.textContent = 'Аукцион завершен';
        statusBadge.className = 'badge badge--available';
      }

      // Добавляем кликабельность
      card.classList.add('clickable');
      card.style.cursor = 'pointer';
      card.onclick = () => showAuctionResults(orderId);

      // Добавляем подсказку
      const badgesContainer = card.querySelector('.order-badges');
      if (badgesContainer && !badgesContainer.querySelector('.clickable-hint')) {
        const hintBadge = document.createElement('span');
        hintBadge.className = 'badge badge--secondary clickable-hint';
        hintBadge.innerHTML = '👁️ Нажмите для просмотра результатов';
        badgesContainer.appendChild(hintBadge);
      }

      console.log(`✅ Аукцион #${orderId} помечен как завершенный на фронтенде`);
      
    } catch (error) {
      console.error('❌ Ошибка при обработке истекшего аукциона:', error);
    }
  }

  // Рендеринг заявок владельца из уже полученных данных
  renderOwnerOrdersFromData(relevantOrders) {
    const grid = document.getElementById('owner-orders-grid');
    if (!grid) return;

    if (relevantOrders.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <h3>Нет подходящих заявок</h3>
          <p>Заявки, подходящие под вашу технику, появятся здесь</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = '';
    relevantOrders.forEach(order => {
      const card = document.createElement('div');
      card.className = 'order-card';
          
      const deadline = order.auction_deadline;
      const timerId = `owner-timer-${order.id}`;
      const timeLeft = deadline ? Math.max(0, new Date(deadline) - new Date()) : 0;
      
      card.innerHTML = `
        <h3>Заявка на ${order.equipment_type}</h3>
        <div class="order-info">
          <p><strong>Подтип:</strong> ${order.equipment_subtype}</p>
          <p><strong>Период:</strong> ${formatDate(order.start_date)} - ${formatDate(order.end_date)}</p>
          <p><strong>Местоположение:</strong> ${order.location}</p>
          <p><strong>Описание:</strong> ${order.work_description}</p>
          <p><strong>Заказчик:</strong> ${order.manager_name || 'Неизвестно'}</p>
          ${deadline ? `<p><strong>До окончания:</strong> <span id="${timerId}" class="auction-timer">Загрузка...</span></p>` : ''}
        </div>
        <div class="order-badges">
          <span class="badge badge--${order.has_bid ? 'available' : 'pending'}">
            ${order.has_bid ? 'Ставка подана' : 'Можно подать ставку'}
          </span>
        </div>
        <div class="order-actions">
          ${!order.has_bid && timeLeft > 0 ? `
          <button class="btn btn--primary btn--sm" onclick="respondToOrder(${order.id})">
              Подать ставку
          </button>
          ` : ''}
          ${order.has_bid ? '<p style="color: var(--muted-foreground); font-size: 12px;">Ваша ставка принята к рассмотрению</p>' : ''}
        </div>
      `;

      grid.appendChild(card);

      // Запускаем таймер для этой заявки, если нужно
      if (deadline && timeLeft > 0) {
        auctionTimer.createTimer(timerId, deadline, {
          activeClass: 'timer-active',
          urgentClass: 'timer-urgent',
          expiredText: '⏱️ Время истекло'
          // Убираем onExpired чтобы избежать рекурсивных вызовов
        });
      }
    });
  }
}

// Глобальный экземпляр автообновления
const realTimeUpdater = new RealTimeUpdater();

// Утилиты для аукционов
function formatDate(date) {
  if (!date) return 'Не указана';
  return new Date(date).toLocaleDateString('ru-RU');
}

// Склонение слова "ставка"
function getBidsWord(count) {
  if (count % 10 === 1 && count % 100 !== 11) {
    return 'ставка';
  } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
    return 'ставки';
  } else {
    return 'ставок';
  }
}

// Красивое отображение количества ставок
function formatBidsCount(count) {
  if (count === 0) {
    return { text: 'Ставок нет', class: 'no-bids', icon: '📭' };
  } else if (count === 1) {
    return { text: '1 ставка', class: 'few-bids', icon: '📮' };
  } else if (count < 5) {
    return { text: `${count} ${getBidsWord(count)}`, class: 'some-bids', icon: '📬' };
  } else {
    return { text: `${count} ${getBidsWord(count)}`, class: 'many-bids', icon: '📫' };
  }
}

// Инициализация системы уведомлений
function initializeNotifications() {
  // Обработчики кнопок тестовых уведомлений для всех ролей
  const testNotificationBtns = [
    'admin-test-notification-btn',
    'owner-test-notification-btn', 
    'manager-test-notification-btn'
  ];
  
  testNotificationBtns.forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.addEventListener('click', async () => {
        try {
        const response = await apiRequest('/notifications/test', {
          method: 'POST'
        });

        if (response.success && window.notificationManager) {
          window.notificationManager.show('Тестовое уведомление создано и отправлено!', 'success');
          
          // Обновляем список уведомлений
          if (window.notificationCenter) {
            setTimeout(() => {
              window.notificationCenter.loadNotifications();
            }, 1000);
          }
        }
        } catch (error) {
          console.error('Ошибка создания тестового уведомления:', error);
          if (window.notificationManager) {
            window.notificationManager.show('Ошибка создания уведомления: ' + error.message, 'error');
          }
        }
      });
    }
  });

  // Обработчики кнопок "отметить все как прочитанные" для всех ролей
  const markAllReadBtns = [
    'admin-mark-all-read-btn',
    'owner-mark-all-read-btn',
    'manager-mark-all-read-btn'
  ];
  
  markAllReadBtns.forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.addEventListener('click', async () => {
        if (window.notificationCenter) {
          await window.notificationCenter.markAllAsRead();
          if (window.notificationManager) {
            window.notificationManager.show('Все уведомления отмечены как прочитанные', 'success');
          }
        }
      });
    }
  });

  // Обработчики переключения на вкладку уведомлений
  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-tab="notifications"]')) {
      e.preventDefault();
      showTab('notifications');
      
      // Загружаем уведомления при открытии вкладки
      if (window.notificationCenter) {
        renderNotificationsList();
      }
    }
  });
}

// Отображение списка уведомлений в интерфейсе
async function renderNotificationsList() {
  const notificationsList = document.getElementById('notifications-list');
  const loading = document.getElementById('notifications-loading');
  
  if (!notificationsList || !window.notificationCenter) return;
  
  try {
    // Показываем загрузку
    if (loading) loading.style.display = 'block';
    
    // Загружаем уведомления с сервера
    await window.notificationCenter.loadNotifications();
    
    const notifications = window.notificationCenter.notifications;
    
    // Скрываем загрузку
    if (loading) loading.style.display = 'none';
    
    if (notifications.length === 0) {
      notificationsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔔</div>
          <h3>Нет уведомлений</h3>
          <p>У вас пока нет уведомлений</p>
        </div>
      `;
      return;
    }
    
    // Отображаем уведомления
    notificationsList.innerHTML = notifications.map(notification => `
      <div class="notification-item ${notification.read ? 'read' : 'unread'}" data-id="${notification.id}">
        <div class="notification-header">
          <div class="notification-type ${notification.type}">${getNotificationTypeIcon(notification.type)}</div>
          <div class="notification-time">${formatTimeAgo(notification.created_at)}</div>
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
    
    // Добавляем обработчики для кнопок
    notificationsList.addEventListener('click', handleNotificationAction);
    
  } catch (error) {
    console.error('Ошибка загрузки уведомлений:', error);
    
    if (loading) loading.style.display = 'none';
    
    notificationsList.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <h3>Ошибка загрузки</h3>
        <p>Не удалось загрузить уведомления: ${error.message}</p>
        <button class="btn btn--primary" onclick="renderNotificationsList()">Повторить</button>
      </div>
    `;
  }
}

// Обработчик действий с уведомлениями
async function handleNotificationAction(e) {
  if (e.target.matches('.mark-read-btn')) {
    const notificationId = e.target.dataset.id;
    
    if (window.notificationCenter) {
      await window.notificationCenter.markAsRead(notificationId);
      
      // Обновляем отображение
      const notificationItem = e.target.closest('.notification-item');
      if (notificationItem) {
        notificationItem.classList.remove('unread');
        notificationItem.classList.add('read');
        e.target.remove(); // Убираем кнопку
      }
      
      if (window.notificationManager) {
        window.notificationManager.show('Уведомление отмечено как прочитанное', 'success');
      }
    }
  }
}

// Получить иконку для типа уведомления
function getNotificationTypeIcon(type) {
  const icons = {
    'request': '📋',
    'auction': '💰', 
    'system': '⚙️'
  };
  return icons[type] || '📢';
}

// Форматирование времени "назад"
function formatTimeAgo(dateString) {
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

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
  // Показываем главную страницу
  showPage('login-page');
  
  // Инициализация системы уведомлений
  initializeNotifications();

  // Добавляем демо уведомления для тестирования (только в dev-режиме)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    setTimeout(() => {
      if (window.notificationCenter) {
        window.notificationCenter.addDemoNotifications();
      }
    }, 2000);
  }
  
  // Инициализируем форму входа
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  
  // Инициализируем кнопки выхода
  document.querySelectorAll('.logout-btn').forEach(btn => {
    btn.addEventListener('click', handleLogout);
  });
});