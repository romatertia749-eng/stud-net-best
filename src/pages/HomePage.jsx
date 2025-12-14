import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Card, Button } from '../components'

/**
 * HomePage - главная страница приложения
 * 
 * Показывается когда у пользователя ещё нет профиля
 * Содержит призыв к действию для создания профиля
 */
const HomePage = () => {
  const navigate = useNavigate()

  /**
   * Обработчик кнопки создания профиля
   * Перенаправляет на страницу создания профиля
   */
  const handleCreateProfile = () => {
    navigate('/profile')
  }

  return (
    <div className="min-w-[320px] min-h-[600px] max-w-2xl w-full mx-auto p-4 md:p-6 pb-20 md:pb-6 flex flex-col justify-center page-gradient" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
      <div className="space-y-8 md:space-y-12">
        <Card className="bg-white/30 backdrop-blur-xl border-2 border-white/50 shadow-2xl">
          <div className="relative p-4 md:p-5">
            <div className="absolute -top-3 -left-3 w-24 h-24 bg-gradient-to-br from-teal-400/30 to-cyan-400/30 rounded-full blur-2xl -z-10"></div>
            <div className="absolute -bottom-3 -right-3 w-32 h-32 bg-gradient-to-br from-emerald-400/30 to-teal-400/30 rounded-full blur-2xl -z-10"></div>
            
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 text-center leading-tight relative z-10 mb-4" style={{ fontFamily: "'La Bamba', cursive" }}>
              Ты в начале большого пути!
            </h1>
            <p className="text-lg md:text-xl font-semibold text-gray-800 text-center relative z-10">
              Заполни свой профиль и возвращайся за новыми знакомствами
            </p>
          </div>
        </Card>

        {/* Анимированные стрелки */}
        <div className="relative w-full flex justify-center items-center gap-4 md:gap-6 py-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <motion.svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              animate={{
                y: [0, -8, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <path
                d="M12 4L12 20M12 20L6 14M12 20L18 14"
                stroke="rgba(0, 180, 220, 0.9)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow)"
              />
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
            </motion.svg>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <motion.svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              animate={{
                y: [0, -8, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.2,
              }}
            >
              <path
                d="M12 4L12 20M12 20L6 14M12 20L18 14"
                stroke="rgba(0, 180, 220, 0.9)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow2)"
              />
              <defs>
                <filter id="glow2">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
            </motion.svg>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <motion.svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              animate={{
                y: [0, -8, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.4,
              }}
            >
              <path
                d="M12 4L12 20M12 20L6 14M12 20L18 14"
                stroke="rgba(0, 180, 220, 0.9)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow3)"
              />
              <defs>
                <filter id="glow3">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
            </motion.svg>
          </motion.div>
        </div>

        {/* CTA кнопка */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="w-full max-w-md mx-auto"
        >
          <Button
            variant="primary"
            onClick={handleCreateProfile}
            fullWidth
            size="lg"
            className="transform transition-all hover:scale-105 hover:shadow-xl"
          >
            Создать профиль для нетворкинга
          </Button>
        </motion.div>
      </div>
    </div>
  )
}

export default HomePage
