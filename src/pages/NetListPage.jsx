import { useState, useEffect, useMemo, memo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card } from '../components'
import { useMatches } from '../contexts/MatchContext'
import { useWebApp } from '../contexts/WebAppContext'
import { API_ENDPOINTS, getPhotoUrl } from '../config/api'
import { getAuthToken } from '../utils/api'

// Мемоизированная карточка профиля для предотвращения лишних ре-рендеров при скролле
const MatchCard = memo(({ person, onViewProfile, onMessage }) => (
  <div 
    className="p-4 rounded-2xl bg-white/20 border border-white/30"
    style={{ contain: 'layout style paint' }}
  >
    <div className="flex items-start gap-3 mb-3">
      {person.photos && person.photos.length > 0 && person.photos[0] ? (
        <img
          src={person.photos[0]}
          alt={person.name}
          className="w-16 h-16 rounded-full object-cover flex-shrink-0"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.target.style.display = 'none'
          }}
        />
      ) : (
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 border border-white/40">
          <span className="text-2xl">👤</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-800 mb-1">{person.name}, {person.age}</h3>
        <p className="text-xs text-gray-500 mb-2">{person.city} • {person.university}</p>
        {person.bio && (
          <p className="text-sm text-gray-800 leading-relaxed line-clamp-2">{person.bio}</p>
        )}
        {person.interests && person.interests.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {person.interests.slice(0, 3).map((interest, index) => (
              <span
                key={index}
                className="px-2 py-0.5 bg-white/20 text-teal-700 rounded text-xs border border-white/40"
              >
                {interest}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>

    <div className="flex flex-col gap-2">
      <Button
        variant="secondary"
        onClick={() => onViewProfile(person.id)}
        className="w-full text-sm py-2 min-h-[40px]"
      >
        Посмотреть профиль
      </Button>
      {person.username ? (
        <Button
          variant="primary"
          onClick={() => onMessage(person.username)}
          className="w-full text-sm py-2 min-h-[40px]"
        >
          💬 Написать
        </Button>
      ) : (
        <p className="text-xs text-gray-500 text-center py-2">
          Username не указан
        </p>
      )}
    </div>
  </div>
))

MatchCard.displayName = 'MatchCard'

const NetListPage = () => {
  const navigate = useNavigate()
  const { matches: contextMatches, setMatchedProfiles: setContextMatchedProfiles } = useMatches()
  const { user } = useWebApp()
  const [matchedProfiles, setMatchedProfiles] = useState([])
  const [loading, setLoading] = useState(false)

  // Используем useRef для отслеживания, загружались ли уже данные
  const hasLoadedRef = useRef(false)
  const lastUserIdRef = useRef(null)
  const activeRequestsRef = useRef(0)

  useEffect(() => {
    // Загружаем мэтчи сразу, не ждем проверку профиля
    if (!user?.id) {
      setLoading(false)
      return
    }

    // Проверяем, нужно ли загружать данные
    const userId = user.id
    if (hasLoadedRef.current && lastUserIdRef.current === userId) {
      // Данные уже загружены для этого пользователя
      return
    }

    let isMounted = true
    let controller = null

    const fetchMatches = async () => {
      activeRequestsRef.current += 1
      const requestId = activeRequestsRef.current
      
      if (!isMounted) {
        activeRequestsRef.current = Math.max(0, activeRequestsRef.current - 1)
        return
      }
      
      setLoading(true)
      
      try {
        controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000)
        
        // Используем endpoint для получения мэтчей (взаимных лайков)
        const url = `${API_ENDPOINTS.MATCHES}?user_id=${userId}`
        
        const token = getAuthToken()
        const headers = {
          'Content-Type': 'application/json',
        }
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
        
        const response = await fetch(url, {
          signal: controller.signal,
          headers,
        })
        
        clearTimeout(timeoutId)
        
        if (!isMounted) return
        
        if (response.ok) {
          const data = await response.json()
          
          if (!Array.isArray(data)) {
            setMatchedProfiles([])
            setLoading(false)
            hasLoadedRef.current = true
            lastUserIdRef.current = userId
            return
          }
          
          // Преобразуем данные из API в формат для отображения
          const formattedMatches = data.map((profile) => {
            // Безопасная обработка interests
            let interestsArray = []
            if (profile?.interests) {
              if (Array.isArray(profile.interests)) {
                interestsArray = profile.interests
              } else if (typeof profile.interests === 'string') {
                try {
                  interestsArray = JSON.parse(profile.interests)
                } catch (e) {
                  interestsArray = []
                }
              }
            }
            
            // Безопасная обработка goals
            let goalsArray = []
            if (profile?.goals) {
              if (Array.isArray(profile.goals)) {
                goalsArray = profile.goals
              } else if (typeof profile.goals === 'string') {
                try {
                  goalsArray = JSON.parse(profile.goals)
                } catch (e) {
                  goalsArray = []
                }
              }
            }
            
            const formatted = {
              id: profile?.id,
              userId: profile?.user_id || profile?.id,
              name: profile?.name || '',
              age: profile?.age || 0,
              city: profile?.city || '',
              university: profile?.university || '',
              bio: profile?.bio || '',
              interests: interestsArray,
              goals: goalsArray,
              photos: profile?.photo_url ? [getPhotoUrl(profile.photo_url)] : [],
              username: profile?.username || null,
            }
            
            return formatted
          }).filter(match => match !== null)
          
          if (isMounted) {
            setMatchedProfiles(formattedMatches)
            // Обновляем контекст с мэтчами
            if (formattedMatches.length > 0 && setContextMatchedProfiles) {
              setContextMatchedProfiles(formattedMatches)
            }
            hasLoadedRef.current = true
            lastUserIdRef.current = userId
          }
        } else {
          if (isMounted) {
            setMatchedProfiles([])
            hasLoadedRef.current = true
            lastUserIdRef.current = userId
          }
        }
      } catch (error) {
        if (!isMounted) {
          activeRequestsRef.current = Math.max(0, activeRequestsRef.current - 1)
          return
        }
        
        if (error.name === 'AbortError') {
          console.warn('[NetListPage] Request timeout')
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
          console.error('[NetListPage] Network error - backend not reachable:', error)
        } else {
          console.error('[NetListPage] Error fetching matches:', error)
        }
        setMatchedProfiles([])
        hasLoadedRef.current = true
        lastUserIdRef.current = userId
      } finally {
        activeRequestsRef.current = Math.max(0, activeRequestsRef.current - 1)
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    
    fetchMatches()
    
    return () => {
      isMounted = false
      if (controller) {
        controller.abort()
      }
    }
  }, [user?.id, setContextMatchedProfiles])

  // Используем данные из контекста, если они есть и локальные данные пусты
  useEffect(() => {
    if (contextMatches && contextMatches.length > 0 && matchedProfiles.length === 0 && !loading) {
      setMatchedProfiles(contextMatches)
    }
  }, [contextMatches, matchedProfiles.length, loading])

  // Мемоизированные обработчики для предотвращения пересоздания при каждом рендере
  const handleViewProfile = useCallback((id) => {
    navigate(`/user/${id}`)
  }, [navigate])

  const handleMessage = useCallback((username) => {
    const cleanUsername = username.replace('@', '').trim()
    if (cleanUsername) {
      window.open(`https://t.me/${cleanUsername}`, '_blank')
    } else {
      alert('Username не указан')
    }
  }, [])

  // Мемоизированный список карточек
  const renderedCards = useMemo(() => 
    matchedProfiles.map((person) => (
      <MatchCard 
        key={person.id || person.userId} 
        person={person} 
        onViewProfile={handleViewProfile}
        onMessage={handleMessage}
      />
    )), 
    [matchedProfiles, handleViewProfile, handleMessage]
  )

  if (loading) {
    return (
      <div className="min-w-[320px] min-h-[600px] max-w-4xl w-full mx-auto p-4 md:p-6 pb-20 md:pb-6 page-gradient" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
        <div className="space-y-4 mt-4">
          <Card>
            <p className="text-gray-800 text-center py-8 font-medium">
              Загрузка мэтчей...
            </p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-w-[320px] min-h-[600px] max-w-4xl w-full mx-auto p-4 md:p-6 pb-20 md:pb-6 page-gradient" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
      <div className="space-y-4 mt-4">
        <Card>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Net-Лист</h2>
          {matchedProfiles.length === 0 ? (
            <p className="text-gray-800 text-center py-8 font-medium">
              У вас пока нет контактов.
              <br />
              Начните знакомиться!
            </p>
          ) : (
            <div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              style={{ contain: 'layout style' }}
            >
              {renderedCards}
            </div>
          )}
        </Card>

        <Button variant="outline" onClick={() => navigate('/profiles')}>
          Найти новых знакомых
        </Button>
      </div>
    </div>
  )
}

export default NetListPage
