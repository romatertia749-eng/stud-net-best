# ⚡ Быстрый деплой на Koyeb

## 🎯 Минимальные шаги

### 1. Создай приложение в Koyeb
- **Source**: GitHub репозиторий
- **Branch**: `master` или `main`
- **Root Directory**: `backend/` (если бэкенд в подпапке)
- **Run Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### 2. Environment Variables (Settings → Environment Variables)

```bash
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
JWT_SECRET=твой-секретный-ключ-минимум-32-символа
CORS_ORIGINS=https://твой-фронтенд.netlify.app
```

### 3. Создай PostgreSQL Database в Koyeb
- Скопируй Connection String → вставь как `DATABASE_URL`

### 4. Проверь деплой
```
https://твой-домен.koyeb.app/health
```

## ❌ Частые ошибки

| Ошибка | Решение |
|--------|---------|
| Module not found | Проверь Root Directory = `backend/` |
| Port error | Run Command: `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Database connection | Проверь `DATABASE_URL` (должен быть `?sslmode=require`) |
| CORS error | Проверь `CORS_ORIGINS` (точный URL без слеша) |
| JWT error | Установи `JWT_SECRET` (минимум 32 символа) |

## 📋 Чеклист

- [ ] `DATABASE_URL` установлен
- [ ] `JWT_SECRET` установлен (32+ символов)
- [ ] `CORS_ORIGINS` = URL фронтенда
- [ ] Run Command правильный
- [ ] Root Directory = `backend/` (если нужно)
- [ ] База данных создана

## 🔍 Логи

В Koyeb Dashboard → Apps → [твоё приложение] → Logs

Ищи:
- ✅ `DATABASE_URL загружен`
- ✅ `JWT_SECRET_KEY загружен`
- ✅ `CORS_ORIGINS загружен`

---

**Полный гайд**: см. `KOYEB_DEPLOY.md`



