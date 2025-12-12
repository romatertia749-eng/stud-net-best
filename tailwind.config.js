/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Место для подключения кастомного шрифта LaBambaStd в будущем
        // labamba: ['LaBambaStd', 'sans-serif'],
      },
      colors: {
        // Можно добавить кастомные цвета для проекта
      },
    },
  },
  plugins: [],
}

