import API_BASE_URL from '../config/api'

const TOKEN_KEY = 'jwt_token'

export const getAuthToken = () => {
  return localStorage.getItem(TOKEN_KEY)
}

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export const clearAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY)
}

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

export const apiRequest = async (endpoint, options = {}) => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`
  
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  }
  
  if (options.body instanceof FormData && headers['Content-Type']) {
    delete headers['Content-Type']
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
    mode: options.mode || 'cors',
    credentials: 'include',
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ 
      message: `HTTP error! status: ${response.status}` 
    }))
    throw new Error(error.message || `HTTP error! status: ${response.status}`)
  }
  
  return response.json()
}

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

export default api

