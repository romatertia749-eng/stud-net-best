import { Card, Button } from '../components'

const ProfileEditPage = () => {
  return (
    <div className="min-h-screen page-gradient pb-20 pt-4">
      <div className="px-4 max-w-2xl mx-auto">
        <Card>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Добавить мой профиль</h2>
          
          <div className="space-y-5">
            {/* Имя */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Имя *
              </label>
              <input
                type="text"
                placeholder="Введите ваше имя"
                className="w-full px-4 py-3 rounded-xl bg-white/60 backdrop-blur-sm border border-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800 placeholder-gray-400"
              />
            </div>

            {/* Пол */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Пол *
              </label>
              <select
                className="w-full px-4 py-3 rounded-xl bg-white/60 backdrop-blur-sm border border-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800"
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
                placeholder="Выберите интересы..."
                className="w-full px-4 py-3 rounded-xl bg-white/60 backdrop-blur-sm border border-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800 placeholder-gray-400"
              />
            </div>

            {/* Цель поиска */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Цель поиска *
              </label>
              <input
                type="text"
                placeholder="Выберите цели..."
                className="w-full px-4 py-3 rounded-xl bg-white/60 backdrop-blur-sm border border-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800 placeholder-gray-400"
              />
            </div>

            {/* Информация о себе */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Информация о себе
              </label>
              <textarea
                rows={4}
                placeholder="Расскажите о себе..."
                className="w-full px-4 py-3 rounded-xl bg-white/60 backdrop-blur-sm border border-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800 placeholder-gray-400 resize-none"
              />
            </div>

            {/* Кнопка сохранения */}
            <div className="pt-4">
              <Button variant="primary" size="lg" fullWidth>
                Сохранить профиль
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default ProfileEditPage

