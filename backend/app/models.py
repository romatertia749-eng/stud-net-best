"""
Общие Pydantic модели для API
"""
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
import json

def _normalize_list_field(value):
    """Нормализует JSONB поля в списки строк"""
    if value is None:
        return []
    elif isinstance(value, list):
        return [str(item) for item in value]
    elif isinstance(value, str):
        try:
            parsed = json.loads(value)
            return [str(item) for item in parsed] if isinstance(parsed, list) else []
        except:
            return []
    else:
        return []

class ProfileResponse(BaseModel):
    """Ответ с данными профиля"""
    id: int
    user_id: int
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    name: str
    gender: str
    age: int
    city: str
    university: str
    interests: List[str] = []
    goals: List[str] = []
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    @classmethod
    def from_profile(cls, profile):
        """Создаёт ProfileResponse из SQLAlchemy модели Profile"""
        return cls(
            id=profile.id,
            user_id=profile.user_id,
            username=profile.username,
            first_name=profile.first_name,
            last_name=profile.last_name,
            name=profile.name,
            gender=profile.gender,
            age=profile.age,
            city=profile.city,
            university=profile.university,
            interests=_normalize_list_field(profile.interests),
            goals=_normalize_list_field(profile.goals),
            bio=profile.bio,
            photo_url=profile.photo_url,
            created_at=profile.created_at,
            updated_at=profile.updated_at,
        )
    
    class Config:
        from_attributes = False
