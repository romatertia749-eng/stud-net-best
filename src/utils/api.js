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
 * Базовая функция для выполнения запросов к API с retry логикой
 * Автоматически добавляет авторизацию и обрабатывает ошибки
 */
export const apiRequest = async (endpoint, options = {}, retryCount = 0) => {
  const maxRetries = options.maxRetries ?? 2
  const retryDelay = options.retryDelay ?? 1000
  const timeout = options.timeout ?? 30000
  
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
  
  try {
    // Создаём AbortController для таймаута
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    const response = await fetch(url, {
      ...options,
      headers,
      mode: options.mode || 'cors',
      credentials: 'include',
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)
    
    // Обработка ошибок
    if (!response.ok) {
      // Если 401, очищаем токен
      if (response.status === 401) {
        clearAuthToken()
        throw new Error('Unauthorized. Please login again.')
      }
      
      let errorData
      try {
        errorData = await response.json()
      } catch {
        errorData = { 
          detail: response.statusText || `HTTP error! status: ${response.status}` 
        }
      }
      
      const errorMessage = errorData.detail || errorData.message || `HTTP error! status: ${response.status}`
      
      // Retry для 5xx ошибок
      if (response.status >= 500 && retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1)))
        return apiRequest(endpoint, options, retryCount + 1)
      }
      
      const error = new Error(errorMessage)
      error.status = response.status
      error.data = errorData
      throw error
    }
    
    return response.json()
  } catch (error) {
    // Retry для сетевых ошибок и таймаутов
    if (
      (error.name === 'AbortError' || error.name === 'TypeError' || error.message.includes('fetch')) &&
      retryCount < maxRetries
    ) {
      await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1)))
      return apiRequest(endpoint, options, retryCount + 1)
    }
    
    if (error.name === 'AbortError') {
      throw new Error('Request timeout. Please check your connection and try again.')
    }
    
    throw error
  }
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


