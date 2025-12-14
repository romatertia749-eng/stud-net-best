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
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"🔐 Проверка авторизации: authorization={authorization[:50] if authorization else None}...")
    
    if not authorization or not authorization.startswith("Bearer "):
        logger.warning("❌ Authorization header отсутствует или не начинается с 'Bearer '")
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    token = authorization.replace("Bearer ", "")
    logger.info(f"🔑 Извлечён токен (длина: {len(token)})")
    
    user_id = decode_jwt_token(token)
    if user_id is None:
        logger.warning(f"❌ Токен невалидный или истёк: {token[:20]}...")
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    logger.info(f"✅ Токен валиден, user_id={user_id}")
    return user_id
