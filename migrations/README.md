# Миграции базы данных

## Применение оптимизаций производительности

### Миграция 001: Добавление индексов для оптимизации

Эта миграция добавляет индексы для ускорения сортировки и поиска данных.

#### Что делает миграция:

1. **Индексы для сортировки по дате (DESC)**:
   - `idx_profiles_created_at_desc` - ускоряет сортировку профилей по дате создания
   - `idx_swipes_created_at_desc` - ускоряет сортировку свайпов по дате
   - `idx_matches_matched_at_desc` - ускоряет сортировку мэтчей по дате

2. **Индекс для входящих лайков**:
   - `idx_swipes_target_like_created` - ускоряет поиск входящих лайков с сортировкой

#### Как применить:

**Вариант 1: Через psql (локально)**
```bash
psql -d networking_app -f migrations/001_add_performance_indexes.sql
```

**Вариант 2: Через Neon Console**
1. Откройте Neon Console
2. Перейдите в SQL Editor
3. Скопируйте содержимое `migrations/001_add_performance_indexes.sql`
4. Выполните скрипт

**Вариант 3: Через pgAdmin**
1. Откройте pgAdmin
2. Подключитесь к базе данных
3. Выполните SQL скрипт из файла

#### Проверка применения:

После выполнения миграции проверьте, что индексы созданы:

```sql
SELECT 
    tablename,
    indexname
FROM pg_indexes
WHERE tablename IN ('profiles', 'swipes', 'matches')
    AND (indexname LIKE '%_desc' OR indexname LIKE '%_like_created')
ORDER BY tablename, indexname;
```

Должны быть видны новые индексы:
- `idx_profiles_created_at_desc`
- `idx_swipes_created_at_desc`
- `idx_swipes_target_like_created`
- `idx_matches_matched_at_desc`

#### Откат (если нужно):

```sql
DROP INDEX IF EXISTS idx_profiles_created_at_desc;
DROP INDEX IF EXISTS idx_swipes_created_at_desc;
DROP INDEX IF EXISTS idx_swipes_target_like_created;
DROP INDEX IF EXISTS idx_matches_matched_at_desc;
```

## Изменения в коде

### backend/app/database.py

Обновлён connection pooling:
- `pool_size`: 5 → 10
- `max_overflow`: 10 → 20
- Добавлен явный `QueuePool`

Эти изменения применяются автоматически при следующем деплое бэкенда.
