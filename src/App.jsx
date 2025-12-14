import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { WebAppProvider, useWebApp } from './contexts/WebAppContext'
import { MatchProvider } from './contexts/MatchContext'
import { Header, Card, BottomNav, Loader } from './components'
import ProfilePage from './pages/ProfilePage'
import ProfilesPage from './pages/ProfilesPage'
import NetListPage from './pages/NetListPage'
import ProfileEditPage from './pages/ProfileEditPage'
import UserCardPage from './pages/UserCardPage'

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

const AppContent = () => {
  const { isLoading, error, user } = useWebApp()

  if (isLoading) {
    return <Loader />
  }

  // Определяем режим разработки: если нет Telegram WebApp, то это точно режим разработки
  const isDevMode = !window.Telegram?.WebApp

  // ErrorScreen показываем только в продакшене (когда есть Telegram WebApp) 
  // и только если это реальная критическая ошибка авторизации
  // В режиме разработки всегда показываем приложение
  if (!isDevMode && error && !user && error.includes('Authentication failed')) {
    return <ErrorScreen error={error} />
  }

  return (
    <Router>
      <div className="min-h-screen page-gradient">
        {isDevMode && (
          <div className="bg-blue-500/20 border-b border-blue-500/50 px-4 py-2">
            <p className="text-blue-700 text-sm text-center font-medium">
              ℹ️ Режим разработки: Приложение работает в демо-режиме
            </p>
          </div>
        )}
        <Header appName="StudNet" connectionsCount={0} statusText="Один в поле" />
        <Routes>
          <Route path="/" element={<ProfilePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/edit" element={<ProfileEditPage />} />
          <Route path="/ankets" element={<ProfilesPage />} />
          <Route path="/profiles" element={<ProfilesPage />} />
          <Route path="/user/:id" element={<UserCardPage />} />
          <Route path="/netlist" element={<NetListPage />} />
          <Route path="/network" element={<NetListPage />} />
          <Route path="*" element={<ProfilePage />} />
        </Routes>
        <BottomNav />
      </div>
    </Router>
  )
}

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

