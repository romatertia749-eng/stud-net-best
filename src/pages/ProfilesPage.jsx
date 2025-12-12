import { useState } from 'react'
import { Card, Button } from '../components'
import { motion } from 'framer-motion'

const ProfilesPage = () => {
  const [activeTab, setActiveTab] = useState('all')

  return (
    <div className="min-h-screen page-gradient pb-20 pt-4">
      <div className="px-4">
        {/* Табы */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
              activeTab === 'all'
                ? 'bg-white/60 backdrop-blur-sm text-purple-600 shadow-md'
                : 'bg-white/30 backdrop-blur-sm text-gray-600'
            }`}
          >
            Все анкеты
          </button>
          <button
            onClick={() => setActiveTab('incoming')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
              activeTab === 'incoming'
                ? 'bg-white/60 backdrop-blur-sm text-purple-600 shadow-md'
                : 'bg-white/30 backdrop-blur-sm text-gray-600'
            }`}
          >
            Входящие коннекты
          </button>
        </div>

        {/* Контент в зависимости от таба */}
        {activeTab === 'all' ? (
          <div className="h-96 flex items-center justify-center">
            <p className="text-gray-600">Контент всех анкет</p>
          </div>
        ) : (
          <Card className="text-center py-12">
            <div className="mb-6">
              <svg
                className="w-16 h-16 mx-auto text-yellow-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </div>
            <p className="text-gray-600 mb-6 text-base">
              Пока никто не лайкнул тебя
            </p>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => setActiveTab('all')}
            >
              Вернуться к анкетам
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}

export default ProfilesPage

