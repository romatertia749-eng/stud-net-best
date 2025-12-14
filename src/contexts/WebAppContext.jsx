import { createContext, useContext, useEffect, useState } from 'react'
import { API_ENDPOINTS } from '../config/api'
import { setAuthToken, getAuthToken } from '../utils/api'

const WebAppContext = createContext(null)

export const useWebApp = () => {
  const context = useContext(WebAppContext)
  if (!context) {
    throw new Error('useWebApp must be used within WebAppProvider')
  }
  return context
}

export const WebAppProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [jwt, setJwt] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true)
      setError(null)

      let isCompleted = false
      const timeoutId = setTimeout(() => {
        if (!isCompleted) {
          setIsLoading(false)
          setError('Режим разработки: Telegram Web App не обнаружен')
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
            isCompleted = true
            clearTimeout(timeoutId)
            setIsLoading(false)
          }

          if (initData) {
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
              if (token) {
                setAuthToken(token)
                setJwt(token)
              }
            })
            .catch((authError) => {
              console.error('Auth error:', authError)
              setError(authError.message || 'Ошибка авторизации')
            })
          } else {
            console.warn('initData is missing')
            if (!initDataUnsafe?.user) {
              const mockUser = {
                id: 123456789,
                first_name: 'Тестовый',
                last_name: 'Пользователь',
                username: 'test_user',
                language_code: 'ru',
              }
              setUser(mockUser)
            }
            setError('Данные инициализации Telegram отсутствуют')
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
          isCompleted = true
          clearTimeout(timeoutId)
          setError('Режим разработки: Telegram Web App не обнаружен')
          setIsLoading(false)
        }
      } catch (err) {
        console.error('Initialization error:', err)
        setError(err.message || 'Ошибка инициализации')
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

