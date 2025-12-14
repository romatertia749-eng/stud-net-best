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
    """Сохранение загруженного файла с валидацией и оптимизацией"""
    # Проверка размера файла
    file.file.seek(0, 2)  # Переходим в конец файла
    file_size = file.file.tell()
    file.file.seek(0)  # Возвращаемся в начало
    
    if file_size > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400, 
            detail=f"File size exceeds {settings.MAX_FILE_SIZE_MB}MB. File size: {file_size / (1024*1024):.2f}MB"
        )
    
    if file_size == 0:
        raise HTTPException(status_code=400, detail="File is empty")
    
    # Проверка типа файла
    allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type: {file.content_type}. Allowed types: {', '.join(allowed_types)}"
        )
    
    # Проверка расширения файла
    file_ext = Path(file.filename).suffix.lower()
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.webp']
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file extension: {file_ext}. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Создаём уникальное имя файла
    timestamp = int(datetime.utcnow().timestamp() * 1000)  # Миллисекунды для уникальности
    filename = f"{user_id}_{timestamp}{file_ext}"
    file_path = UPLOAD_DIR / filename
    
    try:
        # Сохраняем файл
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Валидация и оптимизация изображения
        try:
            img = Image.open(file_path)
            img.verify()  # Проверяем, что файл действительно изображение
            
            # Открываем заново после verify (verify закрывает файл)
            img = Image.open(file_path)
            
            # Проверка размеров (защита от слишком больших изображений)
            max_dimension = 4000
            if img.width > max_dimension or img.height > max_dimension:
                # Масштабируем если слишком большое
                ratio = min(max_dimension / img.width, max_dimension / img.height)
                new_size = (int(img.width * ratio), int(img.height * ratio))
                img = img.resize(new_size, Image.Resampling.LANCZOS)
            
            # Конвертируем в RGB если нужно
            if img.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = background
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Сохраняем с оптимизацией
            img.save(file_path, 'JPEG', quality=85, optimize=True)
        except Exception as e:
            # Если оптимизация не удалась, удаляем файл
            if file_path.exists():
                file_path.unlink()
            raise HTTPException(
                status_code=400,
                detail=f"Invalid image file or corrupted image: {str(e)}"
            )
        
        # Возвращаем относительный путь
        return f"/uploads/{filename}"
    except HTTPException:
        raise
    except Exception as e:
        # Удаляем файл при любой другой ошибке
        if file_path.exists():
            try:
                file_path.unlink()
            except:
                pass
        raise HTTPException(
            status_code=500,
            detail=f"Error saving file: {str(e)}"
        )

def delete_file(file_path: str):
    """Удаление файла"""
    if file_path:
        full_path = Path(settings.UPLOAD_DIR) / Path(file_path).name
        if full_path.exists():
            full_path.unlink()
