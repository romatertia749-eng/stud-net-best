import { motion } from 'framer-motion'
import PropTypes from 'prop-types'
import { icons } from '../assets/icons'

/**
 * Header - компонент шапки приложения
 * 
 * Отображает:
 * - Логотип и название приложения
 * - Количество коннектов и статус
 */
const Header = ({
  appName = 'StudNet',
  connectionsCount = 0,
  statusText = 'Один в поле',
  logoPath = icons.logo,
  className = ''
}) => {
  return (
    <header className={`sticky top-0 z-50 bg-white/20 backdrop-blur-md border-b border-white/20 shadow-sm ${className}`}>
      <div className="flex items-center justify-between px-4 py-3">
        {/* Логотип слева */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-full flex items-center justify-center"
          >
            <img
              src={logoPath}
              alt="Logo"
              className="w-10 h-10 object-contain"
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.parentElement.innerHTML = '<span class="text-purple-600 font-bold text-lg">SN</span>'
              }}
            />
          </motion.div>
          <h1 className="text-lg font-bold text-gray-800 hidden sm:block">
            {appName}
          </h1>
        </div>
        
        {/* Статус коннектов справа */}
        <div className="flex-shrink-0">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="px-3 py-1.5 rounded-lg bg-blue-100/80 backdrop-blur-sm border border-blue-200/50"
          >
            <span className="text-sm font-medium text-gray-700">
              Коннекты: {connectionsCount} · {statusText}
            </span>
          </motion.div>
        </div>
      </div>
    </header>
  )
}

Header.propTypes = {
  appName: PropTypes.string,
  connectionsCount: PropTypes.number,
  statusText: PropTypes.string,
  logoPath: PropTypes.string,
  className: PropTypes.string
}

export default Header

