import { Card, Button } from '../components'
import { useNavigate } from 'react-router-dom'

const ProfilePage = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen page-gradient pb-20 pt-4">
      <div className="px-4">
        <Card>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Профиль</h2>
          <p className="text-gray-600 mb-6">Страница профиля</p>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => navigate('/profile/edit')}
          >
            Редактировать профиль
          </Button>
        </Card>
      </div>
    </div>
  )
}

export default ProfilePage

