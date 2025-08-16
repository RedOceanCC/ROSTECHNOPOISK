const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = null;
  }

  // Подключение к базе данных
  connect() {
    return new Promise((resolve, reject) => {
      const dbPath = process.env.DB_PATH || './database/rostechnopolsk.db';
      
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Ошибка подключения к базе данных:', err.message);
          reject(err);
        } else {
          console.log('✅ Подключение к SQLite базе данных установлено');
          // Включаем поддержку внешних ключей
          this.db.run('PRAGMA foreign_keys = ON');
          resolve();
        }
      });
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
}

// Создаем единственный экземпляр (Singleton)
const database = new Database();

module.exports = database;
