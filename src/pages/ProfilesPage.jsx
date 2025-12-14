import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, Autocomplete, EffectOverlay } from '../components'
import { russianCities, universities, interests } from '../data/formData'
import { useMatches } from '../contexts/MatchContext'
import { useWebApp } from '../contexts/WebAppContext'
import { API_ENDPOINTS, getPhotoUrl } from '../config/api'
import { fetchWithAuth } from '../utils/api'

const ProfilesPage = () => {
  const { addMatch } = useMatches()
  const { user, isLoading: isWebAppLoading } = useWebApp()
  const userInfo = user
  
  const [currentIndex, setCurrentIndex] = useState(0)
  const [swipedProfiles, setSwipedProfiles] = useState([])
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedUniversity, setSelectedUniversity] = useState('')
  const [selectedInterests, setSelectedInterests] = useState([])
  const [showFilters, setShowFilters] = useState(false)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [allProfiles, setAllProfiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [showSwipeTutorial, setShowSwipeTutorial] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [incomingLikes, setIncomingLikes] = useState([])
  const [loadingIncoming, setLoadingIncoming] = useState(false)
  const [incomingError, setIncomingError] = useState(null)
  const [showIncomingTip, setShowIncomingTip] = useState(false)
  
  const [isEffectActive, setIsEffectActive] = useState(false)
  const [effectDirection, setEffectDirection] = useState(null)
  const [pendingIndexChange, setPendingIndexChange] = useState(null)
  const [lastSwipeDirection, setLastSwipeDirection] = useState(null)
  
  const cardRef = useRef(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const touchEndX = useRef(0)
  const touchEndY = useRef(0)
  const isProcessingSwipe = useRef(false)
  const rafId = useRef(null)

  const isReady = !isWebAppLoading

  useEffect(() => {
    const lastUserId = localStorage.getItem('last_user_id')
    if (lastUserId) {
      const cacheKey = `profiles_${lastUserId}`
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        try {
          const cachedData = JSON.parse(cached)
          if (cachedData.expires > Date.now() && Array.isArray(cachedData.profiles)) {
            const processedProfiles = cachedData.profiles.map(profile => {
              let interestsArray = []
              if (profile.interests) {
                if (Array.isArray(profile.interests)) {
                  interestsArray = profile.interests
                } else if (typeof profile.interests === 'string') {
                  try { interestsArray = JSON.parse(profile.interests) } catch (e) { interestsArray = [] }
                }
              }
              
              let goalsArray = []
              if (profile.goals) {
                if (Array.isArray(profile.goals)) {
                  goalsArray = profile.goals
                } else if (typeof profile.goals === 'string') {
                  try { goalsArray = JSON.parse(profile.goals) } catch (e) { goalsArray = [] }
                }
              }
              
              return {
                ...profile,
                interests: interestsArray,
                goals: goalsArray,
                photos: profile.photo_url ? [getPhotoUrl(profile.photo_url)] : []
              }
            })
            setAllProfiles(processedProfiles)
            setCurrentIndex(0)
            setSwipedProfiles([])
            setLoading(false)
          }
        } catch (e) {
          localStorage.removeItem(cacheKey)
        }
      }
    }
  }, [])

  useEffect(() => {
    if (!isReady) return
    
    const hasSeenTutorial = localStorage.getItem('maxnet_swipe_tutorial_seen')
    if (!hasSeenTutorial) {
      setShowSwipeTutorial(true)
    }
  }, [isReady])

  useEffect(() => {
    if (showSwipeTutorial) {
      document.body.style.overflow = 'hidden'
      const header = document.querySelector('header')
      const bottomNav = document.querySelector('nav')
      if (header) header.style.display = 'none'
      if (bottomNav) bottomNav.style.display = 'none'
    } else {
      document.body.style.overflow = ''
      const header = document.querySelector('header')
      const bottomNav = document.querySelector('nav')
      if (header) header.style.display = ''
      if (bottomNav) bottomNav.style.display = ''
    }
    
    return () => {
      document.body.style.overflow = ''
      const header = document.querySelector('header')
      const bottomNav = document.querySelector('nav')
      if (header) header.style.display = ''
      if (bottomNav) bottomNav.style.display = ''
    }
  }, [showSwipeTutorial])

  const fetchIncomingLikes = async () => {
    if (!userInfo?.id) return
    
    setLoadingIncoming(true)
    setIncomingError(null)
    setIncomingLikes([])
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4000)
      
      const url = `${API_ENDPOINTS.INCOMING_LIKES}?user_id=${userInfo.id}`
      const response = await fetchWithAuth(url, {
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
        
      if (response.ok) {
        const data = await response.json()
        const profiles = Array.isArray(data.content) ? data.content : (Array.isArray(data) ? data : [])
        
        const processedProfiles = profiles.map(profile => {
          let interestsArray = []
          if (profile.interests) {
            if (Array.isArray(profile.interests)) {
              interestsArray = profile.interests
            } else if (typeof profile.interests === 'string') {
              try { interestsArray = JSON.parse(profile.interests) } catch (e) { interestsArray = [] }
            }
          }
          
          let goalsArray = []
          if (profile.goals) {
            if (Array.isArray(profile.goals)) {
              goalsArray = profile.goals
            } else if (typeof profile.goals === 'string') {
              try { goalsArray = JSON.parse(profile.goals) } catch (e) { goalsArray = [] }
            }
          }
          
          return {
            ...profile,
            interests: interestsArray,
            goals: goalsArray,
            photos: profile.photo_url ? [getPhotoUrl(profile.photo_url)] : []
          }
        })
        
        setIncomingLikes(processedProfiles)
        setCurrentIndex(0)
        
        const hasSeenIncomingTip = localStorage.getItem('maxnet_incoming_tip_seen')
        if (!hasSeenIncomingTip && processedProfiles.length > 0) {
          setShowIncomingTip(true)
        }
      } else if (response.status === 404) {
        setIncomingLikes([])
        setIncomingError('not_implemented')
        setCurrentIndex(0)
      } else {
        setIncomingError('load_error')
        setIncomingLikes([])
        setCurrentIndex(0)
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        setIncomingError('timeout')
      } else {
        setIncomingError('network_error')
      }
      setIncomingLikes([])
      setCurrentIndex(0)
    } finally {
      setLoadingIncoming(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'incoming' && isReady && userInfo?.id) {
      setSwipedProfiles([])
      setIncomingLikes([])
      fetchIncomingLikes()
    }
  }, [activeTab, isReady, userInfo?.id])

  useEffect(() => {
    if (!isReady || !userInfo?.id) {
      if (!userInfo?.id) setLoading(false)
      return
    }
    
    if (activeTab === 'incoming') {
      return
    }
    
    let isMounted = true
    let controller = null
    
    const fetchProfiles = async () => {
      if (!isMounted) return
      
      const cacheKey = `profiles_${userInfo.id}`
      const cached = localStorage.getItem(cacheKey)
      let hasValidCache = false
      
      if (cached) {
        try {
          const cachedData = JSON.parse(cached)
          if (cachedData.expires > Date.now() && Array.isArray(cachedData.profiles)) {
            hasValidCache = true
            if (allProfiles.length === 0) {
              const processedProfiles = cachedData.profiles.map(profile => {
                let interestsArray = []
                if (profile.interests) {
                  if (Array.isArray(profile.interests)) {
                    interestsArray = profile.interests
                  } else if (typeof profile.interests === 'string') {
                    try { interestsArray = JSON.parse(profile.interests) } catch (e) { interestsArray = [] }
                  }
                }
                
                let goalsArray = []
                if (profile.goals) {
                  if (Array.isArray(profile.goals)) {
                    goalsArray = profile.goals
                  } else if (typeof profile.goals === 'string') {
                    try { goalsArray = JSON.parse(profile.goals) } catch (e) { goalsArray = [] }
                  }
                }
                
                return {
                  ...profile,
                  interests: interestsArray,
                  goals: goalsArray,
                  photos: profile.photo_url ? [getPhotoUrl(profile.photo_url)] : []
                }
              })
              setAllProfiles(processedProfiles)
              setCurrentIndex(0)
              setSwipedProfiles([])
            }
            setLoading(false)
          }
        } catch (e) {
          localStorage.removeItem(cacheKey)
        }
      }
      
      const baseUrl = API_ENDPOINTS.PROFILES.endsWith('/') 
        ? API_ENDPOINTS.PROFILES.slice(0, -1) 
        : API_ENDPOINTS.PROFILES
      const url = `${baseUrl}?user_id=${userInfo.id}&page=0&size=50`
      
      if (!hasValidCache) {
        setLoading(true)
      } else if (cached) {
        try {
          const cachedData = JSON.parse(cached)
          const cacheAge = Date.now() - (cachedData.expires - 10 * 60 * 1000)
          if (cacheAge < 60 * 1000) {
            return
          }
        } catch (e) {}
      }
      
      try {
        controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 4000)
        
        const response = await fetchWithAuth(url, {
          signal: controller.signal,
          mode: 'cors'
        })
        
        clearTimeout(timeoutId)
        
        if (!isMounted) {
          if (!hasValidCache) setLoading(false)
          return
        }
        
        if (response.ok) {
          let data
          try {
            data = await response.json()
          } catch (parseError) {
            if (!isMounted) return
            if (!hasValidCache) {
              setAllProfiles([])
              setLoading(false)
            }
            return
          }
          
          if (!isMounted) return
          
          let profiles = []
          if (Array.isArray(data)) {
            profiles = data
          } else if (Array.isArray(data.content)) {
            profiles = data.content
          } else if (data.content && typeof data.content === 'object') {
            profiles = [data.content]
          }
          
          if (isMounted) {
            if (profiles.length > 0) {
              const rawProfiles = profiles.map(p => ({ ...p }))
              localStorage.setItem(cacheKey, JSON.stringify({
                profiles: rawProfiles,
                expires: Date.now() + 10 * 60 * 1000
              }))
              localStorage.setItem('last_user_id', userInfo.id.toString())
              
              const processedProfiles = profiles.map(profile => {
                try {
                  let interestsArray = []
                  if (profile.interests) {
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
                  
                  let goalsArray = []
                  if (profile.goals) {
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
                  
                  return {
                    ...profile,
                    interests: interestsArray,
                    goals: goalsArray,
                    photos: profile.photo_url ? [getPhotoUrl(profile.photo_url)] : []
                  }
                } catch (error) {
                  return {
                    ...profile,
                    interests: [],
                    goals: [],
                    photos: profile.photo_url ? [getPhotoUrl(profile.photo_url)] : []
                  }
                }
              })
              setAllProfiles(processedProfiles)
              setCurrentIndex(0)
              setSwipedProfiles([])
            } else {
              if (!hasValidCache) {
                setAllProfiles([])
              }
            }
          }
        } else {
          if (!isMounted) return
          if (!hasValidCache) {
            setAllProfiles([])
          }
        }
      } catch (error) {
        if (!isMounted) return
        if (error.name === 'AbortError') {
          console.warn('Request timeout')
        } else {
          console.error('Error fetching profiles:', error)
        }
        if (!hasValidCache) {
          setAllProfiles([])
        }
      } finally {
        if (isMounted && !hasValidCache) {
          setLoading(false)
        }
      }
    }
    
    fetchProfiles()
    
    return () => {
      isMounted = false
      if (controller) {
        controller.abort()
      }
    }
  }, [isReady, userInfo?.id, activeTab, selectedCity, selectedUniversity, selectedInterests])

  const filteredProfiles = allProfiles

  const availableProfiles = useMemo(() => 
    filteredProfiles.filter(profile => !swipedProfiles.includes(profile.id)),
    [filteredProfiles, swipedProfiles]
  )

  const currentProfiles = activeTab === 'incoming' 
    ? (loadingIncoming ? [] : incomingLikes) 
    : availableProfiles
  
  const safeIndex = currentIndex >= 0 && currentIndex < currentProfiles.length ? currentIndex : 0
  const currentProfile = currentProfiles[safeIndex]
  
  useEffect(() => {
    setCurrentIndex(0)
    setSwipedProfiles([])
  }, [selectedCity, selectedUniversity, selectedInterests])
  
  useEffect(() => {
    if (allProfiles.length > 0) {
      setCurrentIndex(0)
      setSwipedProfiles([])
    }
  }, [allProfiles.length])

  useEffect(() => {
    if (availableProfiles.length > 0 && (currentIndex < 0 || currentIndex >= availableProfiles.length)) {
      setCurrentIndex(0)
    }
    if (availableProfiles.length > 0 && (currentIndex === undefined || currentIndex === null)) {
      setCurrentIndex(0)
    }
  }, [currentIndex, availableProfiles.length])

  const handleResetFilters = () => {
    setSelectedCity('')
    setSelectedUniversity('')
    setSelectedInterests([])
    setSwipedProfiles([])
    setCurrentIndex(0)
  }

  const handleEffectComplete = () => {
    setIsEffectActive(false)
    setEffectDirection(null)
    setSwipeOffset(0)
    
    if (pendingIndexChange !== null) {
      setCurrentIndex(pendingIndexChange)
      setPendingIndexChange(null)
    }
    
    isProcessingSwipe.current = false
    
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'instant' })
    })
  }

  const handleLike = async () => {
    if (isProcessingSwipe.current || isEffectActive || !currentProfile) return
    isProcessingSwipe.current = true
    
    let isMatched = false
    
    if (userInfo?.id) {
      try {
        if (activeTab === 'incoming') {
          const response = await fetchWithAuth(`${API_ENDPOINTS.RESPOND_TO_LIKE}?user_id=${userInfo.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              targetUserId: currentProfile.user_id || currentProfile.id,
              action: 'accept'
            }),
          })
          
          if (response.ok) {
            await response.json()
            isMatched = true
            setIncomingLikes(prev => prev.filter(p => p.id !== currentProfile.id))
          }
        } else {
          const response = await fetchWithAuth(API_ENDPOINTS.LIKE_PROFILE(currentProfile.id), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userInfo.id }),
          })
          
          if (response.ok) {
            const data = await response.json()
            if (data.matched) isMatched = true
          }
        }
      } catch (error) {
        console.error('Error liking profile:', error)
      }
    }
    
    if (isMatched) {
      addMatch(currentProfile)
      alert('Вы замэтчились! 🎉')
    } else if (!userInfo?.id) {
      addMatch(currentProfile)
    }
    
    if (activeTab !== 'incoming') {
      setSwipedProfiles(prev => [...prev, currentProfile.id])
    }
    
    const profilesLength = activeTab === 'incoming' 
      ? incomingLikes.length - 1 
      : availableProfiles.length - 1
    
    setCurrentIndex(prevIndex => {
      const nextIndex = prevIndex < profilesLength ? prevIndex + 1 : prevIndex
      
      setIsEffectActive(true)
      setEffectDirection('right')
      setLastSwipeDirection('right')
      setPendingIndexChange(activeTab === 'incoming' ? Math.min(prevIndex, Math.max(0, profilesLength - 1)) : nextIndex)
      
      return prevIndex
    })
  }

  const handlePass = async () => {
    if (isProcessingSwipe.current || isEffectActive || !currentProfile) return
    isProcessingSwipe.current = true
    
    if (userInfo?.id) {
      try {
        if (activeTab === 'incoming') {
          await fetchWithAuth(`${API_ENDPOINTS.RESPOND_TO_LIKE}?user_id=${userInfo.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              targetUserId: currentProfile.user_id || currentProfile.id,
              action: 'decline'
            }),
          })
          setIncomingLikes(prev => prev.filter(p => p.id !== currentProfile.id))
        } else {
          await fetchWithAuth(API_ENDPOINTS.PASS_PROFILE(currentProfile.id), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userInfo.id }),
          })
        }
      } catch (error) {
        console.error('Error passing profile:', error)
      }
    }
    
    if (activeTab !== 'incoming') {
      setSwipedProfiles(prev => [...prev, currentProfile.id])
    }
    
    const profilesLength = activeTab === 'incoming' 
      ? incomingLikes.length - 1 
      : availableProfiles.length - 1
    
    setCurrentIndex(prevIndex => {
      const nextIndex = prevIndex < profilesLength ? prevIndex + 1 : prevIndex
      
      setIsEffectActive(true)
      setEffectDirection('left')
      setLastSwipeDirection('left')
      setPendingIndexChange(activeTab === 'incoming' ? Math.min(prevIndex, Math.max(0, profilesLength - 1)) : nextIndex)
      
      return prevIndex
    })
  }

  const handleTouchStart = (e) => {
    if (isEffectActive || isProcessingSwipe.current) {
      e.preventDefault()
      return
    }
    
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    setSwipeOffset(0)
  }

  const handleTouchMove = (e) => {
    if (isEffectActive || !touchStartX.current || isProcessingSwipe.current) return
    
    if (rafId.current) {
      cancelAnimationFrame(rafId.current)
    }
    
    rafId.current = requestAnimationFrame(() => {
      touchEndX.current = e.touches[0].clientX
      touchEndY.current = e.touches[0].clientY
      
      const deltaX = touchEndX.current - touchStartX.current
      const deltaY = touchEndY.current - touchStartY.current
      
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        setSwipeOffset(deltaX)
      }
    })
    
    const deltaX = e.touches[0].clientX - touchStartX.current
    const deltaY = e.touches[0].clientY - touchStartY.current
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      e.preventDefault()
    }
  }

  const handleTouchEnd = () => {
    if (isEffectActive || isProcessingSwipe.current) {
      setSwipeOffset(0)
      touchStartX.current = 0
      touchStartY.current = 0
      touchEndX.current = 0
      touchEndY.current = 0
      return
    }
    
    if (!touchStartX.current || !touchEndX.current) {
      setSwipeOffset(0)
      return
    }
    
    const deltaX = touchEndX.current - touchStartX.current
    const deltaY = touchEndY.current - touchStartY.current
    const minSwipeDistance = 50

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX < 0) {
        handlePass()
      } else {
        handleLike()
      }
    } else {
      setSwipeOffset(0)
    }
    
    touchStartX.current = 0
    touchStartY.current = 0
    touchEndX.current = 0
    touchEndY.current = 0
  }

  if (loading) {
    return (
      <div className="min-h-screen page-gradient pb-20 pt-4">
        <div className="max-w-2xl mx-auto px-4">
          <Card>
            <p className="text-center text-gray-800 font-medium py-8">
              Загрузка профилей...
            </p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen page-gradient pb-20 pt-4">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => {
              setActiveTab('all')
              setCurrentIndex(0)
            }}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
              activeTab === 'all'
                ? 'bg-white/60 backdrop-blur-sm text-cyan-600 shadow-md border-2 border-cyan-400'
                : 'bg-white/30 backdrop-blur-sm text-gray-600'
            }`}
          >
            Все анкеты
          </button>
          <button
            onClick={() => {
              setActiveTab('incoming')
              setCurrentIndex(0)
            }}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all relative ${
              activeTab === 'incoming'
                ? 'bg-white/60 backdrop-blur-sm text-cyan-600 shadow-md border-2 border-cyan-400'
                : 'bg-white/30 backdrop-blur-sm text-gray-600'
            }`}
          >
            Входящие коннекты
            {incomingLikes.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-cyan-400 text-white text-xs font-bold rounded-full flex items-center justify-center px-1 shadow-lg"
                style={{ boxShadow: '0 0 8px rgba(0, 255, 255, 0.6)' }}
              >
                {incomingLikes.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'all' && (
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Анкеты</h2>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-3 py-1 text-sm text-gray-900 rounded-lg transition-all bg-white/20 backdrop-blur-md border border-white/40"
              >
                {showFilters ? 'Скрыть' : 'Фильтры'}
              </button>
            </div>

            {showFilters && (
              <div className="space-y-3 mt-4 pt-4 border-t border-white/30">
                {(selectedCity || selectedUniversity || selectedInterests.length > 0) && (
                  <button
                    onClick={handleResetFilters}
                    className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200 mb-2"
                  >
                    Сбросить фильтры
                  </button>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Город
                  </label>
                  <Autocomplete
                    options={russianCities}
                    value={selectedCity}
                    onChange={setSelectedCity}
                    placeholder="Выберите город..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Вуз
                  </label>
                  <Autocomplete
                    options={universities}
                    value={selectedUniversity}
                    onChange={setSelectedUniversity}
                    placeholder="Выберите вуз..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Интересы
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {interests.slice(0, 8).map((interest) => (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => {
                          if (selectedInterests.includes(interest)) {
                            setSelectedInterests(selectedInterests.filter(i => i !== interest))
                          } else {
                            setSelectedInterests([...selectedInterests, interest])
                          }
                        }}
                        className={`px-3 py-1 rounded-lg text-xs transition-all ${
                          selectedInterests.includes(interest)
                            ? 'text-white shadow-md'
                            : 'bg-white/20 backdrop-blur-md text-gray-700 border border-white/40 hover:bg-white/30'
                        }`}
                        style={selectedInterests.includes(interest) ? {
                          background: `linear-gradient(to right, rgba(0, 255, 255, 0.26), rgba(54, 207, 255, 0.32))`,
                          boxShadow: '0 4px 12px rgba(0, 255, 255, 0.3), 0 0 8px rgba(54, 207, 255, 0.2)',
                        } : {}}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {activeTab === 'incoming' && showIncomingTip && (
          <div className="p-3 bg-cyan-400/20 backdrop-blur-md rounded-xl border border-cyan-400/40 text-sm text-gray-800 mb-4">
            <div className="flex justify-between items-start gap-2">
              <p>💡 Эти люди уже лайкнули тебя! Свайп вправо — Connect, влево — пропустить.</p>
              <button 
                onClick={() => {
                  setShowIncomingTip(false)
                  localStorage.setItem('maxnet_incoming_tip_seen', 'true')
                }}
                className="text-gray-500 hover:text-gray-700 text-lg leading-none"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {activeTab === 'incoming' && (incomingError === 'load_error' || incomingError === 'network_error') && !loadingIncoming && (
          <Card>
            <div className="text-center py-8">
              <p className="text-gray-800 font-medium mb-4">
                {incomingError === 'network_error' ? 'Ошибка сети' : 'Не удалось загрузить'}
              </p>
              <button
                onClick={fetchIncomingLikes}
                className="px-4 py-2 bg-cyan-400/30 text-gray-900 rounded-lg border border-cyan-400/50"
                style={{ boxShadow: '0 0 10px rgba(0, 255, 255, 0.3)' }}
              >
                Повторить
              </button>
            </div>
          </Card>
        )}

        {activeTab === 'incoming' && !loadingIncoming && incomingLikes.length === 0 && 
         (incomingError === null || incomingError === 'not_implemented') && (
          <Card>
            <div className="text-center py-8">
              <p className="text-4xl mb-3">✨</p>
              <p className="text-gray-800 font-medium mb-4">
                {incomingError === 'not_implemented' 
                  ? 'Функция скоро будет доступна!'
                  : 'Пока никто не лайкнул тебя'}
              </p>
              {incomingError === 'not_implemented' && (
                <p className="text-xs text-gray-500 mb-4">Эндпоинт ещё не реализован на бэкенде</p>
              )}
              <button
                onClick={() => setActiveTab('all')}
                className="px-4 py-2 bg-cyan-400/30 text-gray-900 rounded-lg border border-cyan-400/50"
                style={{ boxShadow: '0 0 10px rgba(0, 255, 255, 0.3)' }}
              >
                Вернуться к анкетам
              </button>
            </div>
          </Card>
        )}

        {activeTab === 'all' && !loading && availableProfiles.length === 0 && allProfiles.length === 0 && (
          <div className="bg-pink-100/50 rounded-xl p-12 flex items-center justify-center min-h-[400px] mt-4">
            <p className="text-gray-600 text-lg font-bold">
              {selectedCity || selectedUniversity || selectedInterests.length > 0
                ? 'По выбранным фильтрам ничего не найдено'
                : 'Пока нет анкет'}
            </p>
          </div>
        )}

        {isEffectActive && effectDirection && (
          <EffectOverlay 
            direction={effectDirection} 
            onComplete={handleEffectComplete}
          />
        )}

        <AnimatePresence mode="wait">
          {currentProfile && (
            (activeTab === 'all' && !loading) || 
            (activeTab === 'incoming' && !loadingIncoming && incomingLikes.length > 0)
          ) && (
            <motion.div
              key={currentProfile.id}
              ref={cardRef}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="touch-manipulation select-none w-full"
              style={{
                willChange: 'transform',
                transform: 'translateZ(0)',
              }}
              initial={{ 
                opacity: 0, 
                y: 20, 
                scale: 0.95,
                x: 0,
                rotate: 0,
                boxShadow: '0 0 0px rgba(0, 255, 255, 0)',
              }}
              animate={{ 
                opacity: swipeOffset === 0 ? 1 : 1 - Math.abs(swipeOffset) / 300,
                y: 0,
                scale: swipeOffset === 0 ? 1 : 1,
                x: swipeOffset,
                rotate: swipeOffset * 0.1,
                boxShadow: swipeOffset === 0 && !isEffectActive
                  ? [
                      '0 0 15px rgba(0, 255, 255, 0.4)',
                      '0 0 30px rgba(54, 207, 255, 0.3)',
                      '0 0 45px rgba(0, 255, 255, 0.2)',
                    ].join(', ')
                  : '0 0 0px rgba(0, 255, 255, 0)',
              }}
              exit={lastSwipeDirection === 'left' ? {
                opacity: 0,
                x: -600,
                y: 150,
                scale: 0.1,
                rotate: -45,
                boxShadow: '0 0 0px rgba(0, 255, 255, 0)',
              } : {
                opacity: 0,
                x: 400,
                y: -20,
                scale: 0.95,
                rotate: 20,
                boxShadow: '0 0 0px rgba(0, 255, 255, 0)',
              }}
              transition={(_, transitionInfo) => {
                if (transitionInfo && transitionInfo.exit) {
                  if (lastSwipeDirection === 'left') {
                    return {
                      x: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] },
                      y: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] },
                      opacity: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] },
                      scale: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] },
                      rotate: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] },
                    }
                  } else {
                    return {
                      x: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] },
                      y: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] },
                      opacity: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
                      scale: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] },
                      rotate: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] },
                    }
                  }
                } else {
                  return {
                    x: { type: "spring", stiffness: 200, damping: 25 },
                    opacity: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
                    rotate: { type: "spring", stiffness: 200, damping: 25 },
                    scale: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
                    boxShadow: { 
                      duration: 0.6, 
                      delay: 0.1,
                      ease: [0.25, 0.1, 0.25, 1] 
                    },
                  }
                }
              }}
            >
              <Card className="relative">
                {(() => {
                  try {
                    const photos = Array.isArray(currentProfile.photos) && currentProfile.photos.length > 0
                      ? currentProfile.photos
                      : (currentProfile.photo_url ? [getPhotoUrl(currentProfile.photo_url)] : [])
                    
                    if (photos.length > 0) {
                      return (
                        <div className="w-full mb-3">
                          <img
                            src={photos[0]}
                            alt={currentProfile.name || 'Profile'}
                            className="w-full h-64 md:h-80 object-cover rounded-xl"
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              e.target.style.display = 'none'
                            }}
                          />
                        </div>
                      )
                    }
                    return (
                      <div className="w-full h-40 md:h-64 bg-white/15 rounded-xl flex items-center justify-center mb-3 border border-white/40">
                        <span className="text-4xl md:text-6xl">👤</span>
                      </div>
                    )
                  } catch (error) {
                    return (
                      <div className="w-full h-40 md:h-64 bg-white/15 rounded-xl flex items-center justify-center mb-3 border border-white/40">
                        <span className="text-4xl md:text-6xl">👤</span>
                      </div>
                    )
                  }
                })()}

                <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">
                  {currentProfile.name || 'Без имени'}, {currentProfile.age || '?'}
                </h2>

                <div className="space-y-2 text-xs md:text-sm mb-3">
                  <div>
                    <span className="font-semibold text-gray-800">Город:</span>{' '}
                    <span className="text-gray-800 font-medium">{currentProfile.city || 'Не указан'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-800">Вуз:</span>{' '}
                    <span className="text-gray-600 text-xs md:text-sm">{currentProfile.university || 'Не указан'}</span>
                  </div>

                  <div>
                    <span className="font-semibold text-gray-800">Интересы:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {Array.isArray(currentProfile.interests) && currentProfile.interests.length > 0
                        ? currentProfile.interests.map((interest, index) => (
                            <span
                              key={index}
                              className="px-1.5 py-0.5 bg-white/20 text-teal-700 rounded text-xs border border-white/40"
                            >
                              {interest}
                            </span>
                          ))
                        : <span className="text-gray-500 text-xs">Не указано</span>
                      }
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold text-gray-800">Цели:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {Array.isArray(currentProfile.goals) && currentProfile.goals.length > 0
                        ? currentProfile.goals.map((goal, index) => (
                            <span
                              key={index}
                              className="px-1.5 py-0.5 bg-white/20 text-emerald-700 rounded text-xs border border-white/40"
                            >
                              {goal}
                            </span>
                          ))
                        : <span className="text-gray-500 text-xs">Не указано</span>
                      }
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold text-gray-800">О себе:</span>
                    <p className="text-gray-800 mt-1 leading-relaxed text-xs md:text-sm line-clamp-3">{currentProfile.bio || 'Не указано'}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {showSwipeTutorial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowSwipeTutorial(false)
              localStorage.setItem('maxnet_swipe_tutorial_seen', 'true')
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 md:p-8 max-w-lg w-full border-2 border-cyan-400/50 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                    Добро пожаловать в ваш персональный нетворкинг-компас!
                  </h2>
                  <p className="text-base text-gray-700">
                    Здесь каждый свайп – это шаг к новым возможностям. Вот как это работает:
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 bg-red-50/50 rounded-xl border border-red-200/50">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="text-3xl">👈</div>
                      <p className="font-semibold text-gray-800 text-lg">Свайп влево — «Пропустить»</p>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed pl-11">
                      Не всё должно быть в вашем списке, и это нормально. Если этот профиль не совпадает с вашими целями или интересами, просто проведите пальцем влево — мы не будем его показывать вам снова.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-green-50/50 rounded-xl border border-green-200/50">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="text-3xl">👉</div>
                      <p className="font-semibold text-gray-800 text-lg">Свайп вправо — «Лайк»</p>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed pl-11">
                      Нашли интересного человека? Значит стоит познакомиться! Проведите пальцем вправо, чтобы показать свой интерес и начать диалог.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowSwipeTutorial(false)
                    localStorage.setItem('maxnet_swipe_tutorial_seen', 'true')
                  }}
                  className="w-full px-6 py-3 rounded-xl font-semibold text-white transition-all"
                  style={{
                    background: `linear-gradient(to right, rgba(0, 255, 255, 0.26), rgba(54, 207, 255, 0.32))`,
                    borderColor: 'rgba(0, 255, 255, 0.5)',
                    boxShadow: '0 10px 25px rgba(0, 255, 255, 0.3), 0 0 20px rgba(54, 207, 255, 0.2)',
                  }}
                >
                  Понятно!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default ProfilesPage
