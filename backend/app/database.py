"""
Модели базы данных и подключение
"""
from sqlalchemy import create_engine, Column, BigInteger, String, Integer, Boolean, Text, DateTime, JSON as SQLJSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
from config import settings

# Подключение к базе данных с оптимизацией пула соединений
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # Проверка соединений перед использованием
    pool_size=5,  # Размер пула соединений
    max_overflow=10,  # Максимальное количество дополнительных соединений
    pool_recycle=3600,  # Переиспользование соединений каждый час
    echo=False  # Логирование SQL запросов (отключено для продакшена)
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Модели базы данных
class Profile(Base):
    """Модель профиля пользователя"""
    __tablename__ = "profiles"
    
    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, unique=True, nullable=False, index=True)
    username = Column(String(255), nullable=True)
    first_name = Column(String(255), nullable=True)
    last_name = Column(String(255), nullable=True)
    name = Column(String(255), nullable=False)
    gender = Column(String(20), nullable=False)  # 'male', 'female', 'other'
    age = Column(Integer, nullable=False)
    city = Column(String(255), nullable=False)
    university = Column(String(255), nullable=False)
    interests = Column(JSONB, default=[])
    goals = Column(JSONB, default=[])
    bio = Column(Text, nullable=True)
    photo_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Swipe(Base):
    """Модель свайпа (лайк или пропуск)"""
    __tablename__ = "swipes"
    
    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, nullable=False, index=True)
    target_profile_id = Column(BigInteger, nullable=False, index=True)
    action = Column(String(10), nullable=False)  # 'like' или 'pass'
    created_at = Column(DateTime, default=datetime.utcnow)

class Match(Base):
    """Модель мэтча (взаимный лайк)"""
    __tablename__ = "matches"
    
    id = Column(BigInteger, primary_key=True, index=True)
    user1_id = Column(BigInteger, nullable=False, index=True)
    user2_id = Column(BigInteger, nullable=False, index=True)
    matched_at = Column(DateTime, default=datetime.utcnow)

# Создание таблиц (если их ещё нет)
Base.metadata.create_all(bind=engine)

# Проверка подключения к БД при старте
def check_database_connection():
    """Проверяет подключение к базе данных при старте"""
    from sqlalchemy import text
    try:
        db = SessionLocal()
        try:
            db.execute(text("SELECT 1"))
            db.commit()
            print("✅ База данных подключена успешно")
        except Exception as e:
            print(f"⚠️  WARNING: Проблема с базой данных: {e}")
            print("⚠️  Убедитесь, что schema.sql применён к базе данных Neon")
        finally:
            db.close()
    except Exception as e:
        print(f"❌ Ошибка подключения к базе данных: {e}")
        print("⚠️  Проверьте DATABASE_URL в переменных окружения Koyeb")

# Выполняем проверку при импорте модуля
check_database_connection()
