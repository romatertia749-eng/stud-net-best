/**
 * Утилиты для работы с API
 * 
 * Предоставляет функции для:
 * - Работы с JWT токеном
 * - Выполнения авторизованных запросов к API
 */

import API_BASE_URL from '../config/api'

const TOKEN_KEY = 'jwt_token' // Ключ для хранения токена в localStorage

/**
 * Получает JWT токен из localStorage
 */
export const getAuthToken = () => {
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * Сохраняет JWT токен в localStorage
 */
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

/**
 * Удаляет JWT токен из localStorage
 */
export const clearAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * Формирует заголовки для авторизованных запросов
 * Добавляет Authorization заголовок с токеном, если он есть
 */
const getAuthHeaders = () => {
  const token = getAuthToken()
  const headers = {
    'Content-Type': 'application/json',
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  return headers
}

/**
 * Базовая функция для выполнения запросов к API
 * Автоматически добавляет авторизацию и обрабатывает ошибки
 */
export const apiRequest = async (endpoint, options = {}) => {
  // Если endpoint уже полный URL, используем его, иначе добавляем базовый URL
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`
  
  const headers = {
    ...getAuthHeaders(), // Добавляем авторизацию
    ...(options.headers || {}),
  }
  
  // Для FormData не нужно указывать Content-Type (браузер сам установит)
  if (options.body instanceof FormData && headers['Content-Type']) {
    delete headers['Content-Type']
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
    mode: options.mode || 'cors',
    credentials: 'include',
  })
  
  // Обработка ошибок
  if (!response.ok) {
    const error = await response.json().catch(() => ({ 
      message: `HTTP error! status: ${response.status}` 
    }))
    throw new Error(error.message || `HTTP error! status: ${response.status}`)
  }
  
  return response.json()
}

/**
 * Объект с методами для работы с API (GET, POST, PUT, DELETE)
 */
export const api = {
  get: (endpoint, options = {}) => apiRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, data, options = {}) => apiRequest(endpoint, {
    ...options,
    method: 'POST',
    body: data instanceof FormData ? data : JSON.stringify(data),
  }),
  put: (endpoint, data, options = {}) => apiRequest(endpoint, {
    ...options,
    method: 'PUT',
    body: data instanceof FormData ? data : JSON.stringify(data),
  }),
  delete: (endpoint, options = {}) => apiRequest(endpoint, { ...options, method: 'DELETE' }),
}

/**
 * Упрощённая функция для выполнения авторизованных fetch запросов
 * Используется когда нужен полный контроль над запросом (например, для обработки таймаутов)
 */
export const fetchWithAuth = async (url, options = {}) => {
  const token = getAuthToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  // Формируем полный URL
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`
  
  return fetch(fullUrl, {
    ...options,
    headers,
    mode: options.mode || 'cors',
    credentials: 'include',
  })
}

export default api


