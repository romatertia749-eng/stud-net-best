"""
Общие Pydantic модели для API
"""
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator
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

class ProfileCreateRequest(BaseModel):
    """Модель для создания/обновления профиля"""
    name: str = Field(..., min_length=1, max_length=255, description="Имя пользователя")
    gender: str = Field(..., pattern="^(male|female|other)$", description="Пол")
    age: int = Field(..., ge=15, le=50, description="Возраст")
    city: str = Field(..., min_length=1, max_length=255, description="Город")
    university: str = Field(..., min_length=1, max_length=255, description="Университет")
    interests: str = Field(..., description="JSON массив интересов")
    goals: str = Field(..., description="JSON массив целей")
    username: Optional[str] = Field(None, max_length=255)
    first_name: Optional[str] = Field(None, max_length=255)
    last_name: Optional[str] = Field(None, max_length=255)
    bio: Optional[str] = Field(None, max_length=300, description="Биография (максимум 300 символов)")
    
    @field_validator('interests', 'goals')
    @classmethod
    def validate_json_array(cls, v):
        """Валидирует, что строка является валидным JSON массивом"""
        if not v:
            return "[]"
        try:
            parsed = json.loads(v)
            if not isinstance(parsed, list):
                raise ValueError("Must be a JSON array")
            return v
        except json.JSONDecodeError:
            raise ValueError("Invalid JSON format")
    
    @field_validator('bio')
    @classmethod
    def validate_bio_length(cls, v):
        """Валидирует длину биографии"""
        if v and len(v) > 300:
            raise ValueError("Bio must be 300 characters or less")
        return v
