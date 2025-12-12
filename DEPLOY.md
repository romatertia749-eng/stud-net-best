# Инструкция по деплою StudNet в Telegram

## Для локальной разработки

Приложение уже настроено для работы без Telegram. Просто запустите:
```bash
npm run dev
```

Приложение будет работать с мок-пользователем в режиме разработки.

## Для продакшена в Telegram

### 1. Создание Telegram бота

1. Откройте Telegram и найдите [@BotFather](https://t.me/BotFather)
2. Отправьте команду `/newbot`
3. Следуйте инструкциям:
   - Введите имя бота (например: "StudNet")
   - Введите username бота (должен заканчиваться на `bot`, например: `studnet_bot`)
4. Сохраните токен бота (понадобится для бэкенда)

### 2. Настройка Web App

1. Отправьте BotFather команду `/newapp`
2. Выберите вашего бота из списка
3. Введите название приложения (например: "StudNet")
4. Введите описание (например: "Студенческий нетворкинг")
5. Загрузите иконку (512x512px, PNG)
6. **Важно**: Введите URL вашего задеплоенного приложения:
   - Если используете Vercel: `https://stud-net-best.vercel.app` (или ваш кастомный домен)
   - Если используете Netlify: `https://stud-net-best.netlify.app`
   - Или любой другой хостинг с HTTPS

### 3. Деплой фронтенда

#### Вариант A: Vercel (рекомендуется)

1. Создайте аккаунт на [vercel.com](https://vercel.com)
2. Подключите GitHub репозиторий:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/romatertia749-eng/stud-net-best.git
   git push -u origin main
   ```
3. В Vercel:
   - Нажмите "New Project"
   - Импортируйте репозиторий `romatertia749-eng/stud-net-best`
   - Настройки по умолчанию подойдут
   - Нажмите "Deploy"
4. После деплоя скопируйте URL (например: `https://stud-net-best.vercel.app`)
5. Обновите Web App URL в BotFather

#### Вариант B: Netlify

1. Создайте аккаунт на [netlify.com](https://netlify.com)
2. Подключите репозиторий (через GitHub)
3. Настройки сборки:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Деплой и обновление URL в BotFather

### 4. Настройка бэкенда

Ваш бэкенд должен:

1. **Принимать авторизацию от Telegram**:
   - Endpoint: `/api/auth` (POST)
   - Header: `Authorization: tma <initData>`
   - Проверять подпись `initData` используя токен бота
   - Возвращать JWT токен

2. **Пример структуры ответа**:
   ```json
   {
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "user": {
       "id": 123456789,
       "first_name": "Иван",
       "username": "ivan_user"
     }
   }
   ```

3. **Проверка подписи initData**:
   - Telegram отправляет `initData` с подписью
   - Нужно проверить подпись используя секретный ключ бота
   - Подробнее: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app

### 5. Переменные окружения

Создайте файл `.env` для локальной разработки:
```env
VITE_API_BASE_URL=https://your-backend-api.com
```

Для Vercel/Netlify добавьте переменные окружения в настройках проекта.

### 6. Тестирование

1. Откройте Telegram
2. Найдите вашего бота
3. Нажмите на кнопку "Menu" или отправьте команду `/start`
4. Если настроено Web App, появится кнопка для открытия приложения

### 7. Полезные ссылки

- [Документация Telegram Mini Apps](https://core.telegram.org/bots/webapps)
- [Telegram Web App SDK](https://github.com/telegram-mini-apps/telegram-mini-apps)
- [Vercel документация](https://vercel.com/docs)
- [Netlify документация](https://docs.netlify.com)

## Структура проекта

```
stud-net/
├── src/
│   ├── config/api.js          # Настройки API (обновите URL)
│   ├── contexts/WebAppContext.jsx  # Контекст Telegram Web App
│   └── ...
├── .env                        # Локальные переменные окружения
└── netlify.toml               # Конфигурация Netlify (если используется)
```

## Важные моменты

1. **HTTPS обязателен** - Telegram требует HTTPS для Web Apps
2. **CORS** - Убедитесь, что бэкенд разрешает запросы с вашего домена
3. **Валидация данных** - Всегда проверяйте подпись `initData` на бэкенде
4. **Токен бота** - Никогда не публикуйте токен бота в клиентском коде

