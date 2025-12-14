"""
Роутер для работы с профилями
"""
from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional, List
import json
from app.dependencies import get_db, get_current_user_id_required
from app.services.profile_service import (
    get_profile_by_user_id,
    get_profile_by_id,
    get_profiles_for_swipe,
    create_or_update_profile,
    get_incoming_likes
)

router = APIRouter(prefix="/api/profiles", tags=["profiles"])

def _profile_to_dict(profile):
    """Преобразует профиль в словарь"""
    def normalize_field(value):
        if value is None:
            return []
        if isinstance(value, list):
            return [str(item) for item in value]
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                return [str(item) for item in parsed] if isinstance(parsed, list) else []
            except:
                return []
        return []
    
    return {
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
        "interests": normalize_field(profile.interests),
        "goals": normalize_field(profile.goals),
        "bio": profile.bio,
        "photo_url": profile.photo_url,
        "created_at": profile.created_at.isoformat() if profile.created_at else None,
        "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
    }

@router.get("")
async def get_profiles(
    page: int = Query(0, ge=0),
    size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id_required)
):
    """
    Получение списка профилей для свайпа
    
    Возвращает профили, которые пользователь ещё не свайпнул
    """
    try:
        profiles = get_profiles_for_swipe(db, current_user_id, page, size)
        result = [_profile_to_dict(p) for p in profiles]
        return JSONResponse(content={
            "items": result,
            "page": page,
            "size": size,
            "total": len(result),
            "has_more": len(result) == size
        })
    except Exception as e:
        logger.error(f"Error getting profiles for swipe: {e}", exc_info=True, extra={"user_id": current_user_id, "page": page, "size": size})
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{profile_id}")
async def get_profile_by_id_endpoint(profile_id: int, db: Session = Depends(get_db)):
    """Получение профиля по ID"""
    try:
        profile = get_profile_by_id(db, profile_id)
        
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        result = _profile_to_dict(profile)
        return JSONResponse(content=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting profile by id: {e}", exc_info=True, extra={"profile_id": profile_id})
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/user/{user_id}")
async def get_profile_by_user_id_endpoint(user_id: int, db: Session = Depends(get_db)):
    """Получение профиля по user_id"""
    profile = get_profile_by_user_id(db, user_id)
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    result = _profile_to_dict(profile)
    return JSONResponse(content=result)

@router.post("")
async def create_or_update_profile_endpoint(
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
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id_required)
):
    """
    Создание или обновление профиля
    
    Если профиль с таким user_id уже существует, он обновляется
    """
    try:
        profile = create_or_update_profile(
            db=db,
            user_id=current_user_id,
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
        
        result = _profile_to_dict(profile)
        return JSONResponse(content=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating/updating profile: {e}", exc_info=True, extra={"user_id": current_user_id})
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/incoming-likes")
async def get_incoming_likes_endpoint(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id_required)
):
    """
    Получение списка пользователей, которые лайкнули текущего пользователя
    
    Возвращает профили тех, кто лайкнул пользователя, но пользователь ещё не ответил
    """
    try:
        profiles = get_incoming_likes(db, current_user_id)
        result = [_profile_to_dict(p) for p in profiles]
        return JSONResponse(content=result)
    except Exception as e:
        logger.error(f"Error getting incoming likes: {e}", exc_info=True, extra={"user_id": current_user_id})
        raise HTTPException(status_code=500, detail="Internal server error")
