import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { WebAppProvider, useWebApp } from './contexts/WebAppContext'
import { Header, Card, BottomNav, Loader } from './components'
import ProfilePage from './pages/ProfilePage'
import ProfilesPage from './pages/ProfilesPage'
import NetListPage from './pages/NetListPage'
import ProfileEditPage from './pages/ProfileEditPage'

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

  // Показываем ErrorScreen только если это критическая ошибка (не режим разработки)
  const isDevMode = error && error.includes('Режим разработки')
  if (error && !user && !isDevMode) {
    return <ErrorScreen error={error} />
  }

  return (
    <Router>
      <div className="min-h-screen page-gradient">
        {error && (
          <div className="bg-yellow-500/20 border-b border-yellow-500/50 px-4 py-2">
            <p className="text-yellow-700 text-sm text-center font-medium">
              ⚠️ Режим разработки: {error}
            </p>
          </div>
        )}
        <Header appName="StudNet" connectionsCount={0} statusText="Один в поле" />
        <Routes>
          <Route path="/" element={<NetListPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/edit" element={<ProfileEditPage />} />
          <Route path="/ankets" element={<ProfilesPage />} />
          <Route path="/profiles" element={<ProfilesPage />} />
          <Route path="/netlist" element={<NetListPage />} />
          <Route path="/network" element={<NetListPage />} />
          <Route path="*" element={<NetListPage />} />
        </Routes>
        <BottomNav />
      </div>
    </Router>
  )
}

function App() {
  return (
    <WebAppProvider>
      <AppContent />
    </WebAppProvider>
  )
}

export default App

