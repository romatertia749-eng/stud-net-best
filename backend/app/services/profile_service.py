"""
Сервис для работы с профилями
"""
from sqlalchemy.orm import Session, aliased
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
    
    # Получаем ID профилей мэтчей одним запросом через JOIN (оптимизация: вместо 2 запросов - 1)
    # Мэтч может быть где user1_id = user_id или user2_id = user_id
    matched_profile_ids_subq = db.query(Profile.id).join(
        Match,
        or_(
            and_(Match.user1_id == user_id, Match.user2_id == Profile.user_id),
            and_(Match.user2_id == user_id, Match.user1_id == Profile.user_id)
        )
    ).subquery()
    
    # Получаем профили, которые ещё не были свайпнуты и не являются мэтчами
    query = db.query(Profile).filter(
        Profile.is_active == True,
        Profile.deleted_at == None,
        Profile.user_id != user_id,
        ~Profile.id.in_(swiped_profile_ids),
        ~Profile.id.in_(db.query(matched_profile_ids_subq.c.id))
    )
    
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
    """Получение списка пользователей, которые лайкнули текущего пользователя"""
    # #region agent log
    import json
    import os
    log_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.cursor', 'debug.log')
    try:
        with open(log_path, 'a', encoding='utf-8') as f:
            f.write(json.dumps({"sessionId":"debug-session","runId":"run1","hypothesisId":"A","location":"profile_service.py:162","message":"Function entry","data":{"user_id":user_id},"timestamp":int(__import__('time').time()*1000)}) + '\n')
    except: pass
    # #endregion
    
    current_user_profile = get_profile_by_user_id(db, user_id)
    
    # #region agent log
    try:
        with open(log_path, 'a', encoding='utf-8') as f:
            f.write(json.dumps({"sessionId":"debug-session","runId":"run1","hypothesisId":"A","location":"profile_service.py:166","message":"After get_profile_by_user_id","data":{"has_profile":current_user_profile is not None,"profile_id":current_user_profile.id if current_user_profile else None},"timestamp":int(__import__('time').time()*1000)}) + '\n')
    except: pass
    # #endregion
    
    if not current_user_profile:
        return []
    
    # Получаем ID профилей, на которые текущий пользователь уже ответил
    # #region agent log
    with open('c:\\Users\\Lenovo\\stud-net\\.cursor\\debug.log', 'a', encoding='utf-8') as f:
        f.write(json.dumps({"sessionId":"debug-session","runId":"run1","hypothesisId":"B","location":"profile_service.py:172","message":"Before responded query","data":{"user_id":user_id},"timestamp":int(__import__('time').time()*1000)}) + '\n')
    # #endregion
    
    responded_profile_ids_list = [row[0] for row in db.query(Swipe.target_profile_id).filter(
        Swipe.user_id == user_id
    ).all()]
    
    # #region agent log
    try:
        with open(log_path, 'a', encoding='utf-8') as f:
            f.write(json.dumps({"sessionId":"debug-session","runId":"run1","hypothesisId":"B","location":"profile_service.py:177","message":"After responded query","data":{"responded_count":len(responded_profile_ids_list)},"timestamp":int(__import__('time').time()*1000)}) + '\n')
    except: pass
    # #endregion
    
    # Используем JOIN для получения профилей тех, кто лайкнул текущего пользователя
    # Это избегает проблем с корреляцией подзапросов
    # #region agent log
    try:
        with open(log_path, 'a', encoding='utf-8') as f:
            f.write(json.dumps({"sessionId":"debug-session","runId":"run1","hypothesisId":"C","location":"profile_service.py:181","message":"Before main query construction","data":{"current_profile_id":current_user_profile.id},"timestamp":int(__import__('time').time()*1000)}) + '\n')
    except: pass
    # #endregion
    
    # Основной запрос с JOIN - избегаем подзапросов, которые могут вызвать проблемы с корреляцией
    # Создаём алиас для Swipe, чтобы избежать конфликтов при множественных JOIN
    like_swipe = aliased(Swipe)
    query = db.query(Profile).join(
        like_swipe, 
        and_(
            like_swipe.target_profile_id == current_user_profile.id,
            like_swipe.action == 'like',
            Profile.user_id == like_swipe.user_id
        )
    ).filter(
        Profile.is_active == True,
        Profile.deleted_at == None
    )
    
    # Исключаем профили, на которые уже ответили, используя простой фильтр с in_
    if responded_profile_ids_list:
        query = query.filter(~Profile.id.in_(responded_profile_ids_list))
    
    query = query.order_by(like_swipe.created_at.desc())
    
    # #region agent log
    with open('c:\\Users\\Lenovo\\stud-net\\.cursor\\debug.log', 'a', encoding='utf-8') as f:
        f.write(json.dumps({"sessionId":"debug-session","runId":"run1","hypothesisId":"C","location":"profile_service.py:201","message":"Before query execution","data":{"has_responded_filter":bool(responded_profile_ids_list)},"timestamp":int(__import__('time').time()*1000)}) + '\n')
    # #endregion
    
    try:
        liker_profiles = query.all()
    except Exception as e:
        # #region agent log
        try:
            with open(log_path, 'a', encoding='utf-8') as f:
                f.write(json.dumps({"sessionId":"debug-session","runId":"run1","hypothesisId":"D","location":"profile_service.py:206","message":"Query execution error","data":{"error":str(e),"error_type":type(e).__name__},"timestamp":int(__import__('time').time()*1000)}) + '\n')
        except: pass
        # #endregion
        raise
    
    # #region agent log
    try:
        with open(log_path, 'a', encoding='utf-8') as f:
            f.write(json.dumps({"sessionId":"debug-session","runId":"run1","hypothesisId":"C","location":"profile_service.py:213","message":"After query execution","data":{"profiles_count":len(liker_profiles)},"timestamp":int(__import__('time').time()*1000)}) + '\n')
    except: pass
    # #endregion
    
    return liker_profiles
