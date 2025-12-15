# StudNet Backend

Backend API для приложения нетворкинга StudNet на FastAPI.

## Установка

1. Создайте виртуальное окружение:
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# или
venv\Scripts\activate  # Windows
```

2. Установите зависимости:

**Для Windows:**
```bash
py -m pip install -r requirements.txt
```

**Для Linux/Mac:**
```bash
pip install -r requirements.txt
# или
python3 -m pip install -r requirements.txt
```

3. Создайте файл `.env` на основе `.env.example`:
```bash
cp .env.example .env
```

4. Настройте переменные окружения в `.env`:
- `DATABASE_URL` - URL подключения к PostgreSQL
- `JWT_SECRET_KEY` - секретный ключ для JWT (сгенерируйте: `openssl rand -hex 32`)
- `CORS_ORIGINS` - список разрешённых доменов для CORS

5. Создайте базу данных и примените схему:
```bash
# Создайте БД
createdb networking_app

# Примените схему из schema.sql
psql networking_app < ../schema.sql
```

## Запуск

### Режим разработки:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Production:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Endpoints

### Авторизация
- `POST /api/auth` - Авторизация через Telegram Web App

### Профили
- `GET /api/profiles?user_id={id}&page=0&size=50` - Список профилей для свайпа
- `GET /api/profiles/{id}` - Профиль по ID
- `GET /api/profiles/user/{user_id}` - Профиль по user_id
- `POST /api/profiles` - Создание/обновление профиля (multipart/form-data)

### Свайпы
- `POST /api/profiles/{id}/like` - Лайк профиля
- `POST /api/profiles/{id}/pass` - Пропуск профиля

### Входящие лайки
- `GET /api/profiles/incoming-likes?user_id={id}` - Список входящих лайков
- `POST /api/profiles/respond-to-like?user_id={id}` - Ответ на входящий лайк

### Статические файлы
- `GET /uploads/{filename}` - Получение загруженных фотографий

## Структура проекта

```
backend/
├── main.py              # Основной файл приложения
├── config.py            # Конфигурация
├── requirements.txt     # Зависимости
├── .env.example         # Пример файла с переменными окружения
├── .env                 # Файл с переменными окружения (создайте сами)
├── uploads/             # Директория для загруженных файлов
└── README.md           # Документация
```

## Переменные окружения

- `DATABASE_URL` - URL подключения к PostgreSQL
- `JWT_SECRET_KEY` - Секретный ключ для JWT токенов
- `JWT_ALGORITHM` - Алгоритм JWT (по умолчанию HS256)
- `JWT_EXPIRATION_HOURS` - Время жизни токена в часах
- `TELEGRAM_BOT_TOKEN` - Токен Telegram бота (опционально, для проверки данных)
- `HOST` - Хост для запуска сервера
- `PORT` - Порт для запуска сервера
- `CORS_ORIGINS` - Список разрешённых доменов для CORS (через запятую)
- `UPLOAD_DIR` - Директория для загрузки файлов
- `MAX_FILE_SIZE_MB` - Максимальный размер файла в MB

## Примечания

- Фотографии автоматически оптимизируются при загрузке
- Мэтчи создаются автоматически при взаимных лайках
- Все запросы к профилям исключают неактивные и удалённые профили



