import hmac
import hashlib
import json
from urllib.parse import parse_qsl
from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple
import jwt
import os
from dotenv import load_dotenv

# Загружаем переменные из .env файла
load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
# Поддерживаем оба варианта имени переменной для совместимости
JWT_SECRET = os.getenv("JWT_SECRET") or os.getenv("JWT_SECRET_KEY") or "your-secret-key-change-in-production"

# Проверяем при загрузке модуля
if not JWT_SECRET or JWT_SECRET == "your-secret-key-change-in-production":
    print("⚠️  WARNING: JWT_SECRET использует значение по умолчанию! Установите JWT_SECRET или JWT_SECRET_KEY в переменных окружения.")
else:
    print(f"✅ JWT_SECRET загружен (длина: {len(JWT_SECRET)})")

class TelegramAuthError(Exception):
    pass

def validate_init_data(init_data_str: str) -> Dict:
    """
    Валидирует инициализационные данные от Telegram Mini App
    """
    try:
        parsed_data = dict(parse_qsl(init_data_str, strict_parsing=True))
    except ValueError:
        raise TelegramAuthError("Invalid init data format")

    if 'hash' not in parsed_data:
        raise TelegramAuthError("Missing hash")
    
    received_hash = parsed_data.pop('hash')
    
    # Создаем строку для проверки подписи
    data_check_string = '\n'.join(
        f"{k}={v}" for k, v in sorted(parsed_data.items())
    )
    
    # Генерируем секретный ключ из токена бота
    secret_key = hmac.new(
        b'WebAppData',
        TELEGRAM_BOT_TOKEN.encode(),
        hashlib.sha256
    ).digest()
    
    # Вычисляем ожидаемый хеш
    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256
    ).hexdigest()
    
    # Сравниваем хеши
    if calculated_hash != received_hash:
        raise TelegramAuthError("Invalid hash - data tampered")
    
    # Проверяем свежесть данных (не старше 5 минут)
    if 'auth_date' in parsed_data:
        auth_date = int(parsed_data['auth_date'])
        current_time = int(datetime.now().timestamp())
        
        if current_time - auth_date > 300:  # 5 минут
            raise TelegramAuthError("Init data expired")
    
    return parsed_data

def extract_user_id(init_data_str: str) -> Tuple[str, Dict]:
    """Извлекает ID пользователя из initData"""
    parsed_data = validate_init_data(init_data_str)
    
    if 'user' not in parsed_data:
        raise TelegramAuthError("User data not found")
    
    user_json = json.loads(parsed_data['user'])
    return str(user_json['id']), user_json

def generate_jwt_token(user_id: str) -> str:
    """Генерирует JWT токен для пользователя"""
    import logging
    logger = logging.getLogger(__name__)
    
    if not JWT_SECRET or JWT_SECRET == "your-secret-key-change-in-production":
        logger.warning("⚠️ JWT_SECRET использует значение по умолчанию - это небезопасно!")
    
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=7)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm='HS256')
    logger.info(f"✅ JWT токен создан для user_id={user_id}, секретный ключ длина={len(JWT_SECRET) if JWT_SECRET else 0}")
    return token

def verify_jwt_token(token: str) -> str:
    """Проверяет JWT токен"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        raise TelegramAuthError("Token expired")
    except jwt.InvalidTokenError:
        raise TelegramAuthError("Invalid token")

def decode_jwt_token(token: str) -> Optional[int]:
    """Декодирование JWT токена и получение user_id (для dependencies)"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        if not token:
            logger.warning("❌ Токен пустой")
            return None
            
        if not JWT_SECRET or JWT_SECRET == "your-secret-key-change-in-production":
            logger.error(f"❌ JWT_SECRET не установлен или использует значение по умолчанию (длина: {len(JWT_SECRET) if JWT_SECRET else 0})")
            return None
        
        logger.info(f"🔐 Декодирование токена, длина секретного ключа: {len(JWT_SECRET)}")
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        
        logger.info(f"📋 Декодированный payload: {payload}")
        user_id = payload.get('user_id')
        
        if user_id is None:
            logger.warning(f"❌ Токен не содержит 'user_id': {payload}")
            return None
        
        user_id_int = int(user_id)
        logger.info(f"✅ Токен успешно декодирован, user_id={user_id_int}")
        return user_id_int
        
    except jwt.ExpiredSignatureError as e:
        logger.warning(f"❌ Токен истёк: {str(e)}")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"❌ Невалидный токен (возможно, неправильный секретный ключ): {str(e)}")
        return None
    except (ValueError, TypeError) as e:
        logger.warning(f"❌ Ошибка преобразования user_id: {str(e)}, payload: {payload if 'payload' in locals() else 'N/A'}")
        return None
    except Exception as e:
        logger.error(f"❌ Неожиданная ошибка при декодировании токена: {type(e).__name__}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return None
