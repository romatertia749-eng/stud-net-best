"""
Сервис для работы с мэтчами и свайпами
"""
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Tuple
from datetime import datetime

from app.database import Profile, Swipe, Match
from app.services.profile_service import get_profile_by_user_id

def like_profile(db: Session, user_id: int, profile_id: int) -> Tuple[bool, str]:
    """
    Лайк профиля (с транзакцией)
    
    Возвращает (matched: bool, message: str)
    """
    try:
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
    except Exception as e:
        db.rollback()
        raise

def pass_profile(db: Session, user_id: int, profile_id: int) -> str:
    """Пропуск профиля (с транзакцией)"""
    try:
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
    except Exception as e:
        db.rollback()
        raise

def respond_to_like(
    db: Session,
    user_id: int,
    target_user_id: int,
    action: str
) -> Tuple[bool, str]:
    """
    Ответ на входящий лайк (с транзакцией)
    
    action: 'accept' (лайк в ответ) или 'decline' (пропуск)
    Возвращает (matched: bool, message: str)
    """
    if action not in ['accept', 'decline']:
        raise ValueError("Action must be 'accept' or 'decline'")
    
    try:
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
    except Exception as e:
        db.rollback()
        raise

def get_matches(db: Session, user_id: int) -> List[Profile]:
    """
    Получение списка мэтчей для пользователя (оптимизированная версия с JOIN)
    
    Возвращает профили пользователей, с которыми есть взаимный лайк (мэтч)
    """
    from sqlalchemy import case
    import logging
    
    logger = logging.getLogger(__name__)
    
    try:
        # Проверяем, что профиль пользователя существует
        current_user_profile = get_profile_by_user_id(db, user_id)
        if not current_user_profile:
            logger.warning(f"User profile not found for user_id: {user_id}")
            return []
        
        # Оптимизированный запрос с JOIN вместо множественных запросов
        # Используем индексы для быстрого поиска (idx_matches_user1_id, idx_matches_user2_id, idx_matches_matched_at_desc)
        # Используем DISTINCT для избежания дубликатов при JOIN
        from sqlalchemy import distinct
        
        matched_profiles = db.query(Profile).distinct().join(
            Match,
            or_(
                and_(Match.user1_id == user_id, Match.user2_id == Profile.user_id),
                and_(Match.user2_id == user_id, Match.user1_id == Profile.user_id)
            )
        ).filter(
            Profile.is_active == True,
            Profile.deleted_at == None,
            Profile.user_id != user_id
        ).order_by(Match.matched_at.desc()).all()
        
        logger.info(f"Found {len(matched_profiles)} matches for user_id: {user_id}")
        return matched_profiles
    except Exception as e:
        logger.error(f"Error getting matches for user_id {user_id}: {e}", exc_info=True)
        # Возвращаем пустой список вместо исключения, чтобы не ломать фронтенд
        return []
