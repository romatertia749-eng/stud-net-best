import { motion } from 'framer-motion'

/**
 * Loader - компонент индикатора загрузки
 * 
 * Показывает анимированный спиннер во время загрузки данных
 */
const Loader = () => {
  return (
    <div className="min-h-screen page-gradient flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* Анимированный спиннер */}
        <motion.div
          className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <p className="text-gray-700 text-sm font-medium">Загрузка...</p>
      </div>
    </div>
  )
}

export default Loader

