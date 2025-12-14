"""
Роутер для работы с профилями
"""
from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

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
    return profiles

@router.get("/{profile_id}", response_model=ProfileResponse)
async def get_profile_by_id_endpoint(profile_id: int, db: Session = Depends(get_db)):
    """Получение профиля по ID"""
    profile = get_profile_by_id(db, profile_id)
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return profile

@router.get("/user/{user_id}", response_model=ProfileResponse)
async def get_profile_by_user_id_endpoint(user_id: int, db: Session = Depends(get_db)):
    """Получение профиля по user_id"""
    profile = get_profile_by_user_id(db, user_id)
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return profile

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
    return profile

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
    return profiles
