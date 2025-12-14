# Рекомендации по оптимизации производительности

## Frontend оптимизации (уже реализовано)

✅ **Кэширование данных**
- localStorage кэш для профилей и мэтчей (10 минут)
- Мгновенная загрузка из кэша при переключении вкладок

✅ **Ограничение времени загрузки**
- Таймауты запросов: 5 секунд максимум
- Fallback на кэш при таймауте

✅ **Мемоизация**
- useMemo для фильтрации профилей
- useCallback для обработчиков
- React.memo для карточек

✅ **Debounce фильтров**
- 300ms задержка для уменьшения запросов

## Backend оптимизации (рекомендации)

### 1. Индексы в базе данных

```sql
-- Для таблицы profiles
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_city ON profiles(city);
CREATE INDEX idx_profiles_university ON profiles(university);
CREATE INDEX idx_profiles_created_at ON profiles(created_at DESC);

-- Для таблицы likes/matches
CREATE INDEX idx_likes_from_user_id ON likes(from_user_id);
CREATE INDEX idx_likes_to_user_id ON likes(to_user_id);
CREATE INDEX idx_likes_matched ON likes(matched) WHERE matched = true;
CREATE INDEX idx_likes_created_at ON likes(created_at DESC);
```

### 2. Оптимизация запросов

**Текущий запрос профилей:**
```python
# Плохо - загружает все поля
profiles = db.query(Profile).filter(...).all()

# Хорошо - загружает только нужные поля
profiles = db.query(
    Profile.id,
    Profile.user_id,
    Profile.name,
    Profile.age,
    Profile.city,
    Profile.university,
    Profile.interests,
    Profile.goals,
    Profile.bio,
    Profile.photo_url,
    Profile.username
).filter(...).limit(50).all()
```

### 3. Пагинация с курсором

Вместо offset/limit используйте cursor-based pagination:
```python
# Быстрее для больших данных
profiles = db.query(Profile).filter(
    Profile.id > last_id
).order_by(Profile.id).limit(50).all()
```

### 4. Кэширование на сервере

```python
from functools import lru_cache
from redis import Redis

redis_client = Redis()

@lru_cache(maxsize=100)
def get_profiles_cached(user_id: int):
    cache_key = f"profiles:{user_id}"
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)
    
    profiles = fetch_profiles(user_id)
    redis_client.setex(cache_key, 600, json.dumps(profiles))  # 10 минут
    return profiles
```

### 5. Оптимизация JSON полей

Если используете PostgreSQL, используйте JSONB вместо JSON:
```sql
ALTER TABLE profiles ALTER COLUMN interests TYPE JSONB USING interests::jsonb;
ALTER TABLE profiles ALTER COLUMN goals TYPE JSONB USING goals::jsonb;

-- Индексы для JSONB
CREATE INDEX idx_profiles_interests_gin ON profiles USING GIN (interests);
```

### 6. Оптимизация запроса мэтчей

```python
# Вместо нескольких запросов - один JOIN
matches = db.query(Profile).join(
    Like, Profile.user_id == Like.to_user_id
).filter(
    Like.from_user_id == current_user_id,
    Like.matched == True
).options(
    joinedload(Profile.photos)  # Eager loading для фото
).all()
```

### 7. Сжатие ответов

```python
from fastapi.middleware.gzip import GZipMiddleware

app.add_middleware(GZipMiddleware, minimum_size=1000)
```

### 8. Connection Pooling

```python
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True
)
```

## Дополнительные оптимизации

### Prefetch данных
- Предзагружать данные при наведении на кнопку навигации
- Использовать `<link rel="prefetch">` для следующих страниц

### Service Worker
- Кэшировать статические ресурсы
- Offline-first подход

### CDN для изображений
- Использовать CDN для фото профилей
- Оптимизировать размеры изображений (WebP, сжатие)

### Database Query Optimization
- Использовать EXPLAIN для анализа запросов
- Избегать N+1 проблем (использовать joinedload)
- Батчинг запросов где возможно
