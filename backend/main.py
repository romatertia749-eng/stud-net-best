"""
FastAPI Backend для StudNet - приложения нетворкинга

Основные функции:
- Авторизация через Telegram Web App
- Управление профилями пользователей
- Система свайпов (лайки/пропуски)
- Мэтчи (взаимные лайки)
- Загрузка фотографий
"""

from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine, Column, BigInteger, String, Integer, Boolean, Text, DateTime, JSON as SQLJSON, CheckConstraint, func, and_, or_, exists
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.dialects.postgresql import JSONB
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from jose import JWTError, jwt
import os
from pathlib import Path
import shutil
from PIL import Image
import json
import hashlib
import hmac

from config import settings

# Инициализация FastAPI приложения
app = FastAPI(
    title="StudNet API",
    description="Backend API для приложения нетворкинга StudNet",
    version="1.0.0"
)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение к базе данных
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Создание директории для загрузок
UPLOAD_DIR = Path(settings.UPLOAD_DIR)
UPLOAD_DIR.mkdir(exist_ok=True)

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

# Зависимости
def get_db():
    """Получение сессии базы данных"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user_id(token: str = Depends(lambda: None)) -> Optional[int]:
    """Получение user_id из JWT токена"""
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id: int = payload.get("sub")
        return user_id
    except JWTError:
        return None

# Pydantic модели для запросов/ответов
class AuthRequest(BaseModel):
    """Запрос на авторизацию"""
    init_data: Optional[str] = None

class AuthResponse(BaseModel):
    """Ответ с JWT токеном"""
    token: str
    user_id: int

class ProfileResponse(BaseModel):
    """Ответ с данными профиля"""
    id: int
    user_id: int
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    name: str
    gender: str
    age: int
    city: str
    university: str
    interests: List[str] = []
    goals: List[str] = []
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class LikeRequest(BaseModel):
    """Запрос на лайк"""
    user_id: int

class LikeResponse(BaseModel):
    """Ответ на лайк"""
    matched: bool
    message: str

class PassRequest(BaseModel):
    """Запрос на пропуск"""
    user_id: int

class RespondToLikeRequest(BaseModel):
    """Запрос на ответ на входящий лайк"""
    targetUserId: int
    action: str  # 'accept' или 'decline'

# Вспомогательные функции
def verify_telegram_webapp_data(init_data: str, bot_token: str) -> Optional[Dict]:
    """Проверка данных Telegram Web App"""
    try:
        # Парсим init_data
        data_dict = {}
        for item in init_data.split('&'):
            if '=' in item:
                key, value = item.split('=', 1)
                data_dict[key] = value
        
        # Проверяем hash
        if 'hash' not in data_dict:
            return None
        
        hash_value = data_dict.pop('hash')
        
        # Создаём строку для проверки
        data_check_string = '\n'.join(f"{k}={v}" for k, v in sorted(data_dict.items()))
        secret_key = hmac.new(
            key=b"WebAppData",
            msg=bot_token.encode(),
            digestmod=hashlib.sha256
        ).digest()
        
        calculated_hash = hmac.new(
            key=secret_key,
            msg=data_check_string.encode(),
            digestmod=hashlib.sha256
        ).hexdigest()
        
        if calculated_hash != hash_value:
            return None
        
        # Парсим user данные
        if 'user' in data_dict:
            import urllib.parse
            user_data = json.loads(urllib.parse.unquote(data_dict['user']))
            return user_data
        
        return None
    except Exception as e:
        print(f"Error verifying Telegram data: {e}")
        return None

def create_jwt_token(user_id: int) -> str:
    """Создание JWT токена"""
    expire = datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
    payload = {
        "sub": user_id,
        "exp": expire
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def save_uploaded_file(file: UploadFile, user_id: int) -> str:
    """Сохранение загруженного файла"""
    # Создаём уникальное имя файла
    file_ext = Path(file.filename).suffix
    filename = f"{user_id}_{datetime.utcnow().timestamp()}{file_ext}"
    file_path = UPLOAD_DIR / filename
    
    # Сохраняем файл
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Оптимизируем изображение
    try:
        img = Image.open(file_path)
        # Конвертируем в RGB если нужно
        if img.mode in ('RGBA', 'LA', 'P'):
            img = img.convert('RGB')
        # Сохраняем с оптимизацией
        img.save(file_path, 'JPEG', quality=85, optimize=True)
    except Exception as e:
        print(f"Error optimizing image: {e}")
    
    # Возвращаем относительный путь
    return f"/uploads/{filename}"

# API Endpoints

@app.get("/")
async def root():
    """Корневой endpoint"""
    return {"message": "StudNet API", "version": "1.0.0"}

@app.post("/api/auth", response_model=AuthResponse)
async def auth(request: AuthRequest, authorization: Optional[str] = None):
    """
    Авторизация через Telegram Web App
    
    Принимает init_data из Telegram Web App и возвращает JWT токен
    """
    # Получаем init_data из заголовка или тела запроса
    init_data = authorization.replace("tma ", "") if authorization and authorization.startswith("tma ") else None
    
    if not init_data:
        raise HTTPException(status_code=400, detail="init_data is required")
    
    # Проверяем данные Telegram (если есть bot token)
    user_data = None
    if settings.TELEGRAM_BOT_TOKEN:
        user_data = verify_telegram_webapp_data(init_data, settings.TELEGRAM_BOT_TOKEN)
    
    # Если проверка не прошла, пытаемся извлечь данные напрямую
    if not user_data:
        try:
            import urllib.parse
            for item in init_data.split('&'):
                if item.startswith('user='):
                    user_data = json.loads(urllib.parse.unquote(item.split('=', 1)[1]))
                    break
        except:
            pass
    
    if not user_data or 'id' not in user_data:
        raise HTTPException(status_code=401, detail="Invalid Telegram data")
    
    user_id = user_data['id']
    
    # Создаём JWT токен
    token = create_jwt_token(user_id)
    
    return AuthResponse(token=token, user_id=user_id)

@app.get("/api/profiles", response_model=List[ProfileResponse])
async def get_profiles(
    user_id: int = Query(..., description="ID пользователя"),
    page: int = Query(0, ge=0),
    size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Получение списка профилей для свайпа
    
    Возвращает профили, которые пользователь ещё не свайпнул
    """
    # Получаем профиль текущего пользователя
    current_user_profile = db.query(Profile).filter(
        Profile.user_id == user_id,
        Profile.is_active == True,
        Profile.deleted_at == None
    ).first()
    
    if not current_user_profile:
        return []
    
    # Получаем ID профилей, которые уже были свайпнуты
    swiped_profile_ids = db.query(Swipe.target_profile_id).filter(
        Swipe.user_id == user_id
    ).subquery()
    
    # Получаем профили, которые ещё не были свайпнуты
    profiles = db.query(Profile).filter(
        Profile.is_active == True,
        Profile.deleted_at == None,
        Profile.user_id != user_id,
        ~Profile.id.in_(swiped_profile_ids)
    ).order_by(Profile.created_at.desc()).offset(page * size).limit(size).all()
    
    return profiles

@app.get("/api/profiles/{profile_id}", response_model=ProfileResponse)
async def get_profile_by_id(profile_id: int, db: Session = Depends(get_db)):
    """Получение профиля по ID"""
    profile = db.query(Profile).filter(
        Profile.id == profile_id,
        Profile.is_active == True,
        Profile.deleted_at == None
    ).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return profile

@app.get("/api/profiles/user/{user_id}", response_model=ProfileResponse)
async def get_profile_by_user_id(user_id: int, db: Session = Depends(get_db)):
    """Получение профиля по user_id"""
    profile = db.query(Profile).filter(
        Profile.user_id == user_id,
        Profile.is_active == True,
        Profile.deleted_at == None
    ).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return profile

@app.post("/api/profiles", response_model=ProfileResponse)
async def create_or_update_profile(
    user_id: int = Form(...),
    username: Optional[str] = Form(None),
    first_name: Optional[str] = Form(None),
    last_name: Optional[str] = Form(None),
    name: str = Form(...),
    gender: str = Form(...),
    age: int = Form(...),
    city: str = Form(...),
    university: str = Form(...),
    interests: str = Form(...),  # JSON строка
    goals: str = Form(...),  # JSON строка
    bio: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """
    Создание или обновление профиля
    
    Если профиль с таким user_id уже существует, он обновляется
    """
    # Парсим JSON строки
    try:
        interests_list = json.loads(interests) if interests else []
        goals_list = json.loads(goals) if goals else []
    except json.JSONDecodeError:
        interests_list = []
        goals_list = []
    
    # Валидация
    if gender not in ['male', 'female', 'other']:
        raise HTTPException(status_code=400, detail="Invalid gender")
    if age < 15 or age > 50:
        raise HTTPException(status_code=400, detail="Age must be between 15 and 50")
    if len(bio or '') > 300:
        raise HTTPException(status_code=400, detail="Bio must be 300 characters or less")
    
    # Проверяем, существует ли профиль
    existing_profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    
    # Обработка фото
    photo_url = None
    if photo:
        # Проверка размера файла
        file_size = 0
        photo.file.seek(0, 2)  # Переходим в конец файла
        file_size = photo.file.tell()
        photo.file.seek(0)  # Возвращаемся в начало
        
        if file_size > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
            raise HTTPException(status_code=400, detail=f"File size exceeds {settings.MAX_FILE_SIZE_MB}MB")
        
        # Проверка типа файла
        if photo.content_type not in ['image/jpeg', 'image/png', 'image/webp']:
            raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG, PNG, WebP allowed")
        
        # Удаляем старое фото, если есть
        if existing_profile and existing_profile.photo_url:
            old_photo_path = Path(settings.UPLOAD_DIR) / Path(existing_profile.photo_url).name
            if old_photo_path.exists():
                old_photo_path.unlink()
        
        # Сохраняем новое фото
        photo_url = save_uploaded_file(photo, user_id)
    
    if existing_profile:
        # Обновляем существующий профиль
        existing_profile.username = username
        existing_profile.first_name = first_name
        existing_profile.last_name = last_name
        existing_profile.name = name
        existing_profile.gender = gender
        existing_profile.age = age
        existing_profile.city = city
        existing_profile.university = university
        existing_profile.interests = interests_list
        existing_profile.goals = goals_list
        existing_profile.bio = bio
        if photo_url:
            existing_profile.photo_url = photo_url
        existing_profile.updated_at = datetime.utcnow()
        existing_profile.is_active = True
        existing_profile.deleted_at = None
        
        db.commit()
        db.refresh(existing_profile)
        return existing_profile
    else:
        # Создаём новый профиль
        new_profile = Profile(
            user_id=user_id,
            username=username,
            first_name=first_name,
            last_name=last_name,
            name=name,
            gender=gender,
            age=age,
            city=city,
            university=university,
            interests=interests_list,
            goals=goals_list,
            bio=bio,
            photo_url=photo_url
        )
        db.add(new_profile)
        db.commit()
        db.refresh(new_profile)
        return new_profile

@app.post("/api/profiles/{profile_id}/like", response_model=LikeResponse)
async def like_profile(
    profile_id: int,
    request: LikeRequest,
    db: Session = Depends(get_db)
):
    """
    Лайк профиля
    
    Если есть взаимный лайк, создаётся мэтч
    """
    user_id = request.user_id
    
    # Проверяем, что профиль существует
    target_profile = db.query(Profile).filter(
        Profile.id == profile_id,
        Profile.is_active == True,
        Profile.deleted_at == None
    ).first()
    
    if not target_profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Проверяем, что пользователь не лайкает сам себя
    if target_profile.user_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot like your own profile")
    
    # Проверяем, не было ли уже свайпа
    existing_swipe = db.query(Swipe).filter(
        Swipe.user_id == user_id,
        Swipe.target_profile_id == profile_id
    ).first()
    
    if existing_swipe:
        if existing_swipe.action == 'like':
            raise HTTPException(status_code=400, detail="Already liked")
        else:
            # Обновляем пропуск на лайк
            existing_swipe.action = 'like'
            existing_swipe.created_at = datetime.utcnow()
    else:
        # Создаём новый свайп
        new_swipe = Swipe(
            user_id=user_id,
            target_profile_id=profile_id,
            action='like'
        )
        db.add(new_swipe)
    
    # Проверяем, есть ли взаимный лайк
    # Нужно найти профиль текущего пользователя и проверить, лайкнул ли он того, кто его лайкнул
    current_user_profile = db.query(Profile).filter(
        Profile.user_id == user_id,
        Profile.is_active == True,
        Profile.deleted_at == None
    ).first()
    
    if not current_user_profile:
        db.commit()
        return LikeResponse(matched=False, message="Liked successfully")
    
    # Проверяем, лайкнул ли целевой пользователь текущего пользователя
    mutual_swipe = db.query(Swipe).filter(
        Swipe.user_id == target_profile.user_id,
        Swipe.target_profile_id == current_user_profile.id,
        Swipe.action == 'like'
    ).first()
    
    matched = False
    if mutual_swipe:
        # Создаём мэтч
        user1_id = min(user_id, target_profile.user_id)
        user2_id = max(user_id, target_profile.user_id)
        
        existing_match = db.query(Match).filter(
            Match.user1_id == user1_id,
            Match.user2_id == user2_id
        ).first()
        
        if not existing_match:
            new_match = Match(user1_id=user1_id, user2_id=user2_id)
            db.add(new_match)
            matched = True
    
    db.commit()
    
    return LikeResponse(matched=matched, message="Liked successfully")

@app.post("/api/profiles/{profile_id}/pass")
async def pass_profile(
    profile_id: int,
    request: PassRequest,
    db: Session = Depends(get_db)
):
    """Пропуск профиля"""
    user_id = request.user_id
    
    # Проверяем, что профиль существует
    target_profile = db.query(Profile).filter(
        Profile.id == profile_id,
        Profile.is_active == True,
        Profile.deleted_at == None
    ).first()
    
    if not target_profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Проверяем, не было ли уже свайпа
    existing_swipe = db.query(Swipe).filter(
        Swipe.user_id == user_id,
        Swipe.target_profile_id == profile_id
    ).first()
    
    if existing_swipe:
        if existing_swipe.action == 'pass':
            return {"message": "Already passed"}
        else:
            # Обновляем лайк на пропуск
            existing_swipe.action = 'pass'
            existing_swipe.created_at = datetime.utcnow()
    else:
        # Создаём новый свайп
        new_swipe = Swipe(
            user_id=user_id,
            target_profile_id=profile_id,
            action='pass'
        )
        db.add(new_swipe)
    
    db.commit()
    
    return {"message": "Passed successfully"}

@app.get("/api/profiles/incoming-likes", response_model=List[ProfileResponse])
async def get_incoming_likes(
    user_id: int = Query(..., description="ID пользователя"),
    db: Session = Depends(get_db)
):
    """
    Получение списка пользователей, которые лайкнули текущего пользователя
    
    Возвращает профили тех, кто лайкнул пользователя, но пользователь ещё не ответил
    """
    # Получаем профиль текущего пользователя
    current_user_profile = db.query(Profile).filter(
        Profile.user_id == user_id,
        Profile.is_active == True,
        Profile.deleted_at == None
    ).first()
    
    if not current_user_profile:
        return []
    
    # Получаем свайпы, где текущий пользователь был целью (target_profile_id)
    # Swipe.user_id - это user_id того, кто сделал свайп на профиль current_user_profile.id
    incoming_swipes = db.query(Swipe).filter(
        Swipe.target_profile_id == current_user_profile.id,
        Swipe.action == 'like'
    ).all()
    
    # Получаем user_id тех, кто лайкнул текущего пользователя
    liker_user_ids = [swipe.user_id for swipe in incoming_swipes]
    
    if not liker_user_ids:
        return []
    
    # Получаем ID профилей, на которые текущий пользователь уже ответил (сделал свайп)
    # Это target_profile_id всех свайпов, сделанных текущим пользователем
    responded_profile_ids = [
        row[0] for row in db.query(Swipe.target_profile_id).filter(
            Swipe.user_id == user_id
        ).all()
    ]
    
    # Получаем профили тех, кто лайкнул
    liker_profiles = db.query(Profile).filter(
        Profile.user_id.in_(liker_user_ids),
        Profile.is_active == True,
        Profile.deleted_at == None
    ).all()
    
    # Фильтруем: убираем тех, на кого пользователь уже ответил
    # (на чьи профили уже был сделан свайп)
    result_profiles = [p for p in liker_profiles if p.id not in responded_profile_ids]
    
    return result_profiles

@app.post("/api/profiles/respond-to-like")
async def respond_to_like(
    request: RespondToLikeRequest,
    user_id: int = Query(..., description="ID пользователя"),
    db: Session = Depends(get_db)
):
    """
    Ответ на входящий лайк
    
    action: 'accept' (лайк в ответ) или 'decline' (пропуск)
    """
    target_user_id = request.targetUserId
    action = request.action
    
    if action not in ['accept', 'decline']:
        raise HTTPException(status_code=400, detail="Action must be 'accept' or 'decline'")
    
    # Получаем профили
    current_user_profile = db.query(Profile).filter(
        Profile.user_id == user_id,
        Profile.is_active == True,
        Profile.deleted_at == None
    ).first()
    
    target_user_profile = db.query(Profile).filter(
        Profile.user_id == target_user_id,
        Profile.is_active == True,
        Profile.deleted_at == None
    ).first()
    
    if not current_user_profile or not target_user_profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Создаём свайп
    swipe_action = 'like' if action == 'accept' else 'pass'
    
    existing_swipe = db.query(Swipe).filter(
        Swipe.user_id == user_id,
        Swipe.target_profile_id == target_user_profile.id
    ).first()
    
    if existing_swipe:
        existing_swipe.action = swipe_action
        existing_swipe.created_at = datetime.utcnow()
    else:
        new_swipe = Swipe(
            user_id=user_id,
            target_profile_id=target_user_profile.id,
            action=swipe_action
        )
        db.add(new_swipe)
    
    # Если приняли лайк, проверяем мэтч
    matched = False
    if action == 'accept':
        user1_id = min(user_id, target_user_id)
        user2_id = max(user_id, target_user_id)
        
        existing_match = db.query(Match).filter(
            Match.user1_id == user1_id,
            Match.user2_id == user2_id
        ).first()
        
        if not existing_match:
            new_match = Match(user1_id=user1_id, user2_id=user2_id)
            db.add(new_match)
            matched = True
    
    db.commit()
    
    return {
        "message": f"Response recorded: {action}",
        "matched": matched
    }

# Подключение статических файлов (фотографии)
# Это позволяет отдавать файлы из директории uploads
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
