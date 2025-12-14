# Быстрый старт

## 1. Установка зависимостей

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

## 2. Настройка базы данных

Создайте базу данных PostgreSQL:
```bash
createdb networking_app
```

Примените схему:
```bash
psql networking_app < ../schema.sql
```

## 3. Настройка переменных окружения

Скопируйте `env.example` в `.env` и настройте:
```bash
cp env.example .env
```

Обязательно измените:
- `DATABASE_URL` - URL вашей базы данных
- `JWT_SECRET_KEY` - сгенерируйте ключ: `openssl rand -hex 32`
- `CORS_ORIGINS` - добавьте домен вашего фронтенда

## 4. Запуск

### Режим разработки:
```bash
python run.py
```

Или через uvicorn напрямую:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Production:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## 5. Проверка

Откройте в браузере: http://localhost:8000/docs

Должна открыться автоматическая документация API (Swagger UI).

## Структура API

- `POST /api/auth` - Авторизация
- `GET /api/profiles` - Список профилей
- `POST /api/profiles` - Создание/обновление профиля
- `POST /api/profiles/{id}/like` - Лайк
- `POST /api/profiles/{id}/pass` - Пропуск
- `GET /api/profiles/incoming-likes` - Входящие лайки
- `POST /api/profiles/respond-to-like` - Ответ на лайк
