# 🔍 Диагностика проблемы с Telegram WebApp

## 🚨 Текущая ситуация
- ✅ API работает: https://xn--e1aggkdcahelgf4b.xn--p1ai/api/health
- ❌ Telegram WebApp не работает: `/telegram/request.html` → 404

## 📊 Шаги диагностики

### 1. Загрузите обновленный `backend/server.js` на сервер
Файл содержит отладочную информацию для поиска папки telegram-webapp

### 2. Перезапустите сервер
```bash
pm2 restart rostechnopoisk
# или
sudo systemctl restart rostechnopoisk
```

### 3. Проверьте диагностику
Откройте: **https://xn--e1aggkdcahelgf4b.xn--p1ai/api/telegram/debug**

Это покажет:
- Текущую рабочую директорию сервера
- Где сервер ищет папку telegram-webapp
- Существуют ли файлы в найденных путях

### 4. Проверьте логи сервера
```bash
pm2 logs rostechnopoisk
```

Должны быть сообщения типа:
```
🤖 Telegram WebApp путь: /path/to/telegram-webapp
🤖 Файл существует: true/false
✅ Telegram WebApp найден в: /correct/path
```

## 🛠️ Возможные проблемы и решения

### Проблема 1: Папка в неправильном месте
**Симптом:** В логах `❌ Не найден в: ...` для всех путей

**Решение:** Проверьте где на сервере находится папка `telegram-webapp`:
```bash
find /path/to/your/app -name "telegram-webapp" -type d
find /path/to/your/app -name "request.html" -type f
```

### Проблема 2: Неправильные права доступа
**Симптом:** Папка найдена, но файлы недоступны

**Решение:** Исправьте права:
```bash
chmod -R 755 telegram-webapp/
chown -R your-user:your-group telegram-webapp/
```

### Проблема 3: Файл не существует
**Симптом:** Папка есть, но `request.html` отсутствует

**Решение:** Убедитесь что файл загружен:
```bash
ls -la telegram-webapp/
# Должен показать request.html
```

### Проблема 4: Структура проекта на сервере отличается
**Симптом:** Все пути в логах неправильные

**Решение:** На основе диагностики `/api/telegram/debug` определите правильную структуру

## 📁 Ожидаемая структура на сервере

```
/path/to/your/app/
├── backend/
│   ├── server.js
│   ├── package.json
│   └── ... (другие файлы backend)
├── telegram-webapp/
│   └── request.html
├── frontend/
│   └── build/ (если есть)
└── production-config.env
```

## 🔧 Принудительное решение

Если автоматический поиск не работает, замените в `server.js`:

```javascript
// Вместо автоматического поиска, укажите точный путь
app.use('/telegram', express.static('/absolute/path/to/telegram-webapp'));
```

Где `/absolute/path/to/telegram-webapp` - это точный путь к папке на вашем сервере.

## 📞 Что делать дальше

1. **Загрузите обновленный server.js**
2. **Перезапустите сервер**
3. **Проверьте /api/telegram/debug**
4. **Отправьте мне результат диагностики**

После этого я смогу точно определить где проблема и как её исправить!

## 🎯 Быстрая проверка

После перезапуска сервера проверьте:
1. Логи показывают где найдена папка telegram-webapp
2. `/api/telegram/debug` показывает правильную информацию
3. `/telegram/request.html` начинает работать
