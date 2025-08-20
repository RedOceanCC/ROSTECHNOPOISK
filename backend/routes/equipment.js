const express = require('express');
const router = express.Router();
const Equipment = require('../models/Equipment');
const EquipmentType = require('../models/EquipmentType');
const { requireAuth, requireOwner, requireOwnerAccess, requireAdmin, validateRequired } = require('../middleware/auth');
const EquipmentCatalogImporter = require('../utils/csvImporter');
const Database = require('../models/Database');
const logger = require('../utils/logger');

// GET /api/equipment/equipment-types - Получить типы техники из БД (без авторизации)
router.get('/equipment-types', async (req, res, next) => {
  try {
    logger.debug('Запрос типов техники из базы данных');
    
    // Проверяем соединение с БД
    const dbInstance = Database.getInstance();
    if (!dbInstance) {
      throw new Error('База данных не подключена');
    }
    
    const importer = new EquipmentCatalogImporter(Database);
    const typesHierarchy = await importer.getTypesHierarchy();
    
    logger.info('Типы техники загружены из БД', { 
      typesCount: Object.keys(typesHierarchy).length 
    });
    
    res.json({
      success: true,
      data: typesHierarchy
    });
    
  } catch (error) {
    logger.error('Ошибка загрузки типов техники', {
      error: error.message,
      stack: error.stack
    });
    
    // Фоллбэк на хардкодные данные если БД недоступна
    logger.warn('Используем резервные данные типов техники');
    
    const fallbackTypes = {
      "Самосвал": [
        {"subtype": "3-осный (6x4)", "characteristics": "Грузоподъёмность: 15–20 т, объём кузова: 10–15 м³", "is_off_road": false},
        {"subtype": "4-осный (8x4)", "characteristics": "Грузоподъёмность: 20–30 т, объём кузова: 15–20 м³", "is_off_road": false},
        {"subtype": "Сочленённый (30 т)", "characteristics": "Грузоподъёмность: 30 т, объём кузова: 18 м³", "is_off_road": true},
        {"subtype": "Карьерный (90 т)", "characteristics": "Грузоподъёмность: 90 т, объём кузова: 50 м³", "is_off_road": true}
      ],
      "Автокран (колёсный)": [
        {"subtype": "16 т", "characteristics": "Грузоподъёмность: 16 т, стрела: 18 м", "is_off_road": false},
        {"subtype": "25 т (короткая стрела)", "characteristics": "Грузоподъёмность: 25 т, стрела: 28 м", "is_off_road": false},
        {"subtype": "32 т", "characteristics": "Грузоподъёмность: 32 т, стрела: 30.2 м", "is_off_road": false},
        {"subtype": "50 т", "characteristics": "Грузоподъёмность: 50 т, стрела: 44.5 м", "is_off_road": false}
      ],
      "Экскаватор (гусеничный, полноповоротный)": [
        {"subtype": "Мини (2 т)", "characteristics": "Вес: 2 т, ковш: 0.05 м³", "is_off_road": true},
        {"subtype": "Средний (20 т)", "characteristics": "Вес: 20 т, ковш: 0.9 м³", "is_off_road": true},
        {"subtype": "Тяжёлый (50 т)", "characteristics": "Вес: 50 т, ковш: 2.5 м³", "is_off_road": true}
      ],
      "Бульдозер (гусеничный)": [
        {"subtype": "Малый (10 т)", "characteristics": "Вес: 10 т, ширина отвала: 3 м", "is_off_road": true},
        {"subtype": "Средний (20 т)", "characteristics": "Вес: 20 т, ширина отвала: 4 м", "is_off_road": true},
        {"subtype": "Большой (40 т)", "characteristics": "Вес: 40 т, ширина отвала: 5 м", "is_off_road": true}
      ]
    };
    
    res.json({
      success: true,
      data: fallbackTypes,
      fallback: true
    });
  }
});

// Применяем авторизацию ко всем остальным роутам
router.use(requireAuth);

// GET /api/equipment - Получить список техники
router.get('/', async (req, res, next) => {
  try {
    let equipment;
    
    if (req.user.role === 'admin') {
      // Админ видит всю технику
      equipment = await Equipment.findAll();
    } else if (req.user.role === 'owner') {
      // Владелец видит только свою технику
      equipment = await Equipment.findByOwnerId(req.user.id);
    } else if (req.user.role === 'manager') {
      // Менеджер видит только технику партнерских компаний
      equipment = await Equipment.findAvailableForManagerAll(req.user.id);
    } else {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещен'
      });
    }
    
    res.json({
      success: true,
      equipment: equipment
    });
    
  } catch (error) {
    next(error);
  }
});

// GET /api/equipment/types - Получить доступные типы техники для менеджера
router.get('/types', async (req, res, next) => {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Доступно только менеджерам'
      });
    }
    
    const types = await Equipment.getAvailableTypesForManager(req.user.id);
    
    res.json({
      success: true,
      types: types
    });
    
  } catch (error) {
    next(error);
  }
});

// GET /api/equipment/available - Получить технику по типу для создания заявки
router.get('/available', async (req, res, next) => {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Доступно только менеджерам'
      });
    }
    
    const { type, subtype } = req.query;
    
    if (!type || !subtype) {
      return res.status(400).json({
        success: false,
        message: 'Требуются параметры type и subtype'
      });
    }
    
    const equipment = await Equipment.findAvailableForManager(req.user.id, type, subtype);
    
    res.json({
      success: true,
      equipment: equipment,
      count: equipment.length
    });
    
  } catch (error) {
    next(error);
  }
});

// GET /api/equipment/:id - Получить технику по ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const equipment = await Equipment.findById(id);
    
    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: 'Техника не найдена'
      });
    }
    
    // Проверяем права доступа
    if (req.user.role !== 'admin' && req.user.id !== equipment.owner_id) {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещен'
      });
    }
    
    res.json({
      success: true,
      equipment: equipment
    });
    
  } catch (error) {
    next(error);
  }
});

// POST /api/equipment - Добавить технику (только владельцы)
router.post('/',
  requireOwner,
  validateRequired(['name', 'type', 'subtype', 'phone']),
  async (req, res, next) => {
    try {
      const {
        name, type, subtype, phone, telegram_id, license_plate,
        is_off_road, additional_equipment, description, hourly_rate, daily_rate, location
      } = req.body;
      
      const equipmentData = {
        name,
        type,
        subtype,
        owner_id: req.user.id, // Автоматически устанавливаем владельца
        phone,
        telegram_id: telegram_id || null,
        license_plate: license_plate || null,
        is_off_road: is_off_road || false,
        additional_equipment: additional_equipment || null,
        description: description || null,
        hourly_rate: hourly_rate ? parseFloat(hourly_rate) : null,
        daily_rate: daily_rate ? parseFloat(daily_rate) : null,
        location: location || null
      };
      
      const equipment = await Equipment.create(equipmentData);
      
      res.status(201).json({
        success: true,
        message: 'Техника добавлена успешно',
        equipment: equipment
      });
      
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/equipment/:id - Обновить технику
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Проверяем существование техники и права доступа
    const existingEquipment = await Equipment.findById(id);
    
    if (!existingEquipment) {
      return res.status(404).json({
        success: false,
        message: 'Техника не найдена'
      });
    }
    
    // Проверяем права доступа
    if (req.user.role !== 'admin' && req.user.id !== existingEquipment.owner_id) {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещен'
      });
    }
    
    const {
      name, type, subtype, phone, telegram_id, license_plate,
      is_off_road, additional_equipment, description, hourly_rate, daily_rate, location, status
    } = req.body;
    
    const updateData = {
      name: name || existingEquipment.name,
      type: type || existingEquipment.type,
      subtype: subtype || existingEquipment.subtype,
      phone: phone || existingEquipment.phone,
      telegram_id: telegram_id !== undefined ? telegram_id : existingEquipment.telegram_id,
      license_plate: license_plate !== undefined ? license_plate : existingEquipment.license_plate,
      is_off_road: is_off_road !== undefined ? is_off_road : existingEquipment.is_off_road,
      additional_equipment: additional_equipment !== undefined ? additional_equipment : existingEquipment.additional_equipment,
      description: description !== undefined ? description : existingEquipment.description,
      hourly_rate: hourly_rate !== undefined ? (hourly_rate ? parseFloat(hourly_rate) : null) : existingEquipment.hourly_rate,
      daily_rate: daily_rate !== undefined ? (daily_rate ? parseFloat(daily_rate) : null) : existingEquipment.daily_rate,
      location: location !== undefined ? location : existingEquipment.location,
      status: status || existingEquipment.status
    };
    
    // Только админ может изменять статус
    if (req.user.role !== 'admin') {
      updateData.status = existingEquipment.status;
    }
    
    const equipment = await Equipment.update(id, updateData);
    
    res.json({
      success: true,
      message: 'Техника обновлена успешно',
      equipment: equipment
    });
    
  } catch (error) {
    next(error);
  }
});

// PATCH /api/equipment/:id/status - Обновить статус техники (только админ)
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Только администратор может изменять статус техники'
      });
    }
    
    const validStatuses = ['available', 'busy', 'maintenance'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Неверный статус техники'
      });
    }
    
    const updated = await Equipment.updateStatus(id, status);
    
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Техника не найдена'
      });
    }
    
    res.json({
      success: true,
      message: 'Статус техники обновлен успешно'
    });
    
  } catch (error) {
    next(error);
  }
});

// DELETE /api/equipment/:id - Удалить технику
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Проверяем существование техники и права доступа
    const existingEquipment = await Equipment.findById(id);
    
    if (!existingEquipment) {
      return res.status(404).json({
        success: false,
        message: 'Техника не найдена'
      });
    }
    
    // Проверяем права доступа
    if (req.user.role !== 'admin' && req.user.id !== existingEquipment.owner_id) {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещен'
      });
    }
    
    // Проверяем, что техника не используется в активных заявках
    if (existingEquipment.status === 'busy') {
      return res.status(400).json({
        success: false,
        message: 'Нельзя удалить технику, которая используется в активной заявке'
      });
    }
    
    const deleted = await Equipment.delete(id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Техника не найдена'
      });
    }
    
    res.json({
      success: true,
      message: 'Техника удалена успешно'
    });
    
  } catch (error) {
    next(error);
  }
});

// GET /api/equipment/search - Поиск техники по типу
router.get('/search/by-type', async (req, res, next) => {
  try {
    const { type, subtype } = req.query;
    
    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Параметр type обязателен'
      });
    }
    
    const equipment = await Equipment.findByType(type, subtype);
    
    res.json({
      success: true,
      equipment: equipment
    });
    
  } catch (error) {
    next(error);
  }
});

// GET /api/equipment/stats - Получить статистику по технике (только админ)
router.get('/admin/stats', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещен'
      });
    }
    
    const stats = await Equipment.getStats();
    const popularTypes = await Equipment.getPopularTypes();
    
    res.json({
      success: true,
      stats: stats,
      popular_types: popularTypes
    });
    
  } catch (error) {
    next(error);
  }
});

// GET /api/equipment/owner/:ownerId - Получить технику владельца
router.get('/owner/:ownerId', async (req, res, next) => {
  try {
    const { ownerId } = req.params;
    
    // Проверяем права доступа
    if (req.user.role !== 'admin' && req.user.id !== parseInt(ownerId)) {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещен'
      });
    }
    
    const equipment = await Equipment.findByOwnerId(ownerId);
    
    res.json({
      success: true,
      equipment: equipment
    });
    
  } catch (error) {
    next(error);
  }
});

// === УПРАВЛЕНИЕ ТИПАМИ ТЕХНИКИ ===

// GET /api/equipment/types-management - Получить все типы для управления (только админ)
router.get('/types-management', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const types = await EquipmentType.findAllTypes();
    const hierarchy = await EquipmentType.getTypesHierarchy();
    
    res.json({
      success: true,
      types: types,
      hierarchy: hierarchy
    });
    
  } catch (error) {
    next(error);
  }
});

// POST /api/equipment/types - Создать новый тип техники (только админ)
router.post('/types', requireAuth, requireAdmin, validateRequired(['type']), async (req, res, next) => {
  try {
    const { type } = req.body;
    
    const newType = await EquipmentType.createType(type);
    
    res.status(201).json({
      success: true,
      message: 'Тип техники создан успешно',
      type: newType
    });
    
  } catch (error) {
    next(error);
  }
});

// PUT /api/equipment/types/:id - Обновить тип техники (только админ)
router.put('/types/:id', requireAuth, requireAdmin, validateRequired(['type']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type } = req.body;
    
    const updatedType = await EquipmentType.updateType(parseInt(id), type);
    
    res.json({
      success: true,
      message: 'Тип техники обновлен успешно',
      type: updatedType
    });
    
  } catch (error) {
    next(error);
  }
});

// DELETE /api/equipment/types/:typeName - Удалить тип техники (только админ)
router.delete('/types/:typeName', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { typeName } = req.params;
    
    const result = await EquipmentType.deleteType(decodeURIComponent(typeName));
    
    res.json({
      success: true,
      message: 'Тип техники удален успешно',
      result: result
    });
    
  } catch (error) {
    next(error);
  }
});

// GET /api/equipment/types/:typeName/subtypes - Получить подтипы для типа
router.get('/types/:typeName/subtypes', async (req, res, next) => {
  try {
    const { typeName } = req.params;
    
    const subtypes = await EquipmentType.findSubtypesByType(decodeURIComponent(typeName));
    
    res.json({
      success: true,
      subtypes: subtypes
    });
    
  } catch (error) {
    next(error);
  }
});

// POST /api/equipment/types/:typeId/subtypes - Создать подтип для типа (только админ)
router.post('/types/:typeId/subtypes', requireAuth, requireAdmin, validateRequired(['subtype']), async (req, res, next) => {
  try {
    const { typeId } = req.params;
    const subtypeData = req.body;
    
    const newSubtype = await EquipmentType.createSubtype(parseInt(typeId), subtypeData);
    
    res.status(201).json({
      success: true,
      message: 'Подтип техники создан успешно',
      subtype: newSubtype
    });
    
  } catch (error) {
    next(error);
  }
});

// PUT /api/equipment/subtypes/:id - Обновить подтип техники (только админ)
router.put('/subtypes/:id', requireAuth, requireAdmin, validateRequired(['subtype']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const subtypeData = req.body;
    
    const updatedSubtype = await EquipmentType.updateSubtype(parseInt(id), subtypeData);
    
    res.json({
      success: true,
      message: 'Подтип техники обновлен успешно',
      subtype: updatedSubtype
    });
    
  } catch (error) {
    next(error);
  }
});

// DELETE /api/equipment/subtypes/:id - Удалить подтип техники (только админ)
router.delete('/subtypes/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await EquipmentType.deleteSubtype(parseInt(id));
    
    res.json({
      success: true,
      message: 'Подтип техники удален успешно',
      result: result
    });
    
  } catch (error) {
    next(error);
  }
});

module.exports = router;
