import { createContext, useContext, useEffect, useState } from 'react'
import { API_ENDPOINTS } from '../config/api'
import { setAuthToken, getAuthToken } from '../utils/api'

/**
 * WebAppContext - контекст для работы с Telegram Web App
 * 
 * Предоставляет:
 * - user - данные пользователя из Telegram
 * - jwt - токен авторизации
 * - isLoading - состояние загрузки
 * - error - ошибки инициализации
 */
const WebAppContext = createContext(null)

/**
 * Хук для использования WebAppContext
 * Должен использоваться только внутри WebAppProvider
 */
export const useWebApp = () => {
  const context = useContext(WebAppContext)
  if (!context) {
    throw new Error('useWebApp must be used within WebAppProvider')
  }
  return context
}

/**
 * Провайдер контекста Telegram Web App
 * Инициализирует приложение и авторизацию
 */
export const WebAppProvider = ({ children }) => {
  const [user, setUser] = useState(null) // Данные пользователя Telegram
  const [jwt, setJwt] = useState(null) // JWT токен для API
  const [isLoading, setIsLoading] = useState(true) // Загрузка инициализации
  const [error, setError] = useState(null) // Ошибки инициализации

  /**
   * Инициализация Telegram Web App и авторизация
   * Выполняется один раз при монтировании компонента
   */
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true)
      setError(null)

      let isCompleted = false
      let userWasSet = false // Отслеживаем, был ли установлен пользователь
      const timeoutId = setTimeout(() => {
        if (!isCompleted) {
          setIsLoading(false)
          // Не устанавливаем ошибку при таймауте - это может быть нормально в режиме разработки
          // setError('Режим разработки: Telegram Web App не обнаружен')
        }
      }, 500)

      try {
        const savedToken = getAuthToken()
        console.log('💾 Проверка сохранённого токена:', savedToken ? 'Найден' : 'Не найден')
        if (savedToken) {
          setJwt(savedToken)
          console.log('✅ Используется сохранённый токен')
        }

        if (window.Telegram?.WebApp) {
          const tg = window.Telegram.WebApp
          tg.ready()
          tg.expand()

          const initData = tg.initData
          const initDataUnsafe = tg.initDataUnsafe
          
          console.log('📱 Telegram Web App обнаружен:', {
            hasInitData: !!initData,
            hasInitDataUnsafe: !!initDataUnsafe,
            hasUser: !!initDataUnsafe?.user,
            userId: initDataUnsafe?.user?.id
          })

          if (initDataUnsafe?.user) {
            const userData = {
              id: initDataUnsafe.user.id,
              first_name: initDataUnsafe.user.first_name || '',
              last_name: initDataUnsafe.user.last_name || '',
              username: initDataUnsafe.user.username || '',
              language_code: initDataUnsafe.user.language_code || 'ru',
            }
            console.log('👤 Данные пользователя установлены:', userData)
            setUser(userData)
            userWasSet = true
            // НЕ завершаем загрузку здесь - ждём результата авторизации
          }

          if (initData) {
            console.log('🔐 Найдены initData, отправка запроса на авторизацию...')
            // Сохраняем информацию о пользователе для проверки в catch
            const hasUser = !!initDataUnsafe?.user
            const userId = initDataUnsafe?.user?.id
            
            // Отправляем user_id в теле запроса для fallback, если проверка не пройдёт
            const requestBody = userId ? {
              user_id: userId,
              dev_mode: false // Не dev_mode, но user_id для fallback
            } : {}
            
            fetch(API_ENDPOINTS.AUTH, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `tma ${initData}`,
              },
              body: Object.keys(requestBody).length > 0 ? JSON.stringify(requestBody) : undefined,
            })
            .then(async (response) => {
              if (!response.ok) {
                const errorText = await response.text()
                // Если ошибка, но есть user_id, пробуем fallback
                if (userId && (response.status === 401 || response.status === 400)) {
                  console.warn(`⚠️ Авторизация не прошла (${response.status}), пробуем fallback с user_id=${userId}`)
                  // Пробуем fallback с dev_mode
                  return fetch(API_ENDPOINTS.AUTH, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      user_id: userId,
                      dev_mode: true
                    })
                  }).then(async (fallbackResponse) => {
                    if (fallbackResponse.ok) {
                      return fallbackResponse.json()
                    } else {
                      throw new Error(`Fallback authentication failed: ${fallbackResponse.status}`)
                    }
                  })
                }
                throw new Error(`Authentication failed: ${response.status} - ${errorText}`)
              }
              return response.json()
            })
            .then((data) => {
              const token = data.token || data.jwt
              console.log('🔐 Получен токен от сервера:', token ? 'Есть' : 'ОТСУТСТВУЕТ')
              if (token) {
                setAuthToken(token)
                setJwt(token)
                console.log('✅ Токен сохранён в localStorage и контексте')
                // Дополнительная проверка, что токен действительно сохранился
                const savedToken = getAuthToken()
                if (savedToken !== token) {
                  console.error('❌ ОШИБКА: Токен не сохранился в localStorage!')
                  // Пробуем ещё раз
                  setAuthToken(token)
                }
                isCompleted = true
                clearTimeout(timeoutId)
                setIsLoading(false)
              } else {
                console.error('❌ Токен не получен от сервера')
                // Если есть пользователь, но токен не получен, пытаемся получить токен для режима разработки
                if (hasUser && initDataUnsafe?.user?.id) {
                  console.log('🔄 Повторная попытка получить токен для user_id:', initDataUnsafe.user.id)
                  fetch(API_ENDPOINTS.AUTH, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      user_id: initDataUnsafe.user.id,
                      dev_mode: true
                    })
                  })
                  .then(async (response) => {
                    if (response.ok) {
                      const data = await response.json()
                      const token = data.token || data.jwt
                      if (token) {
                        setAuthToken(token)
                        setJwt(token)
                        console.log('✅ Токен получен через fallback метод')
                      }
                    }
                    isCompleted = true
                    clearTimeout(timeoutId)
                    setIsLoading(false)
                  })
                  .catch((err) => {
                    console.warn('⚠️ Fallback получение токена не удалось:', err.message)
                    isCompleted = true
                    clearTimeout(timeoutId)
                    setIsLoading(false)
                  })
                } else {
                  isCompleted = true
                  clearTimeout(timeoutId)
                  setIsLoading(false)
                }
              }
            })
            .catch((authError) => {
              console.error('Auth error:', authError)
              // Если есть пользователь, но авторизация не прошла, пытаемся получить токен для режима разработки
              if (hasUser && initDataUnsafe?.user?.id) {
                console.log('🔄 Попытка получить токен через fallback для user_id:', initDataUnsafe.user.id)
                fetch(API_ENDPOINTS.AUTH, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    user_id: initDataUnsafe.user.id,
                    dev_mode: true
                  })
                })
                .then(async (response) => {
                  if (response.ok) {
                    const data = await response.json()
                    const token = data.token || data.jwt
                    if (token) {
                      setAuthToken(token)
                      setJwt(token)
                      console.log('✅ Токен получен через fallback метод после ошибки')
                    }
                  }
                  isCompleted = true
                  clearTimeout(timeoutId)
                  setIsLoading(false)
                })
                .catch((err) => {
                  console.warn('⚠️ Fallback получение токена не удалось:', err.message)
                  isCompleted = true
                  clearTimeout(timeoutId)
                  setIsLoading(false)
                })
              } else {
                isCompleted = true
                clearTimeout(timeoutId)
                setIsLoading(false)
              }
              // Устанавливаем ошибку только если это критическая ошибка авторизации
              // Не блокируем работу, если пользователь уже установлен
              if (!hasUser) {
                setError(authError.message || 'Ошибка авторизации')
              }
            })
          } else {
            console.warn('initData is missing - работаем в режиме разработки')
            let currentUser = initDataUnsafe?.user
            if (!currentUser) {
              const mockUser = {
                id: 123456789,
                first_name: 'Тестовый',
                last_name: 'Пользователь',
                username: 'test_user',
                language_code: 'ru',
              }
              setUser(mockUser)
              currentUser = mockUser
              userWasSet = true
            }
            
            // Пытаемся получить токен для mock пользователя (режим разработки)
            if (currentUser?.id) {
              console.log('🔄 Попытка получить токен для режима разработки (user_id:', currentUser.id, ')')
              fetch(API_ENDPOINTS.AUTH, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  user_id: currentUser.id,
                  dev_mode: true
                })
              })
              .then(async (response) => {
                if (response.ok) {
                  const data = await response.json()
                  const token = data.token || data.jwt
                  if (token) {
                    setAuthToken(token)
                    setJwt(token)
                    console.log('✅ Токен для режима разработки получен и сохранён')
                  } else {
                    console.error('❌ Токен не получен в ответе от сервера')
                  }
                } else {
                  const errorText = await response.text()
                  console.warn('⚠️ Не удалось получить токен в режиме разработки:', response.status, errorText)
                }
                isCompleted = true
                clearTimeout(timeoutId)
                setIsLoading(false)
              })
              .catch((err) => {
                console.warn('⚠️ Ошибка при получении токена в режиме разработки:', err.message)
                isCompleted = true
                clearTimeout(timeoutId)
                setIsLoading(false)
              })
            } else {
              isCompleted = true
              clearTimeout(timeoutId)
              setIsLoading(false)
            }
          }
        } else {
          console.warn('Telegram Web App не обнаружен. Режим разработки.')
          const mockUser = {
            id: 123456789,
            first_name: 'Тестовый',
            last_name: 'Пользователь',
            username: 'test_user',
            language_code: 'ru',
          }
          setUser(mockUser)
          userWasSet = true
          
          // Получаем токен для mock пользователя
          console.log('🔄 Попытка получить токен для режима разработки (user_id:', mockUser.id, ')')
          fetch(API_ENDPOINTS.AUTH, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: mockUser.id,
              dev_mode: true
            })
          })
          .then(async (response) => {
            if (response.ok) {
              const data = await response.json()
              const token = data.token || data.jwt
              if (token) {
                setAuthToken(token)
                setJwt(token)
                console.log('✅ Токен для режима разработки получен и сохранён')
              } else {
                console.error('❌ Токен не получен в ответе от сервера')
              }
            } else {
              const errorText = await response.text()
              console.warn('⚠️ Не удалось получить токен в режиме разработки:', response.status, errorText)
            }
            isCompleted = true
            clearTimeout(timeoutId)
            setIsLoading(false)
          })
          .catch((err) => {
            console.warn('⚠️ Ошибка при получении токена в режиме разработки:', err.message)
            isCompleted = true
            clearTimeout(timeoutId)
            setIsLoading(false)
          })
        }
      } catch (err) {
        console.error('Initialization error:', err)
        // Если пользователь не был установлен, устанавливаем mockUser
        if (!userWasSet) {
          const mockUser = {
            id: 123456789,
            first_name: 'Тестовый',
            last_name: 'Пользователь',
            username: 'test_user',
            language_code: 'ru',
          }
          setUser(mockUser)
          userWasSet = true
          
          // Пытаемся получить токен для mock пользователя
          fetch(API_ENDPOINTS.AUTH, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: mockUser.id,
              dev_mode: true
            })
          })
          .then(async (response) => {
            if (response.ok) {
              const data = await response.json()
              const token = data.token || data.jwt
              if (token) {
                setAuthToken(token)
                setJwt(token)
                console.log('✅ Токен для режима разработки получен и сохранён (catch)')
              }
            }
          })
          .catch((authErr) => {
            console.warn('⚠️ Ошибка при получении токена в catch:', authErr.message)
          })
        }
        // Не устанавливаем ошибку, чтобы не блокировать работу в режиме разработки
        // setError(err.message || 'Ошибка инициализации')
        isCompleted = true
        clearTimeout(timeoutId)
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  /**
   * Функция для переавторизации пользователя
   * Используется при ошибке 401 для получения нового токена
   */
  const reauthenticate = async () => {
    try {
      if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp
        const initData = tg.initData
        const initDataUnsafe = tg.initDataUnsafe
        
        if (initData && initDataUnsafe?.user?.id) {
          const response = await fetch(API_ENDPOINTS.AUTH, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `tma ${initData}`,
            },
          })
          
          if (response.ok) {
            const data = await response.json()
            const token = data.token || data.jwt
            if (token) {
              setAuthToken(token)
              setJwt(token)
              console.log('✅ Переавторизация успешна, новый токен получен')
              return token
            }
          }
        }
        
        // Fallback: пробуем dev_mode
        if (initDataUnsafe?.user?.id) {
          const response = await fetch(API_ENDPOINTS.AUTH, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: initDataUnsafe.user.id,
              dev_mode: true
            })
          })
          
          if (response.ok) {
            const data = await response.json()
            const token = data.token || data.jwt
            if (token) {
              setAuthToken(token)
              setJwt(token)
              console.log('✅ Переавторизация через dev_mode успешна')
              return token
            }
          }
        }
      }
    } catch (error) {
      console.error('Ошибка при переавторизации:', error)
    }
    return null
  }

  const value = {
    user,
    jwt,
    isLoading,
    error,
    reauthenticate,
  }

  return (
    <WebAppContext.Provider value={value}>
      {children}
    </WebAppContext.Provider>
  )
}

