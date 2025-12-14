"""
Роутер для отладки
"""
from fastapi import APIRouter
from app.database import SessionLocal, Profile, Swipe, Match

router = APIRouter(prefix="/api/debug", tags=["debug"])

@router.get("/health")
async def health_check():
    """Проверка здоровья API"""
    return {"status": "ok"}

@router.get("/stats")
async def get_stats():
    """Получение статистики (для отладки)"""
    db = SessionLocal()
    try:
        profiles_count = db.query(Profile).filter(Profile.is_active == True).count()
        swipes_count = db.query(Swipe).count()
        matches_count = db.query(Match).count()
        
        return {
            "profiles": profiles_count,
            "swipes": swipes_count,
            "matches": matches_count
        }
    finally:
        db.close()
