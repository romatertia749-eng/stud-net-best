"""
Общие зависимости для роутеров
"""
from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import Optional
from app.database import SessionLocal
from app.services.auth import decode_jwt_token

def get_db():
    """Получение сессии базы данных"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user_id(authorization: Optional[str] = Header(None, alias="Authorization")) -> Optional[int]:
    """Получение user_id из JWT токена (опционально)"""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.replace("Bearer ", "")
    return decode_jwt_token(token)

def get_current_user_id_required(authorization: Optional[str] = Header(None, alias="Authorization")) -> int:
    """Получение user_id из JWT токена (обязательно, выбрасывает 401 если токен невалидный)"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header required")
    token = authorization.replace("Bearer ", "")
    user_id = decode_jwt_token(token)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user_id
