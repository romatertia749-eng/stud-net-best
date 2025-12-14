-- ============================================================================
-- Схема базы данных для приложения нетворкинга StudNet
-- ОПТИМИЗИРОВАНА для максимальной производительности загрузки
-- ============================================================================
-- Создание базы данных (выполнить от имени postgres)
-- CREATE DATABASE networking_app;
-- \c networking_app;

-- ============================================================================
-- РАСШИРЕНИЯ
-- ============================================================================
-- Включаем расширение для работы с JSONB (более эффективно чем TEXT для JSON)
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Для триграммного поиска
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- Для GIN индексов на обычных полях

-- ============================================================================
-- ТАБЛИЦЫ
-- ============================================================================

-- Таблица профилей пользователей
CREATE TABLE IF NOT EXISTS profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    gender VARCHAR(20) NOT NULL CHECK (gender IN ('male', 'female', 'other')),
    age INTEGER NOT NULL CHECK (age >= 15 AND age <= 50),
    city VARCHAR(255) NOT NULL,
    university VARCHAR(255) NOT NULL,
    interests JSONB DEFAULT '[]'::jsonb, -- JSON массив: ["IT", "Дизайн", ...]
    goals JSONB DEFAULT '[]'::jsonb, -- JSON массив: ["Совместная учёба", "Хакатон", ...]
    bio TEXT CHECK (LENGTH(bio) <= 300),
    photo_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE, -- Для мягкого удаления/деактивации
    deleted_at TIMESTAMP NULL, -- Мягкое удаление
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Проверка валидности JSON
    CONSTRAINT interests_is_array CHECK (jsonb_typeof(interests) = 'array'),
    CONSTRAINT goals_is_array CHECK (jsonb_typeof(goals) = 'array')
);

-- Индексы для таблицы profiles (оптимизированные для быстрой загрузки)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_city ON profiles(city);
CREATE INDEX IF NOT EXISTS idx_profiles_university ON profiles(university);
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON profiles(gender);
CREATE INDEX IF NOT EXISTS idx_profiles_age ON profiles(age);
-- Индекс для сортировки по дате создания (DESC) - оптимизация из рекомендаций
CREATE INDEX IF NOT EXISTS idx_profiles_created_at_desc ON profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at) WHERE deleted_at IS NULL;

-- GIN индексы для быстрого поиска по JSON массивам
CREATE INDEX IF NOT EXISTS idx_profiles_interests_gin ON profiles USING GIN (interests);
CREATE INDEX IF NOT EXISTS idx_profiles_goals_gin ON profiles USING GIN (goals);

-- Составные индексы для частых запросов
CREATE INDEX IF NOT EXISTS idx_profiles_city_gender ON profiles(city, gender) WHERE is_active = TRUE AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_university_age ON profiles(university, age) WHERE is_active = TRUE AND deleted_at IS NULL;

-- Таблица свайпов (лайки и дизлайки)
CREATE TABLE IF NOT EXISTS swipes (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    target_profile_id BIGINT NOT NULL,
    action VARCHAR(10) NOT NULL CHECK (action IN ('like', 'pass')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, target_profile_id),
    FOREIGN KEY (target_profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Индексы для таблицы swipes
CREATE INDEX IF NOT EXISTS idx_swipes_user_id ON swipes(user_id);
CREATE INDEX IF NOT EXISTS idx_swipes_target_profile_id ON swipes(target_profile_id);
CREATE INDEX IF NOT EXISTS idx_swipes_action ON swipes(action);
CREATE INDEX IF NOT EXISTS idx_swipes_created_at ON swipes(created_at);

-- Составные индексы для оптимизации частых запросов (оптимизация из рекомендаций)
CREATE INDEX IF NOT EXISTS idx_swipes_user_target ON swipes(user_id, target_profile_id);
-- Индекс для быстрого поиска лайков (аналог matched=true из рекомендаций)
CREATE INDEX IF NOT EXISTS idx_swipes_target_action ON swipes(target_profile_id, action) WHERE action = 'like';
CREATE INDEX IF NOT EXISTS idx_swipes_user_action ON swipes(user_id, action) WHERE action = 'like';
-- Дополнительный индекс для поиска входящих лайков (оптимизация)
CREATE INDEX IF NOT EXISTS idx_swipes_target_like_created ON swipes(target_profile_id, created_at DESC) WHERE action = 'like';

-- Таблица мэтчей (взаимные лайки)
CREATE TABLE IF NOT EXISTS matches (
    id BIGSERIAL PRIMARY KEY,
    user1_id BIGINT NOT NULL,
    user2_id BIGINT NOT NULL,
    matched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user1_id, user2_id),
    CHECK (user1_id < user2_id), -- Гарантируем порядок для уникальности
    FOREIGN KEY (user1_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
    FOREIGN KEY (user2_id) REFERENCES profiles(user_id) ON DELETE CASCADE
);

-- Индексы для таблицы matches (оптимизированные для быстрой загрузки)
CREATE INDEX IF NOT EXISTS idx_matches_user1_id ON matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2_id ON matches(user2_id);
CREATE INDEX IF NOT EXISTS idx_matches_matched_at ON matches(matched_at);
-- Индекс для сортировки по дате мэтча (DESC) - оптимизация из рекомендаций
CREATE INDEX IF NOT EXISTS idx_matches_matched_at_desc ON matches(matched_at DESC);

-- Составной индекс для поиска мэтчей (ускоряет запросы с OR условием)
CREATE INDEX IF NOT EXISTS idx_matches_user1_user2 ON matches(user1_id, user2_id);

-- Таблица отметок полезности коннекта
CREATE TABLE IF NOT EXISTS connection_feedbacks (
    id BIGSERIAL PRIMARY KEY,
    match_id BIGINT NOT NULL,
    from_user_id BIGINT NOT NULL,
    to_user_id BIGINT NOT NULL,
    feedback_type VARCHAR(50) NOT NULL CHECK (feedback_type IN ('HELPED_ME', 'I_HELPED', 'PROJECT_TOGETHER', 'EVENT_TOGETHER')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(match_id, from_user_id, feedback_type),
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (from_user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
    FOREIGN KEY (to_user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
);

-- Индексы для таблицы connection_feedbacks
CREATE INDEX IF NOT EXISTS idx_connection_feedbacks_match_id ON connection_feedbacks(match_id);
CREATE INDEX IF NOT EXISTS idx_connection_feedbacks_from_user_id ON connection_feedbacks(from_user_id);
CREATE INDEX IF NOT EXISTS idx_connection_feedbacks_to_user_id ON connection_feedbacks(to_user_id);
CREATE INDEX IF NOT EXISTS idx_connection_feedbacks_feedback_type ON connection_feedbacks(feedback_type);
CREATE INDEX IF NOT EXISTS idx_connection_feedbacks_created_at ON connection_feedbacks(created_at);

-- ============================================================================
-- ФУНКЦИИ И ТРИГГЕРЫ
-- ============================================================================

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updated_at в profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Функция для автоматического создания мэтча при взаимном лайке
CREATE OR REPLACE FUNCTION create_match_on_mutual_like()
RETURNS TRIGGER AS $$
DECLARE
    mutual_like_exists BOOLEAN;
    other_user_id BIGINT;
    profile_user_id BIGINT;
BEGIN
    -- Проверяем, что это лайк (не пропуск)
    IF NEW.action != 'like' THEN
        RETURN NEW;
    END IF;

    -- Получаем user_id профиля, на который лайкнули
    SELECT user_id INTO profile_user_id
    FROM profiles
    WHERE id = NEW.target_profile_id;

    -- Проверяем, есть ли взаимный лайк
    SELECT EXISTS(
        SELECT 1
        FROM swipes s
        JOIN profiles p ON p.id = s.user_id
        WHERE s.target_profile_id = (
            SELECT id FROM profiles WHERE user_id = NEW.user_id
        )
        AND s.user_id = profile_user_id
        AND s.action = 'like'
    ) INTO mutual_like_exists;

    -- Если есть взаимный лайк, создаем мэтч
    IF mutual_like_exists THEN
        -- Определяем порядок user_id для уникальности
        IF NEW.user_id < profile_user_id THEN
            INSERT INTO matches (user1_id, user2_id)
            VALUES (NEW.user_id, profile_user_id)
            ON CONFLICT (user1_id, user2_id) DO NOTHING;
        ELSE
            INSERT INTO matches (user1_id, user2_id)
            VALUES (profile_user_id, NEW.user_id)
            ON CONFLICT (user1_id, user2_id) DO NOTHING;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического создания мэтчей
DROP TRIGGER IF EXISTS trigger_create_match_on_mutual_like ON swipes;
CREATE TRIGGER trigger_create_match_on_mutual_like
    AFTER INSERT ON swipes
    FOR EACH ROW
    EXECUTE FUNCTION create_match_on_mutual_like();

-- Функция для поиска профилей с фильтрами
CREATE OR REPLACE FUNCTION search_profiles(
    p_user_id BIGINT,
    p_city VARCHAR DEFAULT NULL,
    p_university VARCHAR DEFAULT NULL,
    p_gender VARCHAR DEFAULT NULL,
    p_min_age INTEGER DEFAULT NULL,
    p_max_age INTEGER DEFAULT NULL,
    p_interests JSONB DEFAULT NULL,
    p_goals JSONB DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id BIGINT,
    user_id BIGINT,
    name VARCHAR,
    gender VARCHAR,
    age INTEGER,
    city VARCHAR,
    university VARCHAR,
    interests JSONB,
    goals JSONB,
    bio TEXT,
    photo_url VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.name,
        p.gender,
        p.age,
        p.city,
        p.university,
        p.interests,
        p.goals,
        p.bio,
        p.photo_url
    FROM profiles p
    WHERE p.is_active = TRUE
        AND p.deleted_at IS NULL
        AND p.user_id != p_user_id
        AND NOT EXISTS (
            SELECT 1 FROM swipes s
            WHERE s.user_id = p_user_id
            AND s.target_profile_id = p.id
        )
        AND (p_city IS NULL OR p.city = p_city)
        AND (p_university IS NULL OR p.university = p_university)
        AND (p_gender IS NULL OR p.gender = p_gender)
        AND (p_min_age IS NULL OR p.age >= p_min_age)
        AND (p_max_age IS NULL OR p.age <= p_max_age)
        AND (p_interests IS NULL OR p.interests ?| ARRAY(SELECT jsonb_array_elements_text(p_interests)))
        AND (p_goals IS NULL OR p.goals ?| ARRAY(SELECT jsonb_array_elements_text(p_goals)))
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ language 'plpgsql';

-- Функция для получения входящих лайков
CREATE OR REPLACE FUNCTION get_incoming_likes(p_user_id BIGINT)
RETURNS TABLE (
    id BIGINT,
    user_id BIGINT,
    name VARCHAR,
    gender VARCHAR,
    age INTEGER,
    city VARCHAR,
    university VARCHAR,
    interests JSONB,
    goals JSONB,
    bio TEXT,
    photo_url VARCHAR,
    liked_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.name,
        p.gender,
        p.age,
        p.city,
        p.university,
        p.interests,
        p.goals,
        p.bio,
        p.photo_url,
        s.created_at as liked_at
    FROM swipes s
    JOIN profiles p ON p.id = s.target_profile_id
    WHERE s.target_profile_id = (SELECT id FROM profiles WHERE user_id = p_user_id)
        AND s.action = 'like'
        AND NOT EXISTS (
            SELECT 1 FROM swipes s2
            WHERE s2.user_id = p_user_id
            AND s2.target_profile_id = s.user_id
        )
        AND p.is_active = TRUE
        AND p.deleted_at IS NULL
    ORDER BY s.created_at DESC;
END;
$$ language 'plpgsql';

-- ============================================================================
-- ПРЕДСТАВЛЕНИЯ (VIEWS)
-- ============================================================================

-- Представление для статистики профилей
CREATE OR REPLACE VIEW profile_stats AS
SELECT 
    p.id,
    p.user_id,
    p.name,
    COUNT(DISTINCT s1.id) as likes_received,
    COUNT(DISTINCT s2.id) as likes_sent,
    COUNT(DISTINCT m.id) as matches_count
FROM profiles p
LEFT JOIN swipes s1 ON s1.target_profile_id = p.id AND s1.action = 'like'
LEFT JOIN swipes s2 ON s2.user_id = p.user_id AND s2.action = 'like'
LEFT JOIN matches m ON (m.user1_id = p.user_id OR m.user2_id = p.user_id)
WHERE p.is_active = TRUE AND p.deleted_at IS NULL
GROUP BY p.id, p.user_id, p.name;

-- Представление для активных мэтчей (только с активными профилями)
CREATE OR REPLACE VIEW active_matches AS
SELECT 
    m.id,
    m.user1_id,
    m.user2_id,
    m.matched_at,
    p1.name as user1_name,
    p1.photo_url as user1_photo,
    p2.name as user2_name,
    p2.photo_url as user2_photo
FROM matches m
JOIN profiles p1 ON p1.user_id = m.user1_id
JOIN profiles p2 ON p2.user_id = m.user2_id
WHERE p1.is_active = TRUE AND p1.deleted_at IS NULL
    AND p2.is_active = TRUE AND p2.deleted_at IS NULL;

-- ============================================================================
-- КОММЕНТАРИИ
-- ============================================================================

COMMENT ON TABLE profiles IS 'Профили пользователей';
COMMENT ON TABLE swipes IS 'История свайпов (лайки и дизлайки)';
COMMENT ON TABLE matches IS 'Мэтчи между пользователями (взаимные лайки)';
COMMENT ON TABLE connection_feedbacks IS 'Отметки полезности коннекта между пользователями';

COMMENT ON COLUMN profiles.interests IS 'JSONB массив интересов: ["IT", "Дизайн"]';
COMMENT ON COLUMN profiles.goals IS 'JSONB массив целей: ["Совместная учёба", "Хакатон"]';
COMMENT ON COLUMN profiles.photo_url IS 'URL фотографии профиля';
COMMENT ON COLUMN profiles.is_active IS 'Флаг активности профиля (для мягкого удаления)';
COMMENT ON COLUMN profiles.deleted_at IS 'Время мягкого удаления профиля';
COMMENT ON COLUMN swipes.action IS 'Действие: like (лайк) или pass (пропуск)';
COMMENT ON COLUMN matches.user1_id IS 'ID первого пользователя (всегда меньше user2_id)';
COMMENT ON COLUMN matches.user2_id IS 'ID второго пользователя (всегда больше user1_id)';

COMMENT ON FUNCTION search_profiles IS 'Поиск профилей с фильтрами по городу, университету, возрасту, интересам и целям';
COMMENT ON FUNCTION get_incoming_likes IS 'Получение списка пользователей, которые лайкнули текущего пользователя';
COMMENT ON FUNCTION create_match_on_mutual_like IS 'Автоматическое создание мэтча при взаимном лайке';

-- ============================================================================
-- КОНЕЦ СХЕМЫ
-- ============================================================================
