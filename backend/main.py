"""
FastAPI Backend для StudNet - приложения нетворкинга

Основные функции:
- Авторизация через Telegram Web App
- Управление профилями пользователей
- Система свайпов (лайки/пропуски)
- Мэтчи (взаимные лайки)
- Загрузка фотографий
"""

import sys
import re

# Подавляем предупреждения ImageKit
class FilteredStderr:
    def __init__(self, original_stderr):
        self.original_stderr = original_stderr
        self.buffer = ''
    
    def write(self, message):
        self.buffer += message
        if '\n' in self.buffer:
            lines = self.buffer.split('\n')
            self.buffer = lines[-1]
            for line in lines[:-1]:
                if 'ImageKit' not in line and 'IMAGEKIT' not in line:
                    self.original_stderr.write(line + '\n')
    
    def flush(self):
        if self.buffer and 'ImageKit' not in self.buffer and 'IMAGEKIT' not in self.buffer:
            self.original_stderr.write(self.buffer)
            self.buffer = ''
        self.original_stderr.flush()

# Применяем фильтр к stderr
sys.stderr = FilteredStderr(sys.stderr)

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import logging

from config import settings
from app.routers import auth, profiles, matches, debug
from app.services.file_storage import UPLOAD_DIR

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Инициализация FastAPI приложения
app = FastAPI(
    title="StudNet API",
    description="Backend API для приложения нетворкинга StudNet",
    version="1.0.0"
)

# Обработчик ошибок валидации (422)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Обработчик ошибок валидации с детальным логированием"""
    logger = logging.getLogger(__name__)
    logger.error(f"❌ Validation error for {request.method} {request.url}")
    logger.error(f"   Errors: {exc.errors()}")
    logger.error(f"   Body: {await request.body() if hasattr(request, 'body') else 'N/A'}")
    logger.error(f"   Headers: {dict(request.headers)}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "body": str(exc.body) if hasattr(exc, 'body') else None}
    )

# Middleware для логирования заголовков
@app.middleware("http")
async def log_headers_middleware(request: Request, call_next):
    url_str = str(request.url)
    
    # Логируем POST /api/profiles
    if request.method == "POST" and "/api/profiles" in url_str:
        print(f"📥 [MIDDLEWARE] POST /api/profiles - Заголовки:")
        for header_name, header_value in request.headers.items():
            if header_name.lower() == "authorization":
                preview = header_value[:30] + "..." if len(header_value) > 30 else header_value
                print(f"   {header_name}: {preview}")
            else:
                print(f"   {header_name}: {header_value}")
    
    # Логируем GET /api/profiles/incoming-likes
    if request.method == "GET" and "/api/profiles/incoming-likes" in url_str:
        logger = logging.getLogger(__name__)
        logger.info(f"📥 [MIDDLEWARE] GET /api/profiles/incoming-likes")
        logger.info(f"   URL: {url_str}")
        logger.info(f"   Query params: {dict(request.query_params)}")
        logger.info(f"   Headers: {dict(request.headers)}")
    
    response = await call_next(request)
    return response

# Настройка CORS
print(f"🔧 CORS настроен для origins: {settings.CORS_ORIGINS}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Подключение роутеров
app.include_router(auth.router)
app.include_router(profiles.router)
app.include_router(matches.router)
app.include_router(debug.router)

# Подключение статических файлов (фотографии)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

@app.get("/")
async def root():
    """Корневой endpoint"""
    return {"message": "StudNet API", "version": "1.0.0"}

@app.get("/api")
async def api_root():
    """API корневой endpoint"""
    return {
        "message": "StudNet API",
        "version": "1.0.0",
        "endpoints": {
            "auth": "/api/auth",
            "profiles": "/api/profiles",
            "matches": "/api/matches",
            "debug": "/api/debug"
        }
    }

@app.get("/health")
async def health():
    """Простая проверка здоровья без префикса"""
    return {"status": "ok", "service": "StudNet API"}

@app.get("/routes")
async def list_routes():
    """Список всех зарегистрированных роутов"""
    routes = []
    for route in app.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            routes.append({
                "path": route.path,
                "methods": list(route.methods) if route.methods else []
            })
    return {"routes": routes}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
