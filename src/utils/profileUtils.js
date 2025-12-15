import { getPhotoUrl } from '../config/api'

/**
 * Парсит поле профиля (interests или goals) из JSON строки или массива
 * @param {string|Array} field - поле для парсинга
 * @returns {Array} - массив значений
 */
export const parseProfileField = (field) => {
  if (!field) return []
  if (Array.isArray(field)) return field
  if (typeof field === 'string') {
    try {
      const parsed = JSON.parse(field)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

/**
 * Обрабатывает профиль: парсит JSON поля и формирует объект с правильными типами
 * @param {Object} profile - сырой профиль с сервера
 * @returns {Object} - обработанный профиль
 */
export const processProfile = (profile) => {
  if (!profile) return null
  
  return {
    ...profile,
    interests: parseProfileField(profile.interests),
    goals: parseProfileField(profile.goals),
    photos: profile.photo_url ? [getPhotoUrl(profile.photo_url)] : []
  }
}

/**
 * Обрабатывает массив профилей
 * @param {Array} profiles - массив сырых профилей
 * @returns {Array} - массив обработанных профилей
 */
export const processProfiles = (profiles) => {
  if (!Array.isArray(profiles)) return []
  return profiles.map(processProfile).filter(Boolean)
}

