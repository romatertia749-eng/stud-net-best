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

