"""
Сервис для работы с мэтчами и свайпами
"""
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Tuple
from datetime import datetime

from app.database import Profile, Swipe, Match
from app.services.profile_service import get_profile_by_user_id

def like_profile(db: Session, user_id: int, profile_id: int) -> Tuple[bool, str]:
    """
    Лайк профиля
    
    Возвращает (matched: bool, message: str)
    """
    # Проверяем, что профиль существует
    target_profile = db.query(Profile).filter(
        Profile.id == profile_id,
        Profile.is_active == True,
        Profile.deleted_at == None
    ).first()
    
    if not target_profile:
        raise ValueError("Profile not found")
    
    # Проверяем, что пользователь не лайкает сам себя
    if target_profile.user_id == user_id:
        raise ValueError("Cannot like your own profile")
    
    # Проверяем, не было ли уже свайпа
    existing_swipe = db.query(Swipe).filter(
        Swipe.user_id == user_id,
        Swipe.target_profile_id == profile_id
    ).first()
    
    if existing_swipe:
        if existing_swipe.action == 'like':
            raise ValueError("Already liked")
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
    current_user_profile = get_profile_by_user_id(db, user_id)
    
    if not current_user_profile:
        db.commit()
        return (False, "Liked successfully")
    
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
    
    return (matched, "Liked successfully")

def pass_profile(db: Session, user_id: int, profile_id: int) -> str:
    """Пропуск профиля"""
    # Проверяем, что профиль существует
    target_profile = db.query(Profile).filter(
        Profile.id == profile_id,
        Profile.is_active == True,
        Profile.deleted_at == None
    ).first()
    
    if not target_profile:
        raise ValueError("Profile not found")
    
    # Проверяем, не было ли уже свайпа
    existing_swipe = db.query(Swipe).filter(
        Swipe.user_id == user_id,
        Swipe.target_profile_id == profile_id
    ).first()
    
    if existing_swipe:
        if existing_swipe.action == 'pass':
            return "Already passed"
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
    
    return "Passed successfully"

def respond_to_like(
    db: Session,
    user_id: int,
    target_user_id: int,
    action: str
) -> Tuple[bool, str]:
    """
    Ответ на входящий лайк
    
    action: 'accept' (лайк в ответ) или 'decline' (пропуск)
    Возвращает (matched: bool, message: str)
    """
    if action not in ['accept', 'decline']:
        raise ValueError("Action must be 'accept' or 'decline'")
    
    # Получаем профили
    current_user_profile = get_profile_by_user_id(db, user_id)
    target_user_profile = get_profile_by_user_id(db, target_user_id)
    
    if not current_user_profile or not target_user_profile:
        raise ValueError("Profile not found")
    
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
    
    return (matched, f"Response recorded: {action}")

def get_matches(db: Session, user_id: int) -> List[Profile]:
    """Получение списка мэтчей для пользователя"""
    current_user_profile = get_profile_by_user_id(db, user_id)
    
    if not current_user_profile:
        return []
    
    # Получаем все мэтчи, где пользователь участвует
    matches = db.query(Match).filter(
        or_(
            Match.user1_id == user_id,
            Match.user2_id == user_id
        )
    ).order_by(Match.matched_at.desc()).all()
    
    if not matches:
        return []
    
    # Собираем user_id всех мэтченных пользователей
    matched_user_ids = []
    for match in matches:
        if match.user1_id == user_id:
            matched_user_ids.append(match.user2_id)
        else:
            matched_user_ids.append(match.user1_id)
    
    if not matched_user_ids:
        return []
    
    # Получаем профили мэтченных пользователей
    matched_profiles = db.query(Profile).filter(
        Profile.user_id.in_(matched_user_ids),
        Profile.is_active == True,
        Profile.deleted_at == None
    ).all()
    
    # Сортируем профили в том же порядке, что и мэтчи
    profiles_by_user_id = {p.user_id: p for p in matched_profiles}
    
    # Возвращаем профили в порядке мэтчей
    result = []
    for match in matches:
        other_user_id = match.user2_id if match.user1_id == user_id else match.user1_id
        if other_user_id in profiles_by_user_id:
            result.append(profiles_by_user_id[other_user_id])
    
    return result
