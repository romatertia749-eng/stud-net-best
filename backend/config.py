"""
Конфигурация приложения

ВАЖНО: Этот файл НЕ хранит секреты!
Он только читает переменные окружения.

Где хранить секреты:
- В Koyeb: Settings → Environment Variables (для продакшена)
- В .env файле: только для локальной разработки (не коммитить в Git!)

Значения ниже - это значения по умолчанию (fallback).
Они используются ТОЛЬКО если переменная окружения не найдена.
"""

from pydantic_settings import BaseSettings
from typing import List
from pydantic import field_validator

class Settings(BaseSettings):
    """
    Настройки приложения
    
    BaseSettings автоматически загружает переменные окружения.
    Приоритет:
    1. Переменные окружения (из Koyeb или системы) ← Используется в продакшене
    2. Файл .env (если есть) ← Для локальной разработки
    3. Значение по умолчанию в коде ← Только если ничего не найдено
    """
    
    # Database
    # ⚠️ НЕ пиши реальную строку подключения здесь!
    # Установи DATABASE_URL в переменных окружения Koyeb
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/networking_app"
    
    # JWT
    # ⚠️ НЕ пиши реальный секретный ключ здесь!
    # Установи JWT_SECRET_KEY в переменных окружения Koyeb
    JWT_SECRET_KEY: str = "your-secret-key-here-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # Telegram
    # Опционально: установи TELEGRAM_BOT_TOKEN в переменных окружения Koyeb
    TELEGRAM_BOT_TOKEN: str = ""
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # CORS - может быть строкой (через запятую) или списком
    # ⚠️ Установи CORS_ORIGINS в переменных окружения Koyeb с URL вашего Netlify сайта
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    
    # File Upload
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 5
    
    @field_validator('CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        """Парсит CORS_ORIGINS из строки в список"""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

# Простая проверка при загрузке модуля
def _check_config():
    """Проверяет, загружены ли важные переменные окружения"""
    import os
    
    warnings = []
    
    # Проверяем DATABASE_URL
    if settings.DATABASE_URL == "postgresql://user:password@localhost:5432/networking_app":
        warnings.append("⚠️  DATABASE_URL использует значение по умолчанию - установите в Koyeb Environment Variables")
    else:
        print("✅ DATABASE_URL загружен из переменных окружения")
    
    # Проверяем JWT_SECRET_KEY
    if settings.JWT_SECRET_KEY == "your-secret-key-here-change-in-production":
        warnings.append("⚠️  JWT_SECRET_KEY использует значение по умолчанию (НЕБЕЗОПАСНО!) - установите в Koyeb")
    else:
        print("✅ JWT_SECRET_KEY загружен из переменных окружения")
    
    # Проверяем CORS_ORIGINS
    cors_str = ", ".join(settings.CORS_ORIGINS) if isinstance(settings.CORS_ORIGINS, list) else str(settings.CORS_ORIGINS)
    if "localhost" in cors_str and len(settings.CORS_ORIGINS) <= 2:
        warnings.append("⚠️  CORS_ORIGINS использует значение по умолчанию - установите URL вашего Netlify сайта в Koyeb")
    else:
        print(f"✅ CORS_ORIGINS загружен: {cors_str}")
    
    if warnings:
        print("\n" + "="*60)
        print("⚠️  ВНИМАНИЕ: Обнаружены проблемы с конфигурацией:")
        for warning in warnings:
            print(f"   {warning}")
        print("="*60 + "\n")
    else:
        print("✅ Все важные переменные окружения загружены корректно\n")

# Выполняем проверку при импорте (только если не в тестах)
if __name__ != "__main__" or True:  # Всегда проверяем
    try:
        _check_config()
    except Exception:
        pass  # Игнорируем ошибки при проверке
