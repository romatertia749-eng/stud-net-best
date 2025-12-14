import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, Autocomplete, EffectOverlay } from '../components'
import { russianCities, universities, interests } from '../data/formData'
import { useMatches } from '../contexts/MatchContext'
import { useWebApp } from '../contexts/WebAppContext'
import { API_ENDPOINTS, getPhotoUrl } from '../config/api'
import { fetchWithAuth } from '../utils/api'

/**
 * ProfilesPage - главная страница для просмотра и свайпа анкет пользователей
 * 
 * Основная функциональность:
 * - Показывает анкеты других пользователей в формате карточек (как в Tinder)
 * - Поддерживает свайп влево (пропустить) и вправо (лайк)
 * - Фильтрация по городу, университету и интересам
 * - Две вкладки: "Все анкеты" и "Входящие коннекты" (те, кто лайкнул тебя)
 * - Кэширование данных в localStorage для быстрой загрузки
 */
const ProfilesPage = () => {
  // Получаем функции из контекстов для работы с мэтчами и данными пользователя
  const { addMatch, matches } = useMatches()
  const { user, isLoading: isWebAppLoading } = useWebApp()
  const userInfo = user
  
  // Состояние для управления текущей карточкой
  const [currentIndex, setCurrentIndex] = useState(0) // Индекс текущей карточки в массиве
  const [swipedProfiles, setSwipedProfiles] = useState([]) // ID профилей, которые уже свайпнули
  
  // Состояние для фильтров
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedUniversity, setSelectedUniversity] = useState('')
  const [selectedInterests, setSelectedInterests] = useState([])
  const [showFilters, setShowFilters] = useState(false) // Показывать/скрывать панель фильтров
  
  // Состояние для свайпа (анимация и позиция карточки)
  const [swipeOffset, setSwipeOffset] = useState(0) // Смещение карточки при свайпе (в пикселях)
  
  // Состояние для данных профилей
  const [allProfiles, setAllProfiles] = useState([]) // Все загруженные профили
  const [loading, setLoading] = useState(false) // Загрузка основных профилей
  
  // Состояние для туториала
  const [showSwipeTutorial, setShowSwipeTutorial] = useState(false) // Показывать ли обучение свайпу
  
  // Состояние для вкладок
  const [activeTab, setActiveTab] = useState('all') // 'all' или 'incoming'
  
  // Состояние для входящих лайков (те, кто лайкнул тебя)
  const [incomingLikes, setIncomingLikes] = useState([])
  const [loadingIncoming, setLoadingIncoming] = useState(false)
  const [incomingError, setIncomingError] = useState(null) // Ошибка загрузки входящих
  const [showIncomingTip, setShowIncomingTip] = useState(false) // Подсказка для входящих
  
  // Состояние для анимации эффектов при свайпе
  const [isEffectActive, setIsEffectActive] = useState(false) // Активен ли эффект анимации
  const [effectDirection, setEffectDirection] = useState(null) // Направление эффекта: 'left' или 'right'
  const [lastSwipeDirection, setLastSwipeDirection] = useState(null) // Последнее направление свайпа
  
  // Refs для работы с DOM и обработки свайпов
  const cardRef = useRef(null) // Ссылка на DOM элемент карточки
  const touchStartX = useRef(0) // X координата начала касания
  const touchStartY = useRef(0) // Y координата начала касания
  const touchEndX = useRef(0) // X координата конца касания
  const touchEndY = useRef(0) // Y координата конца касания
  const isProcessingSwipe = useRef(false) // Флаг: обрабатывается ли сейчас свайп (чтобы не дублировать)
  const rafId = useRef(null) // ID для requestAnimationFrame (для плавной анимации)

  // Готовность приложения (когда загрузились данные пользователя)
  const isReady = !isWebAppLoading

  // При первой загрузке пытаемся загрузить кэшированные профили из localStorage
  // Это позволяет быстро показать данные без ожидания запроса к серверу
  useEffect(() => {
    const lastUserId = localStorage.getItem('last_user_id')
    if (lastUserId) {
      const cacheKey = `profiles_${lastUserId}`
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        try {
          const cachedData = JSON.parse(cached)
          // Проверяем, не истёк ли кэш (данные актуальны 10 минут)
          if (cachedData.expires > Date.now() && Array.isArray(cachedData.profiles)) {
            // Обрабатываем профили: парсим JSON строки в массивы для interests и goals
            const processedProfiles = cachedData.profiles.map(profile => {
              // Парсим interests (может быть массивом или JSON строкой)
              let interestsArray = []
              if (profile.interests) {
                if (Array.isArray(profile.interests)) {
                  interestsArray = profile.interests
                } else if (typeof profile.interests === 'string') {
                  try { interestsArray = JSON.parse(profile.interests) } catch (e) { interestsArray = [] }
                }
              }
              
              // Парсим goals (может быть массивом или JSON строкой)
              let goalsArray = []
              if (profile.goals) {
                if (Array.isArray(profile.goals)) {
                  goalsArray = profile.goals
                } else if (typeof profile.goals === 'string') {
                  try { goalsArray = JSON.parse(profile.goals) } catch (e) { goalsArray = [] }
                }
              }
              
              // Формируем объект профиля с правильными типами данных
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
          // Если кэш повреждён, удаляем его
          localStorage.removeItem(cacheKey)
        }
      }
    }
  }, [])

  // Показываем туториал по свайпу только один раз (при первом посещении)
  useEffect(() => {
    if (!isReady) return
    
    const hasSeenTutorial = localStorage.getItem('maxnet_swipe_tutorial_seen')
    if (!hasSeenTutorial) {
      setShowSwipeTutorial(true)
    }
  }, [isReady])

  // Когда показывается туториал, скрываем header и bottomNav, блокируем скролл
  // Это нужно для полноэкранного показа туториала
  useEffect(() => {
    if (showSwipeTutorial) {
      document.body.style.overflow = 'hidden' // Блокируем скролл страницы
      const header = document.querySelector('header')
      const bottomNav = document.querySelector('nav')
      if (header) header.style.display = 'none' // Скрываем шапку
      if (bottomNav) bottomNav.style.display = 'none' // Скрываем нижнюю навигацию
    } else {
      // Восстанавливаем всё обратно
      document.body.style.overflow = ''
      const header = document.querySelector('header')
      const bottomNav = document.querySelector('nav')
      if (header) header.style.display = ''
      if (bottomNav) bottomNav.style.display = ''
    }
    
    // Cleanup: при размонтировании компонента восстанавливаем всё
    return () => {
      document.body.style.overflow = ''
      const header = document.querySelector('header')
      const bottomNav = document.querySelector('nav')
      if (header) header.style.display = ''
      if (bottomNav) bottomNav.style.display = ''
    }
  }, [showSwipeTutorial])

  /**
   * Загружает список пользователей, которые лайкнули текущего пользователя
   * Это вкладка "Входящие коннекты"
   */
  const fetchIncomingLikes = async () => {
    if (!userInfo?.id) return
    
    setLoadingIncoming(true)
    setIncomingError(null)
    setIncomingLikes([])
    
    try {
      // Устанавливаем таймаут 4 секунды для запроса
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4000)
      
      const url = API_ENDPOINTS.INCOMING_LIKES
      const response = await fetchWithAuth(url, {
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
        
      if (response.ok) {
        const data = await response.json()
        // Обрабатываем разные форматы ответа от сервера
        const profiles = Array.isArray(data.content) ? data.content : (Array.isArray(data) ? data : [])
        
        // Обрабатываем каждый профиль: парсим JSON строки в массивы
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
        
        // Показываем подсказку для входящих лайков только один раз
        const hasSeenIncomingTip = localStorage.getItem('maxnet_incoming_tip_seen')
        if (!hasSeenIncomingTip && processedProfiles.length > 0) {
          setShowIncomingTip(true)
        }
      } else if (response.status === 404) {
        // Эндпоинт не реализован на бэкенде
        setIncomingLikes([])
        setIncomingError('not_implemented')
        setCurrentIndex(0)
      } else {
        // Ошибка загрузки
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

  // При переключении на вкладку "Входящие коннекты" загружаем входящие лайки
  useEffect(() => {
    if (activeTab === 'incoming' && isReady && userInfo?.id) {
      setSwipedProfiles([])
      setIncomingLikes([])
      fetchIncomingLikes()
    }
  }, [activeTab, isReady, userInfo?.id])

  /**
   * Основной эффект для загрузки профилей с сервера
   * Загружает профили при:
   * - Первой загрузке страницы
   * - Изменении фильтров (город, университет, интересы)
   * - Переключении вкладок
   */
  useEffect(() => {
    if (!isReady || !userInfo?.id) {
      if (!userInfo?.id) setLoading(false)
      return
    }
    
    // Не загружаем основные профили, если открыта вкладка "Входящие"
    if (activeTab === 'incoming') {
      return
    }
    
    let isMounted = true // Флаг для проверки, не размонтирован ли компонент
    let controller = null // AbortController для отмены запроса
    
    const fetchProfiles = async () => {
      if (!isMounted) return
      
      // Проверяем кэш в localStorage
      const cacheKey = `profiles_${userInfo.id}`
      const cached = localStorage.getItem(cacheKey)
      let hasValidCache = false
      
      if (cached) {
        try {
          const cachedData = JSON.parse(cached)
          // Если кэш актуален (не истёк) и содержит валидные данные
          if (cachedData.expires > Date.now() && Array.isArray(cachedData.profiles)) {
            hasValidCache = true
            // Загружаем из кэша только если у нас ещё нет профилей
            if (allProfiles.length === 0) {
              // Обрабатываем профили: парсим JSON строки
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
      
      // Формируем URL для запроса (убираем лишний слэш в конце)
      const baseUrl = API_ENDPOINTS.PROFILES.endsWith('/') 
        ? API_ENDPOINTS.PROFILES.slice(0, -1) 
        : API_ENDPOINTS.PROFILES
      const url = `${baseUrl}?page=0&size=50`
      
      // Показываем индикатор загрузки только если нет валидного кэша
      if (!hasValidCache) {
        setLoading(true)
      } else if (cached) {
        // Если кэш очень свежий (меньше минуты), не делаем запрос
        try {
          const cachedData = JSON.parse(cached)
          const cacheAge = Date.now() - (cachedData.expires - 10 * 60 * 1000)
          if (cacheAge < 60 * 1000) {
            return // Кэш слишком свежий, не обновляем
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
          } else if (data.items && Array.isArray(data.items)) {
            profiles = data.items
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

  // Пока что фильтрация не реализована, просто используем все профили
  const filteredProfiles = allProfiles

  // Профили, которые ещё не были свайпнуты и не являются мэтчами (исключаем уже просмотренные и мэтчи)
  const availableProfiles = useMemo(() => {
    // Собираем все возможные идентификаторы мэтчей (id профиля и user_id)
    const matchProfileIds = new Set()
    const matchUserIds = new Set()
    matches.forEach(m => {
      if (m.id) matchProfileIds.add(m.id)
      if (m.user_id) matchUserIds.add(m.user_id)
      if (m.userId) matchUserIds.add(m.userId) // Для формата из NetListPage
    })
    
    return filteredProfiles.filter(profile => {
      // Исключаем свайпнутые
      if (swipedProfiles.includes(profile.id)) return false
      // Исключаем мэтчи по ID профиля
      if (matchProfileIds.has(profile.id)) return false
      // Исключаем мэтчи по user_id
      if (matchUserIds.has(profile.user_id)) return false
      return true
    })
  }, [filteredProfiles, swipedProfiles, matches])

  // Определяем, какие профили показывать в зависимости от активной вкладки
  const currentProfiles = activeTab === 'incoming' 
    ? (loadingIncoming ? [] : incomingLikes) // Входящие лайки
    : availableProfiles // Обычные профили
  
  // Безопасный индекс (чтобы не выйти за границы массива)
  const safeIndex = currentIndex >= 0 && currentIndex < currentProfiles.length ? currentIndex : 0
  const currentProfile = currentProfiles[safeIndex] // Текущая карточка для отображения
  
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

  // Сброс всех фильтров
  const handleResetFilters = () => {
    setSelectedCity('')
    setSelectedUniversity('')
    setSelectedInterests([])
    setSwipedProfiles([]) // Сбрасываем список свайпнутых
    setCurrentIndex(0) // Возвращаемся к первой карточке
  }

  /**
   * Вызывается когда завершается анимация эффекта при свайпе
   * Сбрасывает состояние анимации
   */
  const handleEffectComplete = () => {
    setIsEffectActive(false)
    setEffectDirection(null)
    setSwipeOffset(0)
    isProcessingSwipe.current = false // Разблокируем обработку свайпов
    
    // Прокручиваем страницу вверх для плавности
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'instant' })
    })
  }

  /**
   * Обработчик лайка (свайп вправо)
   * Отправляет запрос на сервер и показывает анимацию
   */
  const handleLike = async () => {
    // Защита от двойного срабатывания
    if (isProcessingSwipe.current || isEffectActive || !currentProfile) return
    isProcessingSwipe.current = true
    
    // Сразу запускаем анимацию (не ждём запрос на сервер)
    const profilesLength = activeTab === 'incoming' 
      ? incomingLikes.length - 1 
      : availableProfiles.length - 1
    
    // Запускаем анимацию эффекта свайпа вправо
    setIsEffectActive(true)
    setEffectDirection('right')
    setLastSwipeDirection('right')
    
    // Сразу меняем индекс, чтобы запустилась exit анимация карточки
    setCurrentIndex(prevIndex => {
      const nextIndex = prevIndex < profilesLength ? prevIndex + 1 : prevIndex
      return activeTab === 'incoming' ? Math.min(prevIndex, Math.max(0, profilesLength - 1)) : nextIndex
    })
    
    // Добавляем профиль в список свайпнутых (чтобы не показывать снова)
    if (activeTab !== 'incoming') {
      setSwipedProfiles(prev => [...prev, currentProfile.id])
    }
    
    // Отправляем запрос на сервер асинхронно (не блокируя анимацию)
    let isMatched = false // Стал ли это мэтч (взаимный лайк)
    
    if (userInfo?.id) {
      try {
        if (activeTab === 'incoming') {
          // Для входящих лайков отправляем ответ "принять"
          const response = await fetchWithAuth(API_ENDPOINTS.RESPOND_TO_LIKE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              targetUserId: currentProfile.user_id || currentProfile.id,
              action: 'accept'
            }),
          })
          
          if (response.ok) {
            await response.json()
            isMatched = true // Принятие входящего лайка = мэтч
            // Удаляем из списка входящих
            setIncomingLikes(prev => prev.filter(p => p.id !== currentProfile.id))
          }
        } else {
          // Для обычных профилей отправляем лайк
          const response = await fetchWithAuth(API_ENDPOINTS.LIKE_PROFILE(currentProfile.id), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userInfo.id }),
          })
          
          if (response.ok) {
            const data = await response.json()
            if (data.matched) isMatched = true // Сервер сообщил о мэтче
          }
        }
      } catch (error) {
        console.error('Error liking profile:', error)
      }
    }
    
    // Если произошёл мэтч, добавляем в список мэтчей и показываем уведомление
    if (isMatched) {
      addMatch(currentProfile)
      alert('Вы замэтчились! 🎉')
    } else if (!userInfo?.id) {
      // В режиме разработки (без авторизации) просто добавляем в мэтчи
      addMatch(currentProfile)
    }
  }

  /**
   * Обработчик пропуска (свайп влево)
   * Отправляет запрос на сервер о том, что пользователь пропустил профиль
   */
  const handlePass = async () => {
    // Защита от двойного срабатывания
    if (isProcessingSwipe.current || isEffectActive || !currentProfile) return
    isProcessingSwipe.current = true
    
    // Сразу запускаем анимацию (не ждём запрос на сервер)
    const profilesLength = activeTab === 'incoming' 
      ? incomingLikes.length - 1 
      : availableProfiles.length - 1
    
    // Запускаем анимацию эффекта свайпа влево
    setIsEffectActive(true)
    setEffectDirection('left')
    setLastSwipeDirection('left')
    
    // Сразу меняем индекс, чтобы запустилась exit анимация карточки
    setCurrentIndex(prevIndex => {
      const nextIndex = prevIndex < profilesLength ? prevIndex + 1 : prevIndex
      return activeTab === 'incoming' ? Math.min(prevIndex, Math.max(0, profilesLength - 1)) : nextIndex
    })
    
    // Добавляем профиль в список свайпнутых
    if (activeTab !== 'incoming') {
      setSwipedProfiles(prev => [...prev, currentProfile.id])
    }
    
    // Отправляем запрос на сервер асинхронно (не блокируя анимацию)
    if (userInfo?.id) {
      try {
        if (activeTab === 'incoming') {
          // Для входящих лайков отправляем ответ "отклонить"
          await fetchWithAuth(API_ENDPOINTS.RESPOND_TO_LIKE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              targetUserId: currentProfile.user_id || currentProfile.id,
              action: 'decline'
            }),
          })
          // Удаляем из списка входящих
          setIncomingLikes(prev => prev.filter(p => p.id !== currentProfile.id))
        } else {
          // Для обычных профилей отправляем "pass"
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
  }

  /**
   * Обработчик начала касания (для свайпа на мобильных устройствах)
   * Сохраняет начальные координаты касания
   */
  const handleTouchStart = (e) => {
    // Блокируем свайп, если идёт анимация или обработка
    if (isEffectActive || isProcessingSwipe.current) {
      e.preventDefault()
      return
    }
    
    // Сохраняем координаты начала касания
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    setSwipeOffset(0) // Сбрасываем смещение
  }

  /**
   * Обработчик движения пальца при свайпе
   * Обновляет позицию карточки в реальном времени
   */
  const handleTouchMove = (e) => {
    if (isEffectActive || !touchStartX.current || isProcessingSwipe.current) return
    
    // Отменяем предыдущий кадр анимации, если он был
    if (rafId.current) {
      cancelAnimationFrame(rafId.current)
    }
    
    // Используем requestAnimationFrame для плавной анимации
    rafId.current = requestAnimationFrame(() => {
      touchEndX.current = e.touches[0].clientX
      touchEndY.current = e.touches[0].clientY
      
      const deltaX = touchEndX.current - touchStartX.current
      const deltaY = touchEndY.current - touchStartY.current
      
      // Если движение больше по горизонтали, чем по вертикали - это свайп
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        setSwipeOffset(deltaX) // Обновляем смещение карточки
      }
    })
    
    // Предотвращаем скролл страницы при горизонтальном свайпе
    const deltaX = e.touches[0].clientX - touchStartX.current
    const deltaY = e.touches[0].clientY - touchStartY.current
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      e.preventDefault()
    }
  }

  /**
   * Обработчик окончания касания
   * Определяет, был ли это свайп, и вызывает соответствующий обработчик
   */
  const handleTouchEnd = () => {
    if (isEffectActive || isProcessingSwipe.current) {
      // Сбрасываем всё, если идёт обработка
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
    
    // Вычисляем расстояние свайпа
    const deltaX = touchEndX.current - touchStartX.current
    const deltaY = touchEndY.current - touchStartY.current
    const minSwipeDistance = 50 // Минимальное расстояние для регистрации свайпа

    // Проверяем, был ли это свайп (горизонтальный и достаточной длины)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX < 0) {
        // Свайп влево = пропустить
        handlePass()
      } else {
        // Свайп вправо = лайк
        handleLike()
      }
    } else {
      // Свайп был слишком коротким, возвращаем карточку на место
      setSwipeOffset(0)
    }
    
    // Сбрасываем координаты
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
