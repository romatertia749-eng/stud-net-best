"""
FastAPI Backend для StudNet - приложения нетворкинга

Основные функции:
- Авторизация через Telegram Web App
- Управление профилями пользователей
- Система свайпов (лайки/пропуски)
- Мэтчи (взаимные лайки)
- Загрузка фотографий
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import settings
from app.routers import auth, profiles, matches, debug
from app.services.file_storage import UPLOAD_DIR

# Инициализация FastAPI приложения
app = FastAPI(
    title="StudNet API",
    description="Backend API для приложения нетворкинга StudNet",
    version="1.0.0"
)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
