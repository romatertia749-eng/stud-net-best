"""
Скрипт для запуска сервера разработки

Использование:
    python run.py
"""

import uvicorn
from config import settings

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,  # Автоперезагрузка при изменении кода
        log_level="info"
    )
