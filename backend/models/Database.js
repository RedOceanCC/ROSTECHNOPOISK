const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { getDatabaseConfig, getConnectionOptions, checkDatabaseVersion } = require('../config/database');

class Database {
  constructor() {
    this.db = null;
    this.config = null;
  }

  // Подключение к базе данных
  connect() {
    return new Promise((resolve, reject) => {
      try {
        // Получаем конфигурацию для текущей среды
        this.config = getDatabaseConfig();
        const connectionOptions = getConnectionOptions(this.config);
        
        // Проверяем версию SQLite
        if (!checkDatabaseVersion()) {
          console.warn('⚠️  Обнаружена устаревшая версия SQLite');
        }
        
        const dbPath = this.config.database;
      
        this.db = new sqlite3.Database(dbPath, (err) => {
          if (err) {
            console.error('Ошибка подключения к базе данных:', err.message);
            reject(err);
          } else {
            console.log(`✅ Подключение к SQLite базе данных установлено (${process.env.NODE_ENV || 'local'})`);
            console.log(`📊 База данных: ${dbPath}`);
            
            // Применяем PRAGMA настройки
            const pragmas = connectionOptions.pragma || { foreign_keys: true };
            const pragmaPromises = Object.entries(pragmas).map(([key, value]) => {
              return new Promise((resolve, reject) => {
                this.db.run(`PRAGMA ${key} = ${value}`, (err) => {
                  if (err) {
                    console.warn(`⚠️  Не удалось установить PRAGMA ${key}: ${err.message}`);
                    resolve(); // Не прерываем из-за pragma
                  } else {
                    if (this.config.logging) {
                      console.log(`📋 PRAGMA ${key} = ${value}`);
                    }
                    resolve();
                  }
                });
              });
            });
            
            Promise.all(pragmaPromises).then(() => resolve()).catch(reject);
          }
        });
      } catch (configError) {
        reject(configError);
      }
    });
  }

  // Закрытие соединения
  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('Ошибка закрытия базы данных:', err.message);
            reject(err);
          } else {
            console.log('✅ Соединение с базой данных закрыто');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  // Выполнение запроса SELECT
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error('Ошибка выполнения GET запроса:', err.message);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Выполнение запроса SELECT ALL
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('Ошибка выполнения ALL запроса:', err.message);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Выполнение запроса INSERT/UPDATE/DELETE
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('Ошибка выполнения RUN запроса:', err.message);
          reject(err);
        } else {
          resolve({
            id: this.lastID,
            changes: this.changes
          });
        }
      });
    });
  }

  // Выполнение транзакции
  async transaction(queries) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        const results = [];
        let hasError = false;

        const executeQuery = (index) => {
          if (index >= queries.length) {
            if (hasError) {
              this.db.run('ROLLBACK', () => {
                reject(new Error('Транзакция отменена из-за ошибки'));
              });
            } else {
              this.db.run('COMMIT', (err) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(results);
                }
              });
            }
            return;
          }

          const { sql, params } = queries[index];
          this.db.run(sql, params, function(err) {
            if (err) {
              hasError = true;
              console.error(`Ошибка в транзакции (запрос ${index + 1}):`, err.message);
            } else {
              results.push({
                id: this.lastID,
                changes: this.changes
              });
            }
            executeQuery(index + 1);
          });
        };

        executeQuery(0);
      });
    });
  }

  // Получение экземпляра базы данных
  getInstance() {
    return this.db;
  }

  // Получение конфигурации
  getConfig() {
    return this.config;
  }

  // Получение информации о состоянии БД
  async getStatus() {
    const { getDatabaseStatus } = require('../config/database');
    return await getDatabaseStatus();
  }

  // Проверка подключения
  async ping() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('База данных не подключена'));
        return;
      }
      
      this.db.get('SELECT 1 as ping', (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.ping === 1);
        }
      });
    });
  }
}

// Создаем единственный экземпляр (Singleton)
const database = new Database();

module.exports = database;
