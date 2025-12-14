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
    
    # Используем и logger, и print для гарантии, что сообщение будет видно
    auth_preview = authorization[:50] if authorization else None
    print(f"🔐 [DEPENDENCIES] Проверка авторизации: authorization={auth_preview}...")
    logger.info(f"🔐 Проверка авторизации: authorization={auth_preview}...")
    
    if not authorization:
        error_msg = "❌ Authorization header отсутствует"
        print(error_msg)
        logger.warning(error_msg)
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    if not authorization.startswith("Bearer "):
        error_msg = f"❌ Authorization header не начинается с 'Bearer ': {authorization[:30]}..."
        print(error_msg)
        logger.warning(error_msg)
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    token = authorization.replace("Bearer ", "")
    print(f"🔑 [DEPENDENCIES] Извлечён токен (длина: {len(token)}, первые 20 символов: {token[:20]}...)")
    logger.info(f"🔑 Извлечён токен (длина: {len(token)})")
    
    user_id = decode_jwt_token(token)
    if user_id is None:
        error_msg = f"❌ Токен невалидный или истёк: {token[:20]}..."
        print(error_msg)
        logger.warning(error_msg)
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    success_msg = f"✅ Токен валиден, user_id={user_id}"
    print(success_msg)
    logger.info(success_msg)
    return user_id
