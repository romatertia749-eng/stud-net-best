"""
Роутер для работы с мэтчами и свайпами
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from app.dependencies import get_db
from app.models import ProfileResponse
from app.services.match_service import (
    like_profile,
    pass_profile,
    respond_to_like,
    get_matches
)
from app.services.profile_service import get_profile_by_user_id

router = APIRouter(prefix="/api", tags=["matches"])

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

@router.post("/profiles/{profile_id}/like", response_model=LikeResponse)
async def like_profile_endpoint(
    profile_id: int,
    request: LikeRequest,
    db: Session = Depends(get_db)
):
    """
    Лайк профиля
    
    Если есть взаимный лайк, создаётся мэтч
    """
    try:
        matched, message = like_profile(db, request.user_id, profile_id)
        return LikeResponse(matched=matched, message=message)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/profiles/{profile_id}/pass")
async def pass_profile_endpoint(
    profile_id: int,
    request: PassRequest,
    db: Session = Depends(get_db)
):
    """Пропуск профиля"""
    try:
        message = pass_profile(db, request.user_id, profile_id)
        return {"message": message}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/profiles/respond-to-like")
async def respond_to_like_endpoint(
    request: RespondToLikeRequest,
    user_id: int = Query(..., description="ID пользователя"),
    db: Session = Depends(get_db)
):
    """
    Ответ на входящий лайк
    
    action: 'accept' (лайк в ответ) или 'decline' (пропуск)
    """
    try:
        matched, message = respond_to_like(db, user_id, request.targetUserId, request.action)
        return {
            "message": message,
            "matched": matched
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/matches", response_model=List[ProfileResponse])
async def get_matches_endpoint(
    user_id: int = Query(..., description="ID пользователя"),
    db: Session = Depends(get_db)
):
    """
    Получение списка мэтчей (взаимных лайков) для пользователя
    
    Возвращает профили пользователей, с которыми есть взаимный лайк (мэтч)
    """
    profiles = get_matches(db, user_id)
    return [ProfileResponse.from_profile(p) for p in profiles]
