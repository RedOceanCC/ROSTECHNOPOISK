const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// Импорт данных из CSV файла каталога техники
class EquipmentCatalogImporter {
  constructor(database) {
    this.database = database;
  }

  async importFromCSV(csvFilePath) {
    try {
      logger.info('Начало импорта каталога техники из CSV', { file: csvFilePath });
      
      const csvContent = fs.readFileSync(csvFilePath, 'utf8');
      const lines = csvContent.split('\n');
      
      // Пропускаем заголовок и служебные строки
      const dataLines = lines.slice(2, -2); // Убираем ```csv и ```
      
      let imported = 0;
      let errors = 0;
      
      for (const line of dataLines) {
        if (!line.trim()) continue;
        
        try {
          const data = this.parseCSVLine(line);
          if (data) {
            await this.insertEquipmentType(data);
            imported++;
            logger.debug('Импортирован тип техники', data);
          }
        } catch (error) {
          errors++;
          logger.error('Ошибка импорта строки CSV', { 
            line: line.substring(0, 100),
            error: error.message 
          });
        }
      }
      
      logger.info('Импорт каталога техники завершен', { 
        imported, 
        errors,
        total: dataLines.length 
      });
      
      return { imported, errors, total: dataLines.length };
      
    } catch (error) {
      logger.error('Критическая ошибка импорта каталога', { 
        error: error.message,
        stack: error.stack 
      });
      throw error;
    }
  }

  parseCSVLine(line) {
    // Простой парсер CSV с учетом кавычек
    const fields = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    
    if (fields.length < 5) {
      logger.warn('Недостаточно полей в строке CSV', { fields: fields.length });
      return null;
    }
    
    return {
      type: fields[0],
      subtype: fields[1],
      characteristics: fields[2],
      is_off_road: this.parseOffRoad(fields[3]),
      additional_options: fields[4]
    };
  }

  parseOffRoad(value) {
    const normalized = value.toLowerCase().trim();
    return normalized === 'да' || normalized === 'yes' || normalized === '1';
  }

  async insertEquipmentType(data) {
    const sql = `
      INSERT OR IGNORE INTO equipment_types 
      (type, subtype, characteristics, is_off_road, additional_options)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    return await this.database.run(sql, [
      data.type,
      data.subtype,
      data.characteristics,
      data.is_off_road ? 1 : 0,
      data.additional_options
    ]);
  }

  // Получить все типы техники
  async getAllTypes() {
    const sql = `
      SELECT DISTINCT type 
      FROM equipment_types 
      ORDER BY type
    `;
    return await this.database.all(sql);
  }

  // Получить подтипы для типа
  async getSubtypesForType(type) {
    const sql = `
      SELECT subtype, characteristics, is_off_road, additional_options
      FROM equipment_types 
      WHERE type = ?
      ORDER BY subtype
    `;
    return await this.database.all(sql, [type]);
  }

  // Получить все типы с подтипами (для фронтенда)
  async getTypesHierarchy() {
    const sql = `
      SELECT type, subtype, characteristics, is_off_road, additional_options
      FROM equipment_types 
      ORDER BY type, subtype
    `;
    
    const rows = await this.database.all(sql);
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

  // Проверить, существует ли комбинация тип+подтип
  async validateTypeSubtype(type, subtype) {
    const sql = `
      SELECT COUNT(*) as count
      FROM equipment_types 
      WHERE type = ? AND subtype = ?
    `;
    
    const result = await this.database.get(sql, [type, subtype]);
    return result.count > 0;
  }
}

module.exports = EquipmentCatalogImporter;
