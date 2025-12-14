import PropTypes from 'prop-types'

/**
 * Button - универсальный компонент кнопки
 * 
 * Поддерживает различные варианты стилей и размеров
 * Имеет анимации при наведении и нажатии
 */
const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = '',
  disabled = false,
  fullWidth = false,
  size = 'md',
  type = 'button',
  ...props 
}) => {
  // Базовые классы для всех кнопок
  const baseClasses = `${fullWidth ? 'w-full' : ''} min-h-[48px] px-5 py-3 rounded-xl font-medium text-base transition-all duration-200 active:scale-[0.97] active:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center touch-manipulation select-none`
  
  // Классы для разных размеров
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm min-h-[40px]',
    md: 'px-5 py-3 text-base min-h-[48px]',
    lg: 'px-8 py-4 text-lg min-h-[56px]'
  }
  
  // Классы для разных вариантов стилей
  const variantClasses = {
    primary: 'backdrop-blur-xl text-gray-900 border-2 font-medium',
    secondary: 'bg-gradient-to-r from-cyan-400/30 to-blue-400/30 backdrop-blur-xl text-gray-900 border-2 border-cyan-300/50 shadow-lg shadow-cyan-500/30 hover:from-cyan-400/40 hover:to-blue-400/40 hover:border-cyan-400/70 hover:shadow-xl hover:shadow-cyan-500/40 active:from-cyan-500/50 active:to-blue-500/50 font-medium',
    danger: 'bg-gradient-to-r from-red-400/30 to-orange-400/30 backdrop-blur-xl text-red-800 border-2 border-red-300/50 shadow-lg shadow-red-500/30 hover:from-red-400/40 hover:to-orange-400/40 hover:border-red-400/70 hover:shadow-xl hover:shadow-red-500/40 active:from-red-500/50 active:to-orange-500/50 font-medium',
    outline: 'bg-white/25 backdrop-blur-xl text-gray-800 border-2 border-white/40 hover:bg-white/35 hover:border-white/50 active:bg-white/40 shadow-md font-medium',
    ghost: 'backdrop-blur-xl text-gray-900 border-2 font-medium',
  }

  // Инлайн стили для primary кнопки с голубым неоном
  const primaryStyle = variant === 'primary' ? {
    background: `linear-gradient(to right, rgba(0, 255, 255, 0.26), rgba(54, 207, 255, 0.32))`,
    borderColor: 'rgba(0, 255, 255, 0.5)',
    boxShadow: '0 10px 25px rgba(0, 255, 255, 0.3), 0 0 20px rgba(54, 207, 255, 0.2)',
  } : {}

  const primaryHoverStyle = variant === 'primary' ? {
    background: `linear-gradient(to right, rgba(0, 255, 255, 0.35), rgba(54, 207, 255, 0.42))`,
    borderColor: 'rgba(0, 255, 255, 0.7)',
    boxShadow: '0 15px 35px rgba(0, 255, 255, 0.4), 0 0 30px rgba(54, 207, 255, 0.3)',
  } : {}

  const primaryActiveStyle = variant === 'primary' ? {
    background: `linear-gradient(to right, rgba(0, 255, 255, 0.45), rgba(54, 207, 255, 0.52))`,
    borderColor: 'rgba(0, 255, 255, 0.8)',
  } : {}

  // Стили для ghost кнопки с красным неоном (для кнопки "Отмена")
  const ghostStyle = variant === 'ghost' ? {
    background: `linear-gradient(to right, rgba(255, 82, 82, 0.2), rgba(255, 107, 107, 0.25))`,
    borderColor: 'rgba(255, 82, 82, 0.4)',
    boxShadow: '0 8px 20px rgba(255, 82, 82, 0.25), 0 0 15px rgba(255, 107, 107, 0.15)',
  } : {}

  const ghostHoverStyle = variant === 'ghost' ? {
    background: `linear-gradient(to right, rgba(255, 82, 82, 0.28), rgba(255, 107, 107, 0.33))`,
    borderColor: 'rgba(255, 82, 82, 0.6)',
    boxShadow: '0 12px 28px rgba(255, 82, 82, 0.35), 0 0 22px rgba(255, 107, 107, 0.25)',
  } : {}

  const ghostActiveStyle = variant === 'ghost' ? {
    background: `linear-gradient(to right, rgba(255, 82, 82, 0.35), rgba(255, 107, 107, 0.4))`,
    borderColor: 'rgba(255, 82, 82, 0.7)',
  } : {}

  // Определяем начальный стиль в зависимости от варианта
  const initialStyle = variant === 'primary' ? primaryStyle : variant === 'ghost' ? ghostStyle : {}

  return (
    <button
      type={type}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      style={initialStyle}
      onMouseEnter={(e) => {
        if (!disabled) {
          if (variant === 'primary') {
            Object.assign(e.target.style, primaryHoverStyle)
          } else if (variant === 'ghost') {
            Object.assign(e.target.style, ghostHoverStyle)
          }
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          if (variant === 'primary') {
            Object.assign(e.target.style, primaryStyle)
          } else if (variant === 'ghost') {
            Object.assign(e.target.style, ghostStyle)
          }
        }
      }}
      onMouseDown={(e) => {
        if (!disabled) {
          if (variant === 'primary') {
            Object.assign(e.target.style, primaryActiveStyle)
          } else if (variant === 'ghost') {
            Object.assign(e.target.style, ghostActiveStyle)
          }
        }
      }}
      onMouseUp={(e) => {
        if (!disabled) {
          if (variant === 'primary') {
            Object.assign(e.target.style, primaryHoverStyle)
          } else if (variant === 'ghost') {
            Object.assign(e.target.style, ghostHoverStyle)
          }
        }
      }}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

Button.propTypes = {
  variant: PropTypes.oneOf(['primary', 'secondary', 'ghost', 'danger', 'outline']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  fullWidth: PropTypes.bool,
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  type: PropTypes.oneOf(['button', 'submit', 'reset'])
}

export default Button

