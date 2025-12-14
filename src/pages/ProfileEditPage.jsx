import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWebApp } from '../contexts/WebAppContext'
import { Card, Button, Autocomplete, MultiSelect } from '../components'
import { russianCities, universities, interests, goals } from '../data/formData'
import { API_ENDPOINTS, getPhotoUrl } from '../config/api'
import { getAuthToken } from '../utils/api'

/**
 * ProfileEditPage - страница редактирования профиля
 * 
 * Отличается от ProfilePage тем, что:
 * - Всегда показывает форму редактирования (не показывает только просмотр)
 * - После сохранения перенаправляет на /profile
 * - Имеет кнопку "Отмена" для возврата назад
 */
const ProfileEditPage = () => {
  const { user, jwt } = useWebApp()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [profileData, setProfileData] = useState(null)
  const [isGenderDropdownOpen, setIsGenderDropdownOpen] = useState(false)
  const fileInputRef = useRef(null)
  const genderDropdownRef = useRef(null)
  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    age: '',
    city: '',
    university: '',
    interests: [],
    goals: [],
    customInterest: '',
    customGoal: '',
    bio: '',
    photos: [],
  })

  const [errors, setErrors] = useState({})

  useEffect(() => {
    const lastUserId = localStorage.getItem('last_user_id')
    if (lastUserId) {
      const cacheKey = `profile_${lastUserId}`
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        try {
          const cachedData = JSON.parse(cached)
          if (cachedData.expires > Date.now()) {
            setIsEditing(true)
            setProfileData(cachedData.data)
            setFormData({
              name: cachedData.data.name || '',
              gender: cachedData.data.gender === 'Мужской' ? 'male' : cachedData.data.gender === 'Женский' ? 'female' : cachedData.data.gender || '',
              age: cachedData.data.age?.toString() || '',
              city: cachedData.data.city || '',
              university: cachedData.data.university || '',
              interests: cachedData.data.interests || [],
              goals: cachedData.data.goals || [],
              customInterest: '',
              customGoal: '',
              bio: cachedData.data.bio || '',
              photos: cachedData.data.photo_url ? [{ 
                preview: getPhotoUrl(cachedData.data.photo_url), 
                id: 'existing',
                isExisting: true 
              }] : [],
            })
            setLoadingProfile(false)
          }
        } catch (e) {
          localStorage.removeItem(cacheKey)
        }
      }
    }
  }, [])

  // Загрузка существующего профиля
  useEffect(() => {
    if (!user?.id) {
      setLoadingProfile(false)
      return
    }

    let isMounted = true

    const loadProfile = async () => {
      if (!isMounted) return
      
      const cacheKey = `profile_${user.id}`
      const cached = localStorage.getItem(cacheKey)
      let hasValidCache = false
      
      if (cached) {
        try {
          const cachedData = JSON.parse(cached)
          if (cachedData.expires > Date.now()) {
            hasValidCache = true
            if (!profileData) {
              setIsEditing(true)
              setProfileData(cachedData.data)
              setFormData({
                name: cachedData.data.name || '',
                gender: cachedData.data.gender || '',
                age: cachedData.data.age?.toString() || '',
                city: cachedData.data.city || '',
                university: cachedData.data.university || '',
                interests: cachedData.data.interests || [],
                goals: cachedData.data.goals || [],
                customInterest: '',
                customGoal: '',
                bio: cachedData.data.bio || '',
                photos: cachedData.data.photo_url ? [{ 
                  preview: getPhotoUrl(cachedData.data.photo_url), 
                  id: 'existing',
                  isExisting: true 
                }] : [],
              })
            }
            setLoadingProfile(false)
          }
        } catch (e) {
          localStorage.removeItem(cacheKey)
        }
      }
      
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 1000)
        
        const token = jwt || getAuthToken()
        const headers = {
          'Content-Type': 'application/json',
        }
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
        
        const url = API_ENDPOINTS.PROFILE_BY_USER_ID(user.id)
        
        if (!hasValidCache) {
          setLoadingProfile(true)
        } else if (cached) {
          try {
            const cachedData = JSON.parse(cached)
            const cacheAge = Date.now() - (cachedData.expires - 30 * 60 * 1000)
            if (cacheAge < 60 * 1000) {
              return
            }
          } catch (e) {}
        }
        
        const response = await fetch(url, {
          signal: controller.signal,
          headers,
        }).catch((fetchError) => {
          if (fetchError.name === 'TypeError' || fetchError.message.includes('Failed to fetch')) {
            throw new Error('NETWORK_ERROR')
          }
          throw fetchError
        })
        
        clearTimeout(timeoutId)
        
        if (!isMounted) {
          if (!hasValidCache) setLoadingProfile(false)
          return
        }
        
        if (response.ok) {
          const data = await response.json()
          setIsEditing(true)
          
          let parsedInterests = []
          let parsedGoals = []
          
          try {
            parsedInterests = Array.isArray(data.interests) 
              ? data.interests 
              : (data.interests ? JSON.parse(data.interests) : [])
          } catch (e) {
            console.warn('Error parsing interests:', e)
          }
          
          try {
            parsedGoals = Array.isArray(data.goals) 
              ? data.goals 
              : (data.goals ? JSON.parse(data.goals) : [])
          } catch (e) {
            console.warn('Error parsing goals:', e)
          }

          const profileDataObj = {
            name: data.name || '',
            gender: data.gender === 'male' ? 'Мужской' : data.gender === 'female' ? 'Женский' : 'Другой',
            age: data.age,
            city: data.city || '',
            university: data.university || '',
            interests: parsedInterests,
            goals: parsedGoals,
            bio: data.bio || '',
            photo_url: data.photo_url,
          }
          
          setProfileData(profileDataObj)
          
          localStorage.setItem(cacheKey, JSON.stringify({
            data: profileDataObj,
            expires: Date.now() + 30 * 60 * 1000
          }))
          localStorage.setItem('last_user_id', user.id.toString())

          setFormData({
            name: data.name || '',
            gender: data.gender || '',
            age: data.age?.toString() || '',
            city: data.city || '',
            university: data.university || '',
            interests: parsedInterests,
            goals: parsedGoals,
            customInterest: '',
            customGoal: '',
            bio: data.bio || '',
            photos: data.photo_url ? [{ 
              preview: getPhotoUrl(data.photo_url), 
              id: 'existing',
              isExisting: true 
            }] : [],
          })
        } else if (response.status === 404) {
          if (!hasValidCache) {
            navigate('/profile', { replace: true })
          }
        } else {
          if (!isMounted) return
          console.warn('Unexpected error loading profile:', response.status)
          if (!hasValidCache) {
            navigate('/profile', { replace: true })
          }
        }
      } catch (error) {
        if (!isMounted) {
          if (!hasValidCache) setLoadingProfile(false)
          return
        }
        if (error.message === 'NETWORK_ERROR' || 
            (error.name === 'TypeError' && error.message.includes('Failed to fetch'))) {
          console.log('Бэкенд недоступен, редирект на создание профиля')
          if (!hasValidCache) {
            navigate('/profile', { replace: true })
          }
        } else if (error.name === 'AbortError') {
          console.warn('Request timeout - бэкенд не отвечает')
          if (!hasValidCache) {
            navigate('/profile', { replace: true })
          }
        } else {
          console.error('Error loading profile:', error)
          if (!hasValidCache) {
            navigate('/profile', { replace: true })
          }
        }
      } finally {
        if (isMounted && !hasValidCache) {
          setLoadingProfile(false)
        }
      }
    }

    loadProfile()
    
    return () => {
      isMounted = false
    }
  }, [user, jwt])

  // Закрытие dropdown при клике вне его
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (genderDropdownRef.current && !genderDropdownRef.current.contains(event.target)) {
        setIsGenderDropdownOpen(false)
      }
    }

    if (isGenderDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isGenderDropdownOpen])

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value })
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' })
    }
  }

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    const maxSize = 5 * 1024 * 1024

    if (files.length === 0) return

    const file = files[0]

    if (!allowedTypes.includes(file.type)) {
      alert('Только изображения JPG, PNG или WebP')
      return
    }
    if (file.size > maxSize) {
      alert('Размер файла не должен превышать 5MB')
      return
    }

    if (formData.photos.length > 0) {
      const oldPhoto = formData.photos[0]
      if (oldPhoto.preview) {
        URL.revokeObjectURL(oldPhoto.preview)
      }
    }

    const newPhoto = {
      file,
      preview: URL.createObjectURL(file),
      id: Date.now() + Math.random(),
    }

    setFormData({
      ...formData,
      photos: [newPhoto],
    })
  }

  const removePhoto = (id) => {
    const photo = formData.photos.find(p => p.id === id)
    if (photo && photo.preview) {
      URL.revokeObjectURL(photo.preview)
    }
    setFormData({
      ...formData,
      photos: formData.photos.filter(p => p.id !== id),
    })
  }

  const addCustomInterest = (customInterest) => {
    if (customInterest && !formData.interests.includes(customInterest)) {
      handleInputChange('interests', [...formData.interests, customInterest])
    }
  }

  const addCustomGoal = (customGoal) => {
    if (customGoal && !formData.goals.includes(customGoal)) {
      handleInputChange('goals', [...formData.goals, customGoal])
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name || formData.name.trim().length < 2) newErrors.name = 'Введите имя (минимум 2 символа)'
    if (!formData.gender) newErrors.gender = 'Выберите пол'
    if (!formData.age) {
      newErrors.age = 'Укажите возраст'
    } else {
      const ageNum = parseInt(formData.age, 10)
      if (isNaN(ageNum) || ageNum < 15 || ageNum > 50) {
        newErrors.age = 'Возраст должен быть от 15 до 50 лет'
      }
    }
    if (!formData.city) newErrors.city = 'Выберите город'
    if (!formData.university) newErrors.university = 'Выберите университет'
    if (formData.interests.length === 0) newErrors.interests = 'Выберите хотя бы один интерес'
    if (formData.goals.length === 0) newErrors.goals = 'Выберите хотя бы одну цель'
    if (formData.bio.length > 300) {
      newErrors.bio = 'Максимум 300 символов'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (loading) {
      return
    }
    
    if (!user) {
      alert('Ошибка: данные пользователя не загружены. Пожалуйста, обновите страницу.')
      return
    }
    
    if (!user.id) {
      alert('Ошибка: ID пользователя не найден. Пожалуйста, обновите страницу.')
      return
    }
    
    const isValid = validateForm()
    
    if (!isValid) {
      return
    }
    
    setLoading(true)
    
    const apiUrl = API_ENDPOINTS.PROFILES
    
    if (!apiUrl) {
      alert('Ошибка конфигурации: API endpoint не найден.')
      setLoading(false)
      return
    }
    
    try {
      const formDataToSend = new FormData()
      
      formDataToSend.append('user_id', user.id.toString())
      formDataToSend.append('username', user.username || '')
      formDataToSend.append('first_name', user.first_name || '')
      formDataToSend.append('last_name', user.last_name || '')
      formDataToSend.append('name', formData.name)
      formDataToSend.append('gender', formData.gender)
      formDataToSend.append('age', formData.age.toString())
      formDataToSend.append('city', formData.city)
      formDataToSend.append('university', formData.university)
      formDataToSend.append('interests', JSON.stringify(formData.interests))
      formDataToSend.append('goals', JSON.stringify(formData.goals))
      formDataToSend.append('bio', formData.bio || '')

      if (formData.photos.length > 0 && formData.photos[0].file && !formData.photos[0].isExisting) {
        formDataToSend.append('photo', formData.photos[0].file)
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      let response
      try {
        // Для FormData не нужно указывать Content-Type - браузер сам установит
        response = await fetch(apiUrl, {
          method: 'POST',
          body: formDataToSend,
          signal: controller.signal,
          mode: 'cors',
          credentials: 'include',
        })
        clearTimeout(timeoutId)
      } catch (fetchError) {
        clearTimeout(timeoutId)
        
        if (fetchError.name === 'AbortError') {
          throw new Error('Запрос превысил время ожидания. Проверьте подключение к интернету и попробуйте снова.')
        }
        throw fetchError
      }

      if (response.ok) {
        const data = await response.json()
        setLoading(false)
        
        alert(isEditing ? 'Профиль успешно обновлён!' : 'Профиль успешно создан!')
        
        const updatedProfileData = {
          name: formData.name,
          gender: formData.gender === 'male' ? 'Мужской' : formData.gender === 'female' ? 'Женский' : 'Другой',
          age: parseInt(formData.age),
          city: formData.city,
          university: formData.university,
          interests: formData.interests,
          goals: formData.goals,
          bio: formData.bio,
          photo_url: formData.photos.length > 0 && formData.photos[0].isExisting ? profileData?.photo_url : (data.photo_url || null),
        }
        
        const cacheKey = `profile_${user.id}`
        localStorage.setItem(cacheKey, JSON.stringify({
          data: updatedProfileData,
          expires: Date.now() + 30 * 60 * 1000
        }))
        localStorage.setItem('last_user_id', user.id.toString())
        localStorage.removeItem(`profiles_${user.id}`)
        
        setProfileData(updatedProfileData)
        navigate('/profile', { replace: true })
        return
      } else {
        const errorText = await response.text()
        
        let errorMessage = 'Ошибка при сохранении профиля'
        try {
          const errorData = JSON.parse(errorText)
          
          if (response.status === 422 && Array.isArray(errorData.detail)) {
            const missingFields = errorData.detail
              .filter(err => err.type === 'missing')
              .map(err => err.loc.join('.'))
              .join(', ')
            
            if (missingFields) {
              errorMessage = `Не заполнены обязательные поля: ${missingFields}`
            } else {
              const errors = errorData.detail.map(err => `${err.loc.join('.')}: ${err.msg}`).join('\n')
              errorMessage = `Ошибка валидации:\n${errors}`
            }
          } else if (errorData.detail) {
            if (typeof errorData.detail === 'string') {
              errorMessage = errorData.detail
            } else if (Array.isArray(errorData.detail)) {
              errorMessage = errorData.detail.map(e => e.msg || JSON.stringify(e)).join('\n')
            } else {
              errorMessage = JSON.stringify(errorData.detail)
            }
          }
        } catch (e) {
          errorMessage = `Ошибка ${response.status}: ${errorText.substring(0, 200)}`
        }
        
        if (response.status === 405) {
          errorMessage = `Method not Allowed (405). Проверьте, что бэкенд поддерживает POST запросы к ${API_ENDPOINTS.PROFILES}`
        }
        
        alert(errorMessage)
      }
    } catch (error) {
      let errorMessage = 'Ошибка при сохранении профиля'
      
      console.error('Ошибка при создании профиля:', error)
      
      if (error.name === 'AbortError' || error.message.includes('превысил время ожидания')) {
        errorMessage = 'Запрос превысил время ожидания. Проверьте подключение к интернету и попробуйте снова.'
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        if (error.message && (
          error.message.includes('CORS') || 
          error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError') ||
          error.message.includes('Network request failed')
        )) {
          errorMessage = 'Не удалось подключиться к серверу. Проверьте подключение к интернету и попробуйте позже.'
        } else {
          errorMessage = 'Не удалось подключиться к серверу. Проверьте подключение к интернету.'
        }
      } else if (error.message) {
        errorMessage = error.message
      }
      
      console.error('Детали ошибки:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        apiUrl
      })
      
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (loadingProfile) {
    return (
      <div className="min-w-[320px] min-h-[600px] max-w-2xl w-full mx-auto p-4 md:p-6 pb-20 md:pb-6 page-gradient" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
        <Card className="mt-4">
          <p className="text-center text-gray-800 font-medium py-8">Загрузка профиля...</p>
        </Card>
      </div>
    )
  }

  if (!isEditing || !profileData) {
    return (
      <div className="min-w-[320px] min-h-[600px] max-w-2xl w-full mx-auto p-4 md:p-6 pb-20 md:pb-6 page-gradient" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
        <Card className="mt-4">
          <p className="text-center text-gray-800 font-medium py-8">Загрузка профиля...</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-w-[320px] min-h-[600px] max-w-2xl w-full mx-auto p-4 md:p-6 pb-20 md:pb-6 page-gradient" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
      <Card className="mt-4">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          {isEditing ? 'Редактировать профиль' : 'Добавить мой профиль'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Имя */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Имя <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Введите ваше имя"
              className={`w-full px-4 py-3 rounded-xl border ${
                errors.name ? 'border-red-300' : 'border-gray-200'
              } focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm`}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Пол */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Пол <span className="text-red-500">*</span>
            </label>
            <div className="relative" ref={genderDropdownRef}>
              <button
                type="button"
                onClick={() => setIsGenderDropdownOpen(!isGenderDropdownOpen)}
                className={`w-full px-4 py-3 rounded-xl border text-left ${
                  errors.gender ? 'border-red-300' : 'border-gray-200'
                } focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm bg-white flex items-center justify-between`}
              >
                <span className={formData.gender ? 'text-gray-800' : 'text-gray-400'}>
                  {formData.gender === 'male' ? 'Мужской' : formData.gender === 'female' ? 'Женский' : 'Выберите пол'}
                </span>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${isGenderDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isGenderDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      handleInputChange('gender', 'male')
                      setIsGenderDropdownOpen(false)
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-teal-50 transition-colors text-sm"
                  >
                    Мужской
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleInputChange('gender', 'female')
                      setIsGenderDropdownOpen(false)
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-teal-50 transition-colors text-sm border-t border-gray-200"
                  >
                    Женский
                  </button>
                </div>
              )}
            </div>
            {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
          </div>

          {/* Возраст */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Возраст <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.age}
              onChange={(e) => handleInputChange('age', e.target.value)}
              placeholder="Введите ваш возраст"
              min="15"
              max="50"
              className={`w-full px-4 py-3 rounded-xl border ${
                errors.age ? 'border-red-300' : 'border-gray-200'
              } focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm`}
            />
            {errors.age && <p className="text-red-500 text-xs mt-1">{errors.age}</p>}
          </div>

          {/* Город */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Город <span className="text-red-500">*</span>
            </label>
            <Autocomplete
              options={russianCities}
              value={formData.city}
              onChange={(value) => handleInputChange('city', value)}
              placeholder="Введите название города..."
              className={errors.city ? 'border-red-300' : ''}
            />
            {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
          </div>

          {/* Университет */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Университет <span className="text-red-500">*</span>
            </label>
            <Autocomplete
              options={universities}
              value={formData.university}
              onChange={(value) => handleInputChange('university', value)}
              placeholder="Введите название университета..."
              className={errors.university ? 'border-red-300' : ''}
            />
            {errors.university && <p className="text-red-500 text-xs mt-1">{errors.university}</p>}
          </div>

          {/* Интересы */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Интересы <span className="text-red-500">*</span>
            </label>
            <MultiSelect
              options={interests}
              selected={formData.interests}
              onChange={(selected) => handleInputChange('interests', selected)}
              placeholder="Выберите интересы..."
              onAddCustom={addCustomInterest}
              className={errors.interests ? 'border-red-300' : ''}
            />
            {errors.interests && <p className="text-red-500 text-xs mt-1">{errors.interests}</p>}
          </div>

          {/* Цель поиска */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Цель поиска <span className="text-red-500">*</span>
            </label>
            <MultiSelect
              options={goals}
              selected={formData.goals}
              onChange={(selected) => handleInputChange('goals', selected)}
              placeholder="Выберите цели..."
              onAddCustom={addCustomGoal}
              className={errors.goals ? 'border-red-300' : ''}
            />
            {errors.goals && <p className="text-red-500 text-xs mt-1">{errors.goals}</p>}
          </div>

          {/* Информация о себе */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Информация о себе
            </label>
            <textarea
              className={`w-full px-4 py-3 rounded-xl border ${
                errors.bio ? 'border-red-300' : 'border-gray-200'
              } focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none text-sm`}
              rows="5"
              placeholder="Расскажите о себе: о своих увлечениях, навыках, интересах и т.д (до 300 символов)..."
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              maxLength={300}
            />
            <div className="flex justify-end items-center mt-1">
              {errors.bio && (
                <p className="text-red-500 text-xs mr-2">{errors.bio}</p>
              )}
              <p className="text-gray-400 text-xs">{formData.bio.length}/300</p>
            </div>
          </div>

          {/* Загрузка фотографий */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Фотография
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 hover:border-teal-500 transition-colors text-sm text-gray-600"
            >
              {formData.photos.length > 0 ? 'Заменить фото' : '+ Загрузить фото'}
            </button>
            {formData.photos.length > 0 && (
              <div className="mt-3">
                <div className="relative max-w-xs mx-auto">
                  <img
                    src={formData.photos[0].preview}
                    alt="Preview"
                    className="w-full h-64 object-cover rounded-xl"
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(formData.photos[0].id)}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-lg hover:bg-red-600 shadow-lg"
                  >
                    ×
                  </button>
                  {formData.photos[0].isExisting && (
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
                      Текущее фото
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                navigate('/profile')
              }}
              className="flex-1"
            >
              Отмена
            </Button>
            <Button type="submit" variant="primary" disabled={loading} className="flex-1">
              {loading ? 'Сохранение...' : isEditing ? 'Обновить профиль' : 'Сохранить'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default ProfileEditPage
