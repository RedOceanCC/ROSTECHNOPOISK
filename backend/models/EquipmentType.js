const database = require('./Database');

class EquipmentType {
  // Создание нового типа техники
  static async createType(typeName) {
    const sql = `
      INSERT INTO equipment_types (type, subtype, characteristics, is_off_road)
      VALUES (?, '', '', 0)
    `;
    
    try {
      const result = await database.run(sql, [typeName]);
      return { id: result.id, type: typeName };
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Тип техники уже существует');
      }
      throw error;
    }
  }
  
  // Создание нового подтипа для существующего типа
  static async createSubtype(typeId, subtypeData) {
    const { subtype, characteristics = '', is_off_road = false, additional_options = null } = subtypeData;
    
    // Получаем тип по ID
    const typeRecord = await this.findTypeById(typeId);
    if (!typeRecord) {
      throw new Error('Тип техники не найден');
    }
    
    const sql = `
      INSERT INTO equipment_types (type, subtype, characteristics, is_off_road, additional_options)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    try {
      const result = await database.run(sql, [
        typeRecord.type, subtype, characteristics, is_off_road ? 1 : 0, additional_options
      ]);
      
      return {
        id: result.id,
        type: typeRecord.type,
        subtype,
        characteristics,
        is_off_road,
        additional_options
      };
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Подтип уже существует для данного типа техники');
      }
      throw error;
    }
  }
  
  // Получение всех типов техники
  static async findAllTypes() {
    const sql = `
      SELECT DISTINCT type, MIN(id) as id
      FROM equipment_types 
      WHERE type != ''
      GROUP BY type
      ORDER BY type
    `;
    
    return await database.all(sql);
  }
  
  // Получение типа по ID
  static async findTypeById(id) {
    const sql = `
      SELECT DISTINCT type, id
      FROM equipment_types 
      WHERE id = ? AND type != ''
    `;
    
    return await database.get(sql, [id]);
  }
  
  // Получение всех подтипов для типа
  static async findSubtypesByType(typeName) {
    const sql = `
      SELECT id, subtype, characteristics, is_off_road, additional_options
      FROM equipment_types 
      WHERE type = ? AND subtype != ''
      ORDER BY subtype
    `;
    
    return await database.all(sql, [typeName]);
  }
  
  // Получение подтипа по ID
  static async findSubtypeById(id) {
    const sql = `
      SELECT id, type, subtype, characteristics, is_off_road, additional_options
      FROM equipment_types 
      WHERE id = ?
    `;
    
    return await database.get(sql, [id]);
  }
  
  // Получение полной иерархии типов и подтипов
  static async getTypesHierarchy() {
    const sql = `
      SELECT type, subtype, characteristics, is_off_road, additional_options
      FROM equipment_types 
      WHERE subtype != ''
      ORDER BY type, subtype
    `;
    
    const rows = await database.all(sql);
    const hierarchy = {};
    
    rows.forEach(row => {
      if (!hierarchy[row.type]) {
        hierarchy[row.type] = [];
      }
      hierarchy[row.type].push({
        subtype: row.subtype,
        characteristics: row.characteristics,
        is_off_road: !!row.is_off_road,
        additional_options: row.additional_options
      });
    });
    
    return hierarchy;
  }
  
  // Обновление типа техники
  static async updateType(id, newTypeName) {
    // Проверяем существование типа
    const existingType = await this.findTypeById(id);
    if (!existingType) {
      throw new Error('Тип техники не найден');
    }
    
    const sql = `
      UPDATE equipment_types 
      SET type = ?
      WHERE type = ?
    `;
    
    try {
      await database.run(sql, [newTypeName, existingType.type]);
      return { id, type: newTypeName };
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Тип техники с таким названием уже существует');
      }
      throw error;
    }
  }
  
  // Обновление подтипа техники
  static async updateSubtype(id, subtypeData) {
    const { subtype, characteristics, is_off_road, additional_options } = subtypeData;
    
    const sql = `
      UPDATE equipment_types 
      SET subtype = ?, characteristics = ?, is_off_road = ?, additional_options = ?
      WHERE id = ?
    `;
    
    try {
      const result = await database.run(sql, [
        subtype, characteristics, is_off_road ? 1 : 0, additional_options, id
      ]);
      
      if (result.changes === 0) {
        throw new Error('Подтип техники не найден');
      }
      
      return await this.findSubtypeById(id);
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Подтип с таким названием уже существует для данного типа техники');
      }
      throw error;
    }
  }
  
  // Удаление типа техники (только если нет связанной техники)
  static async deleteType(typeName) {
    // Проверяем, есть ли техника этого типа
    const equipmentCount = await database.get(
      'SELECT COUNT(*) as count FROM equipment WHERE type = ?',
      [typeName]
    );
    
    if (equipmentCount.count > 0) {
      throw new Error('Нельзя удалить тип техники, для которого есть зарегистрированная техника');
    }
    
    const sql = 'DELETE FROM equipment_types WHERE type = ?';
    const result = await database.run(sql, [typeName]);
    
    if (result.changes === 0) {
      throw new Error('Тип техники не найден');
    }
    
    return { success: true, deletedCount: result.changes };
  }
  
  // Удаление подтипа техники (только если нет связанной техники)
  static async deleteSubtype(id) {
    // Получаем информацию о подтипе
    const subtype = await this.findSubtypeById(id);
    if (!subtype) {
      throw new Error('Подтип техники не найден');
    }
    
    // Проверяем, есть ли техника этого подтипа
    const equipmentCount = await database.get(
      'SELECT COUNT(*) as count FROM equipment WHERE type = ? AND subtype = ?',
      [subtype.type, subtype.subtype]
    );
    
    if (equipmentCount.count > 0) {
      throw new Error('Нельзя удалить подтип техники, для которого есть зарегистрированная техника');
    }
    
    const sql = 'DELETE FROM equipment_types WHERE id = ?';
    const result = await database.run(sql, [id]);
    
    return { success: true, deleted: subtype };
  }
  
  // Проверка существования комбинации тип+подтип
  static async checkTypeSubtypeExists(type, subtype) {
    const sql = `
      SELECT COUNT(*) as count 
      FROM equipment_types 
      WHERE type = ? AND subtype = ?
    `;
    
    const result = await database.get(sql, [type, subtype]);
    return result.count > 0;
  }
}

module.exports = EquipmentType;
