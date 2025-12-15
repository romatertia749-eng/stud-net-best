import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { WebAppProvider, useWebApp } from './contexts/WebAppContext'
import { MatchProvider } from './contexts/MatchContext'
import { Header, Card, BottomNav, Loader } from './components'
import HomePage from './pages/HomePage'
import ProfilePage from './pages/ProfilePage'
import UserCardPage from './pages/UserCardPage'

// Lazy loading для тяжелых страниц
const ProfilesPage = lazy(() => import('./pages/ProfilesPage'))
const NetListPage = lazy(() => import('./pages/NetListPage'))
const ProfileEditPage = lazy(() => import('./pages/ProfileEditPage'))

/**
 * Компонент экрана ошибки авторизации
 * Показывается когда не удалось авторизоваться в Telegram
 */
const ErrorScreen = ({ error }) => (
  <div className="min-h-screen page-gradient flex items-center justify-center p-4">
    <Card className="max-w-md">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Ошибка авторизации</h2>
      <p className="text-gray-600 mb-4">{error}</p>
      <p className="text-gray-500 text-sm">
        Убедитесь, что приложение запущено внутри Telegram
      </p>
    </Card>
  </div>
)

/**
 * Основной контент приложения
 * Оборачивает роутинг и проверяет состояние авторизации
 */
const AppContent = () => {
  const { isLoading, error, user } = useWebApp()

  // Показываем загрузчик пока идёт инициализация
  if (isLoading) {
    return <Loader />
  }

  // Определяем режим разработки: если нет Telegram WebApp, то это точно режим разработки
  const isDevMode = !window.Telegram?.WebApp

  // ErrorScreen показываем только в продакшене (когда есть Telegram WebApp) 
  // и только если это реальная критическая ошибка авторизации
  // В режиме разработки всегда показываем приложение
  if (!isDevMode && error && !user && (error.includes('Authentication failed') || error.includes('Ошибка авторизации'))) {
    return <ErrorScreen error={error} />
  }
  
  // Не показываем ошибку, если пользователь установлен (даже если есть ошибка)
  // Это позволяет работать в режиме разработки

  return (
    <Router>
      <div className="min-h-screen page-gradient">
        {/* Баннер режима разработки (показывается только в dev режиме) */}
        {isDevMode && (
          <div className="bg-blue-500/20 border-b border-blue-500/50 px-4 py-2">
            <p className="text-blue-700 text-sm text-center font-medium">
              ℹ️ Режим разработки: Приложение работает в демо-режиме
            </p>
          </div>
        )}
        <Header appName="StudNet" connectionsCount={0} statusText="Один в поле" />
        {/* Роутинг приложения */}
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/edit" element={<ProfileEditPage />} />
            <Route path="/ankets" element={<ProfilesPage />} />
            <Route path="/profiles" element={<ProfilesPage />} />
            <Route path="/user/:id" element={<UserCardPage />} />
            <Route path="/netlist" element={<NetListPage />} />
            <Route path="/network" element={<NetListPage />} />
            <Route path="*" element={<HomePage />} /> {/* Fallback на главную */}
          </Routes>
        </Suspense>
        <BottomNav />
      </div>
    </Router>
  )
}

/**
 * Главный компонент приложения
 * Оборачивает всё в провайдеры контекстов (WebApp и Match)
 */
function App() {
  return (
    <WebAppProvider>
      <MatchProvider>
        <AppContent />
      </MatchProvider>
    </WebAppProvider>
  )
}

export default App

