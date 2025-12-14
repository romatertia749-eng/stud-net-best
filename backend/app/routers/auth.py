"""
Роутер для авторизации
"""
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional

from app.services.auth import (
    verify_telegram_webapp_data,
    extract_user_data_from_init_data,
    create_jwt_token
)
from config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])

class AuthRequest(BaseModel):
    """Запрос на авторизацию"""
    init_data: Optional[str] = None

class AuthResponse(BaseModel):
    """Ответ с JWT токеном"""
    token: str
    user_id: int

@router.post("", response_model=AuthResponse)
async def auth(
    request: AuthRequest,
    authorization: Optional[str] = Header(None, alias="Authorization")
):
    """
    Авторизация через Telegram Web App
    
    Принимает init_data из Telegram Web App и возвращает JWT токен
    """
    # Получаем init_data из заголовка или тела запроса
    init_data = None
    if authorization:
        if authorization.startswith("tma "):
            init_data = authorization.replace("tma ", "", 1).strip()
        elif authorization.startswith("Bearer "):
            # Если пришёл Bearer токен, это не init_data
            pass
    
    if not init_data and request.init_data:
        init_data = request.init_data
    
    if not init_data:
        raise HTTPException(status_code=400, detail="init_data is required")
    
    # Проверяем данные Telegram (если есть bot token)
    user_data = None
    if settings.TELEGRAM_BOT_TOKEN:
        user_data = verify_telegram_webapp_data(init_data, settings.TELEGRAM_BOT_TOKEN)
    
    # Если проверка не прошла, пытаемся извлечь данные напрямую
    if not user_data:
        user_data = extract_user_data_from_init_data(init_data)
    
    if not user_data or 'id' not in user_data:
        raise HTTPException(status_code=401, detail="Invalid Telegram data")
    
    user_id = user_data['id']
    
    # Создаём JWT токен
    token = create_jwt_token(user_id)
    
    return AuthResponse(token=token, user_id=user_id)
