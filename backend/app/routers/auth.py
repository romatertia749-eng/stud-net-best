"""
Роутер для авторизации
"""
from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Optional
from app.services.auth import extract_user_id, generate_jwt_token, TelegramAuthError

router = APIRouter(prefix="/api/auth", tags=["auth"])

# POST /api/auth - авторизация
@router.post("/", include_in_schema=True)
def auth(authorization: Optional[str] = Header(None)):
    """
    Получает initData от фронтенда, валидирует его и возвращает JWT токен
    """
    if not authorization or not authorization.startswith("tma "):
        raise HTTPException(
            status_code=400,
            detail="Missing Telegram Mini App data. Use 'Authorization: tma <initData>' header"
        )
    
    init_data = authorization[4:]  # Удаляем "tma "
    
    try:
        user_id, user_data = extract_user_id(init_data)
        
        # Здесь можно добавить логику сохранения/обновления пользователя в БД
        # Пока просто возвращаем токен
        
        token = generate_jwt_token(user_id)
        
        return {
            "token": token,
            "user_id": int(user_id),
            "user": user_data
        }
    
    except TelegramAuthError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authentication error: {str(e)}")
