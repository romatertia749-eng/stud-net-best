import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import PropTypes from 'prop-types'

const navItems = [
  {
    path: '/profile',
    label: 'Профиль',
    iconPath: '/assets/stuff/icon_profile.png',
    iconName: 'profile'
  },
  {
    path: '/profiles',
    label: 'Анкеты',
    iconPath: '/assets/stuff/icon_ankets.png',
    iconName: 'ankets'
  },
  {
    path: '/network',
    label: 'Net-Лист',
    iconPath: '/assets/stuff/icon_handshake.png',
    iconName: 'handshake'
  }
]

const IconFallback = ({ name }) => {
  const icons = {
    profile: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    ankets: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    handshake: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    )
  }
  return icons[name] || icons.profile
}

IconFallback.propTypes = {
  name: PropTypes.string.isRequired
}

const NavItem = ({ item, isActive }) => {
  const [useFallback, setUseFallback] = useState(false)

  return (
    <>
      {isActive && (
        <motion.div
          layoutId="activeTab"
          className="absolute inset-0 bg-purple-100/50 rounded-xl"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
      <motion.div
        initial={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="relative z-10"
      >
        {!useFallback ? (
          <img
            src={item.iconPath}
            alt={item.label}
            className="w-6 h-6 object-contain"
            onError={() => setUseFallback(true)}
          />
        ) : (
          <IconFallback name={item.iconName} />
        )}
      </motion.div>
      <span className={`text-xs font-medium relative z-10 ${isActive ? 'text-purple-600' : 'text-gray-600'}`}>
        {item.label}
      </span>
    </>
  )
}

NavItem.propTypes = {
  item: PropTypes.object.isRequired,
  isActive: PropTypes.bool.isRequired
}

const BottomNav = ({ className = '' }) => {
  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-50 bg-white/20 backdrop-blur-md border-t border-white/20 shadow-lg safe-area-inset-bottom ${className}`}>
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item, index) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 relative ${
                isActive
                  ? 'text-purple-600'
                  : 'text-gray-600'
              }`
            }
          >
            {({ isActive }) => (
              <NavItem item={item} isActive={isActive} />
            )}
          </NavLink>
        ))}
      </div>
      {/* Безопасная зона для устройств с вырезом */}
      <div className="h-safe-area-inset-bottom bg-transparent" />
    </nav>
  )
}

BottomNav.propTypes = {
  className: PropTypes.string
}

export default BottomNav

