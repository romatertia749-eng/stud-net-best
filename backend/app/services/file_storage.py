"""
Сервис для работы с файлами
"""
from fastapi import UploadFile, HTTPException
from pathlib import Path
from datetime import datetime
import shutil
from PIL import Image
from config import settings

# Создание директории для загрузок
UPLOAD_DIR = Path(settings.UPLOAD_DIR)
UPLOAD_DIR.mkdir(exist_ok=True)

def save_uploaded_file(file: UploadFile, user_id: int) -> str:
    """Сохранение загруженного файла"""
    # Проверка размера файла
    file_size = 0
    file.file.seek(0, 2)  # Переходим в конец файла
    file_size = file.file.tell()
    file.file.seek(0)  # Возвращаемся в начало
    
    if file_size > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File size exceeds {settings.MAX_FILE_SIZE_MB}MB")
    
    # Проверка типа файла
    if file.content_type not in ['image/jpeg', 'image/png', 'image/webp']:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG, PNG, WebP allowed")
    
    # Создаём уникальное имя файла
    file_ext = Path(file.filename).suffix
    filename = f"{user_id}_{datetime.utcnow().timestamp()}{file_ext}"
    file_path = UPLOAD_DIR / filename
    
    # Сохраняем файл
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Оптимизируем изображение
    try:
        img = Image.open(file_path)
        # Конвертируем в RGB если нужно
        if img.mode in ('RGBA', 'LA', 'P'):
            img = img.convert('RGB')
        # Сохраняем с оптимизацией
        img.save(file_path, 'JPEG', quality=85, optimize=True)
    except Exception as e:
        print(f"Error optimizing image: {e}")
    
    # Возвращаем относительный путь
    return f"/uploads/{filename}"

def delete_file(file_path: str):
    """Удаление файла"""
    if file_path:
        full_path = Path(settings.UPLOAD_DIR) / Path(file_path).name
        if full_path.exists():
            full_path.unlink()
