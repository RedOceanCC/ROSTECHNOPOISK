const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const { requireAuth, requireAdmin, validateRequired } = require('../middleware/auth');

// Применяем авторизацию ко всем роутам
router.use(requireAuth);

// GET /api/companies - Получить список компаний
router.get('/', async (req, res, next) => {
  try {
    const companies = await Company.findAll();
    
    res.json({
      success: true,
      companies: companies
    });
    
  } catch (error) {
    console.error('Ошибка в GET /api/companies:', error);
    next(error);
  }
});

// GET /api/companies/:id - Получить компанию по ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const company = await Company.findById(id);
    
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Компания не найдена'
      });
    }
    
    res.json({
      success: true,
      company: company
    });
    
  } catch (error) {
    next(error);
  }
});

// POST /api/companies - Создать компанию (только админ)
router.post('/',
  requireAdmin,
  validateRequired(['name']),
  async (req, res, next) => {
    try {
      const { name, description, contact_info } = req.body;
      
      const companyData = {
        name,
        description: description || null,
        contact_info: contact_info || null
      };
      
      const company = await Company.create(companyData);
      
      res.status(201).json({
        success: true,
        message: 'Компания создана успешно',
        company: company
      });
      
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({
          success: false,
          message: 'Компания с таким названием уже существует'
        });
      }
      next(error);
    }
  }
);

// PUT /api/companies/:id - Обновить компанию (только админ)
router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, contact_info, status } = req.body;
    
    const updateData = {
      name,
      description,
      contact_info,
      status: status || 'active'
    };
    
    const company = await Company.update(id, updateData);
    
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Компания не найдена'
      });
    }
    
    res.json({
      success: true,
      message: 'Компания обновлена успешно',
      company: company
    });
    
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        success: false,
        message: 'Компания с таким названием уже существует'
      });
    }
    next(error);
  }
});

// DELETE /api/companies/:id - Удалить компанию (только админ)
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const deleted = await Company.delete(id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Компания не найдена'
      });
    }
    
    res.json({
      success: true,
      message: 'Компания удалена успешно'
    });
    
  } catch (error) {
    next(error);
  }
});

// GET /api/companies/:id/partnerships - Получить партнерства компании
router.get('/:id/partnerships', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Проверяем права доступа
    if (req.user.role !== 'admin' && req.user.company_id !== parseInt(id)) {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещен'
      });
    }
    
    const partnerships = await Company.getPartnerships(id);
    
    res.json({
      success: true,
      partnerships: partnerships
    });
    
  } catch (error) {
    next(error);
  }
});

// GET /api/partnerships - Получить все партнерства (только админ)
router.get('/admin/partnerships', requireAdmin, async (req, res, next) => {
  try {
    const partnerships = await Company.getAllPartnerships();
    
    res.json({
      success: true,
      partnerships: partnerships
    });
    
  } catch (error) {
    next(error);
  }
});

// POST /api/partnerships - Создать партнерство (только админ)
router.post('/admin/partnerships',
  requireAdmin,
  validateRequired(['owner_company_id', 'manager_company_id']),
  async (req, res, next) => {
    try {
      const { owner_company_id, manager_company_id } = req.body;
      
      if (owner_company_id === manager_company_id) {
        return res.status(400).json({
          success: false,
          message: 'Компания не может быть партнером самой себе'
        });
      }
      
      const result = await Company.createPartnership(owner_company_id, manager_company_id);
      
      res.status(201).json({
        success: true,
        message: 'Партнерство создано успешно',
        partnership_id: result.id
      });
      
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/partnerships/:id - Удалить партнерство (только админ)
router.delete('/admin/partnerships/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const deleted = await Company.deletePartnership(id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Партнерство не найдено'
      });
    }
    
    res.json({
      success: true,
      message: 'Партнерство удалено успешно'
    });
    
  } catch (error) {
    next(error);
  }
});

// GET /api/companies/:id/partners - Получить компании-партнеры
router.get('/:id/partners', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type } = req.query; // 'owner' или 'manager'
    
    // Проверяем права доступа
    if (req.user.role !== 'admin' && req.user.company_id !== parseInt(id)) {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещен'
      });
    }
    
    let partners;
    if (type === 'manager') {
      partners = await Company.getPartnerCompaniesForOwner(id);
    } else {
      partners = await Company.getPartnerCompaniesForManager(id);
    }
    
    res.json({
      success: true,
      partners: partners
    });
    
  } catch (error) {
    next(error);
  }
});

module.exports = router;
