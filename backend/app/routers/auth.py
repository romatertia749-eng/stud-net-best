"""
Роутер для авторизации
"""
from fastapi import APIRouter, HTTPException, Depends, Header, Request
from pydantic import BaseModel, ValidationError
from typing import Optional
import logging

from app.services.auth import (
    verify_telegram_webapp_data,
    extract_user_data_from_init_data,
    create_jwt_token
)
from config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

class AuthRequest(BaseModel):
    """Запрос на авторизацию"""
    init_data: Optional[str] = None
    user_id: Optional[int] = None  # Для режима разработки
    dev_mode: Optional[bool] = False  # Флаг режима разработки

class AuthResponse(BaseModel):
    """Ответ с JWT токеном"""
    token: str
    user_id: int

@router.post("", response_model=AuthResponse)
async def auth(
    request: Request,
    authorization: Optional[str] = Header(None, alias="Authorization")
):
    """
    Авторизация через Telegram Web App
    
    Принимает init_data из Telegram Web App и возвращает JWT токен
    Или user_id + dev_mode для режима разработки
    """
    # Пытаемся получить данные из тела запроса
    auth_request = AuthRequest()
    try:
        body = await request.json()
        if body:  # Если тело не пустое
            auth_request = AuthRequest(**body)
            logger.info(f"Получен запрос: user_id={auth_request.user_id}, dev_mode={auth_request.dev_mode}, has_init_data={bool(auth_request.init_data)}")
    except Exception as e:
        # Если тело пустое или не JSON - это нормально, initData может быть в заголовке
        logger.debug(f"Тело запроса пустое или не JSON (это нормально): {e}")
    
    # Получаем init_data из заголовка или тела запроса
    init_data = None
    if authorization:
        if authorization.startswith("tma "):
            init_data = authorization.replace("tma ", "", 1).strip()
            logger.info(f"Получен init_data из заголовка (длина: {len(init_data)})")
        elif authorization.startswith("Bearer "):
            # Если пришёл Bearer токен, это не init_data
            pass
    
    if not init_data and auth_request.init_data:
        init_data = auth_request.init_data
        logger.info(f"Получен init_data из тела запроса (длина: {len(init_data)})")
    
    # Режим разработки: если нет init_data, но есть user_id
    if not init_data and auth_request.user_id is not None:
        logger.info(f"Режим разработки: user_id={auth_request.user_id}, dev_mode={auth_request.dev_mode}, has_bot_token={bool(settings.TELEGRAM_BOT_TOKEN)}")
        # Проверяем dev_mode (может быть True или отсутствовать)
        # Также разрешаем если нет TELEGRAM_BOT_TOKEN (режим разработки)
        # ИЛИ если dev_mode явно установлен в True
        if auth_request.dev_mode is True or not settings.TELEGRAM_BOT_TOKEN:
            user_id = auth_request.user_id
            logger.info(f"🔧 Режим разработки: создание токена для user_id={user_id}")
            # В режиме разработки создаём токен напрямую без проверки Telegram
            token = create_jwt_token(user_id)
            return AuthResponse(token=token, user_id=user_id)
        else:
            logger.warning(f"Режим разработки запрошен, но dev_mode={auth_request.dev_mode} и TELEGRAM_BOT_TOKEN установлен")
    
    if not init_data:
        error_detail = "init_data is required. For dev mode, provide user_id and dev_mode=true"
        logger.warning(f"Ошибка авторизации: {error_detail}")
        raise HTTPException(status_code=400, detail=error_detail)
    
    # Проверяем данные Telegram (если есть bot token)
    user_data = None
    if settings.TELEGRAM_BOT_TOKEN:
        user_data = verify_telegram_webapp_data(init_data, settings.TELEGRAM_BOT_TOKEN)
        if user_data:
            logger.info(f"✅ Проверка Telegram данных прошла успешно для user_id={user_data.get('id')}")
        else:
            logger.warning(f"⚠️ Проверка Telegram данных не прошла, пробуем извлечь данные напрямую")
    
    # Если проверка не прошла, пытаемся извлечь данные напрямую
    if not user_data:
        user_data = extract_user_data_from_init_data(init_data)
        if user_data:
            logger.info(f"✅ Данные извлечены напрямую из init_data для user_id={user_data.get('id')}")
    
    # Если всё ещё нет user_data, но есть user_id в запросе (fallback от frontend)
    if not user_data or 'id' not in user_data:
        if auth_request.user_id is not None:
            logger.warning(f"⚠️ Не удалось извлечь user_id из initData, используем user_id из запроса: {auth_request.user_id}")
            user_id = auth_request.user_id
            token = create_jwt_token(user_id)
            return AuthResponse(token=token, user_id=user_id)
        else:
            logger.error(f"❌ Не удалось извлечь данные пользователя из initData и нет user_id в запросе")
            raise HTTPException(status_code=401, detail="Invalid Telegram data")
    
    user_id = user_data['id']
    
    # Создаём JWT токен
    token = create_jwt_token(user_id)
    logger.info(f"✅ JWT токен создан для user_id={user_id}")
    
    return AuthResponse(token=token, user_id=user_id)
