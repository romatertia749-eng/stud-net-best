import { createContext, useContext, useState } from 'react'

/**
 * MatchContext - контекст для управления мэтчами (взаимными лайками)
 * 
 * Предоставляет:
 * - matches - список мэтчей
 * - addMatch - добавить мэтч
 * - removeMatch - удалить мэтч
 */
const MatchContext = createContext(null)

/**
 * Хук для использования MatchContext
 */
export const useMatches = () => {
  const context = useContext(MatchContext)
  if (!context) {
    throw new Error('useMatches must be used within MatchProvider')
  }
  return context
}

/**
 * Провайдер контекста мэтчей
 * Управляет списком взаимных лайков
 */
export const MatchProvider = ({ children }) => {
  const [matches, setMatches] = useState([]) // Список мэтчей

  /**
   * Добавляет мэтч в список (если его ещё нет)
   */
  const addMatch = (profile) => {
    setMatches(prev => {
      // Проверяем, нет ли уже этого профиля в списке
      if (prev.some(m => m.id === profile.id)) {
        return prev
      }
      return [...prev, profile]
    })
  }

  /**
   * Удаляет мэтч из списка по ID
   */
  const removeMatch = (profileId) => {
    setMatches(prev => prev.filter(m => m.id !== profileId))
  }

  /**
   * Устанавливает список мэтчей (используется для загрузки с сервера)
   */
  const setMatchedProfilesFromServer = (profiles) => {
    setMatches(profiles)
  }

  return (
    <MatchContext.Provider value={{ matches, addMatch, removeMatch, setMatchedProfiles: setMatchedProfilesFromServer }}>
      {children}
    </MatchContext.Provider>
  )
}

