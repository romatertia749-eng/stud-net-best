const DEFAULT_API_BASE_URL = 'https://unique-reptile-dk-it1-69845c61.koyeb.app'

export const API_ENDPOINTS = {
  AUTH: import.meta.env.VITE_API_BASE_URL 
    ? `${import.meta.env.VITE_API_BASE_URL}/api/auth`
    : `${DEFAULT_API_BASE_URL}/api/auth`,
}

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL

export default API_BASE_URL

