"""
Роутер для работы с мэтчами и свайпами
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel, Field
import logging
from app.dependencies import get_db, get_current_user_id_required
from app.services.match_service import (
    like_profile,
    pass_profile,
    respond_to_like,
    get_matches
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["matches"])

class LikeResponse(BaseModel):
    """Ответ на лайк"""
    matched: bool
    message: str

class RespondToLikeRequest(BaseModel):
    """Запрос на ответ на входящий лайк"""
    targetUserId: int = Field(..., gt=0, description="ID пользователя, которому отвечаем")
    action: str = Field(..., pattern="^(accept|decline)$", description="Действие: 'accept' или 'decline'")

@router.post("/profiles/{profile_id}/like", response_model=LikeResponse)
async def like_profile_endpoint(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id_required)
):
    """
    Лайк профиля
    
    Если есть взаимный лайк, создаётся мэтч
    """
    try:
        matched, message = like_profile(db, current_user_id, profile_id)
        return LikeResponse(matched=matched, message=message)
    except ValueError as e:
        logger.warning(f"Like profile validation error: {e}", extra={"user_id": current_user_id, "profile_id": profile_id})
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error liking profile: {e}", exc_info=True, extra={"user_id": current_user_id, "profile_id": profile_id})
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/profiles/{profile_id}/pass")
async def pass_profile_endpoint(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id_required)
):
    """Пропуск профиля"""
    try:
        message = pass_profile(db, current_user_id, profile_id)
        return {"message": message}
    except ValueError as e:
        logger.warning(f"Pass profile validation error: {e}", extra={"user_id": current_user_id, "profile_id": profile_id})
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error passing profile: {e}", exc_info=True, extra={"user_id": current_user_id, "profile_id": profile_id})
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/profiles/respond-to-like")
async def respond_to_like_endpoint(
    request: RespondToLikeRequest,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id_required)
):
    """
    Ответ на входящий лайк
    
    action: 'accept' (лайк в ответ) или 'decline' (пропуск)
    """
    try:
        matched, message = respond_to_like(db, current_user_id, request.targetUserId, request.action)
        return {
            "message": message,
            "matched": matched
        }
    except ValueError as e:
        logger.warning(f"Respond to like validation error: {e}", extra={"user_id": current_user_id, "target_user_id": request.targetUserId})
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error responding to like: {e}", exc_info=True, extra={"user_id": current_user_id, "target_user_id": request.targetUserId})
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/matches")
async def get_matches_endpoint(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id_required)
):
    """
    Получение списка мэтчей (взаимных лайков) для пользователя
    
    Возвращает профили пользователей, с которыми есть взаимный лайк (мэтч)
    """
    try:
        from app.routers.profiles import _profile_to_dict
        profiles = get_matches(db, current_user_id)
        result = [_profile_to_dict(p) for p in profiles]
        return JSONResponse(content=result)
    except Exception as e:
        logger.error(f"Error getting matches: {e}", exc_info=True, extra={"user_id": current_user_id})
        raise HTTPException(status_code=500, detail="Internal server error")
