"""
Общие зависимости для роутеров
"""
from fastapi import Depends
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

def get_current_user_id(authorization: Optional[str] = None) -> Optional[int]:
    """Получение user_id из JWT токена"""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.replace("Bearer ", "")
    return decode_jwt_token(token)
