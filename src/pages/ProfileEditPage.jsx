import { useState } from 'react'
import { Card, Button } from '../components'
import { useWebApp } from '../contexts/WebAppContext'

const PROFILE_STORAGE_KEY = 'studnet_user_profile'

const getProfile = () => {
  const stored = localStorage.getItem(PROFILE_STORAGE_KEY)
  return stored ? JSON.parse(stored) : null
}

const ProfileEditPage = () => {
  const { user, jwt } = useWebApp()
  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    interests: '',
    goal: '',
    about: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Проверяем, создан ли профиль в Telegram
  const isTelegramUser = user && window.Telegram?.WebApp
  const hasProfile = getProfile() !== null

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Блокируем отправку, если нет авторизации в Telegram
    if (!isTelegramUser || !jwt) {
      setError('Для создания профиля необходимо авторизоваться через Telegram')
      return
    }

    // Проверяем обязательные поля
    if (!formData.name || !formData.gender || !formData.goal) {
      setError('Пожалуйста, заполните все обязательные поля')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Здесь будет запрос к API для сохранения профиля
      // Пока сохраняем в localStorage для демо
      const profileData = {
        ...formData,
        userId: user.id,
        createdAt: new Date().toISOString()
      }
      
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profileData))
      
      // В продакшене здесь будет:
      // await api.post('/api/profile', profileData)
      
      alert('Профиль успешно сохранен!')
      window.location.href = '/profile'
    } catch (err) {
      setError('Ошибка при сохранении профиля. Попробуйте еще раз.')
      console.error('Profile save error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen page-gradient pb-20 pt-4">
      <div className="px-4 max-w-2xl mx-auto">
        <Card>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Добавить мой профиль</h2>
          
          {!isTelegramUser && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <p className="text-yellow-800 text-sm">
                ⚠️ <strong>Внимание:</strong> Для создания и сохранения профиля необходимо авторизоваться через Telegram. 
                Вы можете просматривать форму, но сохранение будет недоступно.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-5">
              {/* Имя */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Имя *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Введите ваше имя"
                  className="w-full px-4 py-3 rounded-xl bg-white/60 backdrop-blur-sm border border-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800 placeholder-gray-400"
                  disabled={!isTelegramUser}
                />
              </div>

              {/* Пол */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Пол *
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/60 backdrop-blur-sm border border-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800 disabled:opacity-50"
                  disabled={!isTelegramUser}
                >
                  <option value="">Выберите пол</option>
                  <option value="male">Мужской</option>
                  <option value="female">Женский</option>
                </select>
              </div>

              {/* Интересы */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Интересы
                </label>
                <input
                  type="text"
                  value={formData.interests}
                  onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                  placeholder="Выберите интересы..."
                  className="w-full px-4 py-3 rounded-xl bg-white/60 backdrop-blur-sm border border-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800 placeholder-gray-400 disabled:opacity-50"
                  disabled={!isTelegramUser}
                />
              </div>

              {/* Цель поиска */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Цель поиска *
                </label>
                <input
                  type="text"
                  value={formData.goal}
                  onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                  placeholder="Выберите цели..."
                  className="w-full px-4 py-3 rounded-xl bg-white/60 backdrop-blur-sm border border-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800 placeholder-gray-400 disabled:opacity-50"
                  disabled={!isTelegramUser}
                />
              </div>

              {/* Информация о себе */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Информация о себе
                </label>
                <textarea
                  rows={4}
                  value={formData.about}
                  onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                  placeholder="Расскажите о себе..."
                  className="w-full px-4 py-3 rounded-xl bg-white/60 backdrop-blur-sm border border-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800 placeholder-gray-400 resize-none disabled:opacity-50"
                  disabled={!isTelegramUser}
                />
              </div>

              {/* Кнопка сохранения */}
              <div className="pt-4">
                <Button 
                  variant="primary" 
                  size="lg" 
                  fullWidth
                  type="submit"
                  disabled={!isTelegramUser || isSubmitting}
                >
                  {isSubmitting ? 'Сохранение...' : 'Сохранить профиль'}
                </Button>
                {!isTelegramUser && (
                  <p className="text-center text-sm text-gray-500 mt-2">
                    Авторизуйтесь в Telegram для сохранения профиля
                  </p>
                )}
              </div>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default ProfileEditPage

