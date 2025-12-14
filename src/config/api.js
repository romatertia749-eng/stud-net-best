const DEFAULT_API_BASE_URL = 'https://unique-reptile-dk-it1-69845c61.koyeb.app'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL

export const API_ENDPOINTS = {
  AUTH: `${API_BASE_URL}/api/auth`,
  PROFILES: `${API_BASE_URL}/api/profiles`,
  PROFILE_BY_ID: (id) => `${API_BASE_URL}/api/profiles/${id}`,
  PROFILE_BY_USER_ID: (userId) => `${API_BASE_URL}/api/profiles/user/${userId}`,
  LIKE_PROFILE: (id) => `${API_BASE_URL}/api/profiles/${id}/like`,
  PASS_PROFILE: (id) => `${API_BASE_URL}/api/profiles/${id}/pass`,
  INCOMING_LIKES: `${API_BASE_URL}/api/profiles/incoming-likes`,
  RESPOND_TO_LIKE: `${API_BASE_URL}/api/profiles/respond-to-like`,
}

export const getPhotoUrl = (photoPath) => {
  if (!photoPath) return null
  if (photoPath.startsWith('http')) return photoPath
  return `${API_BASE_URL}${photoPath.startsWith('/') ? '' : '/'}${photoPath}`
}

export default API_BASE_URL

