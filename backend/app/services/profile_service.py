"""
Сервис для работы с профилями
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, not_
from typing import List, Optional
from datetime import datetime
import json

from app.database import Profile, Swipe, Match
from app.services.file_storage import save_uploaded_file, delete_file
from fastapi import UploadFile, HTTPException
from config import settings

def get_profile_by_user_id(db: Session, user_id: int) -> Optional[Profile]:
    """Получение профиля по user_id"""
    return db.query(Profile).filter(
        Profile.user_id == user_id,
        Profile.is_active == True,
        Profile.deleted_at == None
    ).first()

def get_profile_by_id(db: Session, profile_id: int) -> Optional[Profile]:
    """Получение профиля по ID"""
    return db.query(Profile).filter(
        Profile.id == profile_id,
        Profile.is_active == True,
        Profile.deleted_at == None
    ).first()

def get_profiles_for_swipe(db: Session, user_id: int, page: int = 0, size: int = 50) -> List[Profile]:
    """Получение списка профилей для свайпа"""
    current_user_profile = get_profile_by_user_id(db, user_id)
    
    if not current_user_profile:
        return []
    
    # Получаем ID профилей, которые уже были свайпнуты
    swiped_profile_ids = db.query(Swipe.target_profile_id).filter(
        Swipe.user_id == user_id
    ).subquery()
    
    # Получаем user_id пользователей, с которыми есть мэтч
    # Мэтч может быть где user1_id = user_id или user2_id = user_id
    matched_user_ids_1 = db.query(Match.user2_id).filter(Match.user1_id == user_id).all()
    matched_user_ids_2 = db.query(Match.user1_id).filter(Match.user2_id == user_id).all()
    matched_user_ids = [row[0] for row in matched_user_ids_1] + [row[0] for row in matched_user_ids_2]
    
    # Получаем ID профилей мэтчей (не user_id, а profile.id)
    matched_profile_ids = []
    if matched_user_ids:
        matched_profiles = db.query(Profile.id).filter(Profile.user_id.in_(matched_user_ids)).all()
        matched_profile_ids = [p[0] for p in matched_profiles]
    
    # Получаем профили, которые ещё не были свайпнуты и не являются мэтчами
    query = db.query(Profile).filter(
        Profile.is_active == True,
        Profile.deleted_at == None,
        Profile.user_id != user_id,
        ~Profile.id.in_(swiped_profile_ids)
    )
    
    # Исключаем мэтчи, если они есть
    if matched_profile_ids:
        query = query.filter(~Profile.id.in_(matched_profile_ids))
    
    profiles = query.order_by(Profile.created_at.desc()).offset(page * size).limit(size).all()
    
    return profiles

def create_or_update_profile(
    db: Session,
    user_id: int,
    username: Optional[str],
    first_name: Optional[str],
    last_name: Optional[str],
    name: str,
    gender: str,
    age: int,
    city: str,
    university: str,
    interests: str,
    goals: str,
    bio: Optional[str],
    photo: Optional[UploadFile]
) -> Profile:
    """Создание или обновление профиля"""
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
        # Удаляем старое фото, если есть
        if existing_profile and existing_profile.photo_url:
            delete_file(existing_profile.photo_url)
        
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

def get_incoming_likes(db: Session, user_id: int) -> List[Profile]:
    """Получение списка пользователей, которые лайкнули текущего пользователя (оптимизированная версия)"""
    current_user_profile = get_profile_by_user_id(db, user_id)
    
    if not current_user_profile:
        return []
    
    # Оптимизированный запрос с JOIN и NOT EXISTS вместо множественных запросов
    from sqlalchemy import not_, exists
    
    # Получаем ID профилей, на которые текущий пользователь уже ответил
    responded_profile_ids = db.query(Swipe.target_profile_id).filter(
        Swipe.user_id == user_id
    ).subquery()
    
    # Получаем профили тех, кто лайкнул текущего пользователя, но текущий пользователь ещё не ответил
    liker_profiles = db.query(Profile).join(
        Swipe,
        and_(
            Swipe.target_profile_id == current_user_profile.id,
            Swipe.action == 'like',
            Swipe.user_id == Profile.user_id
        )
    ).filter(
        Profile.is_active == True,
        Profile.deleted_at == None,
        ~Profile.id.in_(responded_profile_ids)
    ).order_by(Swipe.created_at.desc()).all()
    
    return liker_profiles
