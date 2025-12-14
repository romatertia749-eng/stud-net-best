import { Card } from '../components'

const NetListPage = () => {
  return (
    <div className="min-h-screen page-gradient pb-20 pt-4">
      <div className="px-4 pt-4">
        <Card className="max-w-md mx-auto">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Ошибка авторизации</h2>
          <p className="text-gray-600 mb-4">
            Данные инициализации Telegram отсутствуют
          </p>
          <p className="text-gray-500 text-sm">
            Убедитесь, что приложение запущено внутри Telegram
          </p>
        </Card>
      </div>
    </div>
  )
}

export default NetListPage

