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
        if (savedToken) {
          setJwt(savedToken)
        }

        if (window.Telegram?.WebApp) {
          const tg = window.Telegram.WebApp
          tg.ready()
          tg.expand()

          const initData = tg.initData
          const initDataUnsafe = tg.initDataUnsafe

          if (initDataUnsafe?.user) {
            const userData = {
              id: initDataUnsafe.user.id,
              first_name: initDataUnsafe.user.first_name || '',
              last_name: initDataUnsafe.user.last_name || '',
              username: initDataUnsafe.user.username || '',
              language_code: initDataUnsafe.user.language_code || 'ru',
            }
            setUser(userData)
            userWasSet = true
            isCompleted = true
            clearTimeout(timeoutId)
            setIsLoading(false)
          }

          if (initData) {
            // Сохраняем информацию о пользователе для проверки в catch
            const hasUser = !!initDataUnsafe?.user
            
            fetch(API_ENDPOINTS.AUTH, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `tma ${initData}`,
              },
            })
            .then(async (response) => {
              if (!response.ok) {
                const errorText = await response.text()
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
                console.log('✅ Токен сохранён в localStorage')
              } else {
                console.error('❌ Токен не получен от сервера')
              }
            })
            .catch((authError) => {
              console.error('Auth error:', authError)
              // Устанавливаем ошибку только если это критическая ошибка авторизации
              // Не блокируем работу, если пользователь уже установлен
              if (!hasUser) {
                setError(authError.message || 'Ошибка авторизации')
              }
            })
          } else {
            console.warn('initData is missing - работаем в режиме разработки')
            if (!initDataUnsafe?.user) {
              const mockUser = {
                id: 123456789,
                first_name: 'Тестовый',
                last_name: 'Пользователь',
                username: 'test_user',
                language_code: 'ru',
              }
              setUser(mockUser)
              userWasSet = true
            }
            // Не устанавливаем ошибку, если пользователь установлен (режим разработки)
            // setError('Данные инициализации Telegram отсутствуют')
            isCompleted = true
            clearTimeout(timeoutId)
            setIsLoading(false)
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
          isCompleted = true
          clearTimeout(timeoutId)
          // Не устанавливаем ошибку в режиме разработки - это нормально
          // setError('Режим разработки: Telegram Web App не обнаружен')
          setIsLoading(false)
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

  const value = {
    user,
    jwt,
    isLoading,
    error,
  }

  return (
    <WebAppContext.Provider value={value}>
      {children}
    </WebAppContext.Provider>
  )
}

