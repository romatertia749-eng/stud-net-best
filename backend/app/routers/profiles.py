"""
Роутер для работы с профилями
"""
from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel, field_validator
from datetime import datetime
import json

from app.database import Profile
from app.dependencies import get_db
from app.services.profile_service import (
    get_profile_by_user_id,
    get_profile_by_id,
    get_profiles_for_swipe,
    create_or_update_profile,
    get_incoming_likes
)

router = APIRouter(prefix="/api/profiles", tags=["profiles"])

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
    
    @field_validator('interests', 'goals', mode='before')
    @classmethod
    def validate_list_fields(cls, v):
        """Преобразует JSONB массивы в списки строк"""
        if v is None:
            return []
        if isinstance(v, list):
            # Убеждаемся, что все элементы - строки
            return [str(item) for item in v]
        if isinstance(v, str):
            # Если это JSON строка, пытаемся распарсить
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return [str(item) for item in parsed]
            except:
                pass
        return []
    
    class Config:
        from_attributes = True

@router.get("", response_model=List[ProfileResponse])
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
    profiles = get_profiles_for_swipe(db, user_id, page, size)
    return [_normalize_profile_data(p) for p in profiles]

@router.get("/{profile_id}", response_model=ProfileResponse)
async def get_profile_by_id_endpoint(profile_id: int, db: Session = Depends(get_db)):
    """Получение профиля по ID"""
    profile = get_profile_by_id(db, profile_id)
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return _normalize_profile_data(profile)

@router.get("/user/{user_id}", response_model=ProfileResponse)
async def get_profile_by_user_id_endpoint(user_id: int, db: Session = Depends(get_db)):
    """Получение профиля по user_id"""
    profile = get_profile_by_user_id(db, user_id)
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return _normalize_profile_data(profile)

def _normalize_profile_data(profile):
    """Нормализует данные профиля для ответа API"""
    # Преобразуем interests и goals в списки строк
    interests = profile.interests if profile.interests else []
    goals = profile.goals if profile.goals else []
    
    # Убеждаемся, что это списки строк
    if not isinstance(interests, list):
        interests = []
    if not isinstance(goals, list):
        goals = []
    
    # Создаём словарь с нормализованными данными
    profile_dict = {
        "id": profile.id,
        "user_id": profile.user_id,
        "username": profile.username,
        "first_name": profile.first_name,
        "last_name": profile.last_name,
        "name": profile.name,
        "gender": profile.gender,
        "age": profile.age,
        "city": profile.city,
        "university": profile.university,
        "interests": [str(item) for item in interests],
        "goals": [str(item) for item in goals],
        "bio": profile.bio,
        "photo_url": profile.photo_url,
        "created_at": profile.created_at,
        "updated_at": profile.updated_at,
    }
    return ProfileResponse(**profile_dict)

@router.post("", response_model=ProfileResponse)
async def create_or_update_profile_endpoint(
    user_id: int = Form(...),
    username: Optional[str] = Form(None),
    first_name: Optional[str] = Form(None),
    last_name: Optional[str] = Form(None),
    name: str = Form(...),
    gender: str = Form(...),
    age: int = Form(...),
    city: str = Form(...),
    university: str = Form(...),
    interests: str = Form(...),
    goals: str = Form(...),
    bio: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """
    Создание или обновление профиля
    
    Если профиль с таким user_id уже существует, он обновляется
    """
    try:
        profile = create_or_update_profile(
            db=db,
            user_id=user_id,
            username=username,
            first_name=first_name,
            last_name=last_name,
            name=name,
            gender=gender,
            age=age,
            city=city,
            university=university,
            interests=interests,
            goals=goals,
            bio=bio,
            photo=photo
        )
        # Нормализуем данные перед возвратом
        return _normalize_profile_data(profile)
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Ошибка при создании/обновлении профиля: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Ошибка при сохранении профиля: {str(e)}")

@router.get("/incoming-likes", response_model=List[ProfileResponse])
async def get_incoming_likes_endpoint(
    user_id: int = Query(..., description="ID пользователя"),
    db: Session = Depends(get_db)
):
    """
    Получение списка пользователей, которые лайкнули текущего пользователя
    
    Возвращает профили тех, кто лайкнул пользователя, но пользователь ещё не ответил
    """
    profiles = get_incoming_likes(db, user_id)
    return [_normalize_profile_data(p) for p in profiles]
