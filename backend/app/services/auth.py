"""
Сервис авторизации
"""
from typing import Optional, Dict
from datetime import datetime, timedelta
from jose import JWTError, jwt
import json
import urllib.parse
import hashlib
import hmac
from config import settings

def verify_telegram_webapp_data(init_data: str, bot_token: str) -> Optional[Dict]:
    """Проверка данных Telegram Web App"""
    try:
        # Парсим init_data
        data_dict = {}
        for item in init_data.split('&'):
            if '=' in item:
                key, value = item.split('=', 1)
                data_dict[key] = value
        
        # Проверяем hash
        if 'hash' not in data_dict:
            return None
        
        hash_value = data_dict.pop('hash')
        
        # Создаём строку для проверки
        data_check_string = '\n'.join(f"{k}={v}" for k, v in sorted(data_dict.items()))
        secret_key = hmac.new(
            key=b"WebAppData",
            msg=bot_token.encode(),
            digestmod=hashlib.sha256
        ).digest()
        
        calculated_hash = hmac.new(
            key=secret_key,
            msg=data_check_string.encode(),
            digestmod=hashlib.sha256
        ).hexdigest()
        
        if calculated_hash != hash_value:
            return None
        
        # Парсим user данные
        if 'user' in data_dict:
            user_data = json.loads(urllib.parse.unquote(data_dict['user']))
            return user_data
        
        return None
    except Exception as e:
        print(f"Error verifying Telegram data: {e}")
        return None

def extract_user_data_from_init_data(init_data: str) -> Optional[Dict]:
    """Извлечение данных пользователя из init_data без проверки"""
    try:
        for item in init_data.split('&'):
            if item.startswith('user='):
                user_data = json.loads(urllib.parse.unquote(item.split('=', 1)[1]))
                return user_data
    except:
        pass
    return None

def create_jwt_token(user_id: int) -> str:
    """Создание JWT токена"""
    import logging
    logger = logging.getLogger(__name__)
    
    expire = datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
    payload = {
        "sub": user_id,
        "exp": expire
    }
    
    # Логируем информацию о ключе (только первые и последние символы для безопасности)
    secret_key = settings.JWT_SECRET_KEY
    secret_preview = f"{secret_key[:8]}...{secret_key[-8:]}" if len(secret_key) > 16 else "***"
    logger.info(f"🔑 Создание токена для user_id={user_id}, используемый ключ: {secret_preview}, длина: {len(secret_key)}")
    
    token = jwt.encode(payload, secret_key, algorithm=settings.JWT_ALGORITHM)
    logger.info(f"✅ Токен создан успешно (длина: {len(token)})")
    return token

def decode_jwt_token(token: str) -> Optional[int]:
    """Декодирование JWT токена и получение user_id"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        secret_key = settings.JWT_SECRET_KEY
        secret_preview = f"{secret_key[:8]}...{secret_key[-8:]}" if len(secret_key) > 16 else "***"
        logger.info(f"🔐 Декодирование токена (длина токена: {len(token)}, используемый ключ: {secret_preview}, длина ключа: {len(secret_key)})")
        
        payload = jwt.decode(token, secret_key, algorithms=[settings.JWT_ALGORITHM])
        user_id: int = payload.get("sub")
        logger.info(f"✅ Токен успешно декодирован, user_id={user_id}")
        return user_id
    except JWTError as e:
        logger.warning(f"❌ Ошибка декодирования токена: {type(e).__name__}: {str(e)}")
        # Дополнительная информация для отладки
        secret_key = settings.JWT_SECRET_KEY
        logger.warning(f"   Используемый ключ (первые 8 символов): {secret_key[:8]}...")
        return None
    except Exception as e:
        logger.error(f"❌ Неожиданная ошибка при декодировании токена: {type(e).__name__}: {str(e)}")
        return None
