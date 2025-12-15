# Max Networking App

Telegram Mini App для студенческого нетворкинга.

## Технологии

- React 19.2.0
- React Router DOM 7.9.5
- Framer Motion 12.23.24
- Tailwind CSS 3.4.18
- Telegram Web App SDK (@twa-dev/sdk)

## Установка

```bash
npm install
```

## Запуск проекта

```bash
npm run dev
```

## Сборка

```bash
npm run build
```

## Структура проекта

```
max-networking-app/
├── src/
│   ├── components/     # React компоненты
│   ├── pages/         # Страницы приложения
│   ├── contexts/      # React Context API
│   ├── config/        # Конфигурационные файлы
│   ├── data/          # Статические данные
│   ├── utils/         # Вспомогательные функции
│   ├── fonts/         # Шрифты (включая LaBambaStd)
│   ├── App.jsx
│   ├── index.js
│   └── index.css
├── public/
│   ├── assets/
│   ├── fonts/
│   ├── index.html
│   ├── manifest.json
│   └── robots.txt
└── ...
```

## Подключение шрифта LaBambaStd

Для подключения кастомного шрифта LaBambaStd:

1. Поместите файлы шрифта в `src/fonts/` или `public/fonts/`
2. Добавьте `@font-face` в `src/index.css`
3. Раскомментируйте и настройте `fontFamily.labamba` в `tailwind.config.js`

## Perf checklist

- Где искать URLs: фронт `src/config/api.js` (`VITE_API_BASE_URL` или дефолт), бэк `backend/config.py` (`DATABASE_URL`, `CORS_ORIGINS`, `HOST/PORT`).
- Измерить p95/p99:
  - `curl -w "time_total: %{time_total}\n" -o NUL -s https://your-api/api/health` (Windows) / `-o /dev/null` (Linux/Mac) в цикле 50-100 раз.
  - `ab -n 200 -c 10 https://your-api/api/profiles?user_id=1` или k6 script для целевых эндпоинтов.
  - Смотри логи бэка: middleware пишет p50/p95 каждые 50 запросов.
- CPU/RAM/IO:
  - Linux: `top`, `htop`, `vmstat 1`, `iostat -xz 1`.
  - Windows: `Get-Counter '\Processor(_Total)\% Processor Time' -Continuous`, `Get-Counter '\Memory\Available MBytes'`, `typeperf "\PhysicalDisk(*)\% Idle Time"`.
- RTT между сервисами: `ping`/`curl -w "%{time_connect}"` фронт→бэк; `psql "..." -c "select 1"` с `\timing` бэк→БД.
- Статика/кеш/сжатие:
  - CDN: включи для `dist/assets` (Netlify/Vercel умеют; примеры в `vercel.json`, `netlify.toml`).
  - Кеш: бандлы уже с хэшами; выставляй `Cache-Control: public, max-age=31536000, immutable` для `/assets/*` (см. `vercel.json`), аналогично настроить в CDN/хостинге.
  - Сжатие: бэк включает GZip (FastAPI middleware). Для фронта — проверь включён ли Gzip/Brotli на CDN/хостинге.
- Фронтенд сборка:
  - `vite.config.js` настроен на minify/treeshake/splitChunks (vendor chunk). Используй версионированные бандлы (по умолчанию с hash).
  - Добавь route-level lazy-load для тяжёлых страниц, если бандл >1.5 МБ.
- Бэкенд:
  - Лимиты процесса: для uvicorn/async — масштабируй воркеры по CPU, следи за RAM (можно задавать `--workers` и `--limit-max-requests`).
  - Подключения к БД: SQLAlchemy QueuePool (10/20 overflow); правь в `backend/app/database.py` при необходимости.
  - Лог латентности уже включён; собирай p95/p99 из логов или через внешние APM.
- База данных (Postgres):
  - Индексы в `schema.sql` и `migrations/001_add_performance_indexes.sql`; прогоняй миграции после деплоя.
  - Для тяжёлых запросов собирай `EXPLAIN ANALYZE` и добавляй недостающие индексы по фактическим фильтрам/джоинам.
  - Контроль пула: держи 10–20 коннектов на инстанс API; не превышай лимит БД.
- Сеть/архитектура:
  - Деплой в один регион для фронт/бэк/БД, включи HTTP/2 и keep-alive на прокси.
- Быстрый прогон перед релизом:
  1) `npm run build` (фронт) → убедись, что dist < разумного размера, assets с хэшами.
  2) Smoke `curl -w` на health и 1–2 жирных эндпоинта.
  3) Проверка индексов: `psql ... -f migrations/001_add_performance_indexes.sql`.
  4) Проверка логов бэка: p95 не выходит за SLA, нет ошибок пула/коннектов.

