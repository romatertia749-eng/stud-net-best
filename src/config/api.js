/**
 * Конфигурация API
 * 
 * Содержит базовый URL API и все эндпоинты приложения
 */

// URL бэкенда по умолчанию (используется если не задан в переменных окружения)
const DEFAULT_API_BASE_URL = 'https://unique-reptile-dk-it1-69845c61.koyeb.app'

// Базовый URL API (из переменных окружения или дефолтный)
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL

/**
 * Все эндпоинты API приложения
 */
export const API_ENDPOINTS = {
  AUTH: `${API_BASE_URL}/api/auth`, // Авторизация через Telegram
  PROFILES: `${API_BASE_URL}/api/profiles`, // Список профилей / создание профиля
  PROFILE_BY_ID: (id) => `${API_BASE_URL}/api/profiles/${id}`, // Профиль по ID
  PROFILE_BY_USER_ID: (userId) => `${API_BASE_URL}/api/profiles/user/${userId}`, // Профиль по user_id
  LIKE_PROFILE: (id) => `${API_BASE_URL}/api/profiles/${id}/like`, // Лайк профиля
  PASS_PROFILE: (id) => `${API_BASE_URL}/api/profiles/${id}/pass`, // Пропуск профиля
  INCOMING_LIKES: `${API_BASE_URL}/api/profiles/incoming-likes`, // Входящие лайки
  RESPOND_TO_LIKE: `${API_BASE_URL}/api/profiles/respond-to-like`, // Ответ на входящий лайк
}

/**
 * Формирует полный URL для фотографии
 * Если путь уже полный URL - возвращает как есть
 * Иначе добавляет базовый URL API
 */
export const getPhotoUrl = (photoPath) => {
  if (!photoPath) return null
  if (photoPath.startsWith('http')) return photoPath // Уже полный URL
  return `${API_BASE_URL}${photoPath.startsWith('/') ? '' : '/'}${photoPath}`
}

export default API_BASE_URL

