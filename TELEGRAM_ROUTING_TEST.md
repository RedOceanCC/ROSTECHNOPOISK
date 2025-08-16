# 🔍 Тестирование роутинга Telegram WebApp

## 🚨 Проблема
URL https://xn--e1aggkdcahelgf4b.xn--p1ai/telegram/request.html дает 404

## 📊 Пошаговое тестирование

### Шаг 1: Загрузите обновленные файлы
- `backend/server.js` (добавлено логирование и тестовый роут)
- `telegram-webapp/test.html` (новый тестовый файл)

### Шаг 2: Перезапустите сервер
```bash
pm2 restart rostechnopoisk
```

### Шаг 3: Проверьте тестовые URL по порядку

**1. Прямой роут (должен работать):**
https://xn--e1aggkdcahelgf4b.xn--p1ai/telegram/test-direct

**2. Простой статический файл:**
https://xn--e1aggkdcahelgf4b.xn--p1ai/telegram/test.html

**3. Основной файл:**
https://xn--e1aggkdcahelgf4b.xn--p1ai/telegram/request.html

### Шаг 4: Проверьте логи
```bash
pm2 logs rostechnopoisk
```

Должны быть сообщения:
```
🤖 Telegram WebApp путь: /path/to/telegram-webapp
🤖 Файл существует: true
✅ Telegram WebApp найден в: /correct/path
📱 Telegram запрос: GET /test.html /test.html
```

## 🎯 Результаты тестирования

### Если работает test-direct, но не работают статические файлы:
**Проблема:** Статические файлы не найдены или неправильные права

**Решение:**
```bash
# Проверьте структуру
ls -la telegram-webapp/
chmod 755 telegram-webapp/
chmod 644 telegram-webapp/*.html
```

### Если не работает даже test-direct:
**Проблема:** Роутинг перехватывается фронтендом

**Решение:** Проблема в порядке middleware в server.js

### Если test.html работает, но request.html нет:
**Проблема:** Конкретно с файлом request.html

**Решение:** 
```bash
# Проверьте файл
ls -la telegram-webapp/request.html
file telegram-webapp/request.html
```

## 🔧 Диагностические команды

**На сервере выполните:**
```bash
# Найти все файлы telegram
find /path/to/app -name "*telegram*" -type f

# Проверить права
ls -la telegram-webapp/

# Проверить содержимое папки
ls -la telegram-webapp/

# Проверить размер файла
du -h telegram-webapp/request.html
```

## 🚀 Быстрое исправление

Если статические файлы не работают, добавьте прямые роуты:

```javascript
// В server.js добавьте перед статическими файлами:
app.get('/telegram/request.html', (req, res) => {
  const filePath = path.join(__dirname, '../telegram-webapp/request.html');
  res.sendFile(filePath);
});
```

## 📞 Что делать дальше

1. **Проверьте все 3 тестовых URL**
2. **Покажите результаты и логи**
3. **Выполните диагностические команды**

Это поможет точно определить где проблема! 🎯
