import { createContext, useContext, useState } from 'react'

const MatchContext = createContext(null)

export const useMatches = () => {
  const context = useContext(MatchContext)
  if (!context) {
    throw new Error('useMatches must be used within MatchProvider')
  }
  return context
}

export const MatchProvider = ({ children }) => {
  const [matches, setMatches] = useState([])

  const addMatch = (profile) => {
    setMatches(prev => {
      if (prev.some(m => m.id === profile.id)) {
        return prev
      }
      return [...prev, profile]
    })
  }

  const removeMatch = (profileId) => {
    setMatches(prev => prev.filter(m => m.id !== profileId))
  }

  return (
    <MatchContext.Provider value={{ matches, addMatch, removeMatch }}>
      {children}
    </MatchContext.Provider>
  )
}

