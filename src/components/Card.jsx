import { motion } from 'framer-motion'
import PropTypes from 'prop-types'

/**
 * Card - универсальный компонент карточки
 * 
 * Используется для отображения контента в стилизованных карточках
 * Поддерживает анимации при наведении и клике
 */
const Card = ({
  children,
  className = '',
  onClick,
  hoverable = false,
  ...props
}) => {
  // Базовые стили карточки (полупрозрачный фон с размытием)
  const baseStyles = 'bg-white/40 backdrop-blur-xl rounded-2xl p-6 shadow-lg shadow-black/10 border border-white/30'
  
  // Объединяем классы
  const combinedClassName = `${baseStyles} ${onClick || hoverable ? 'cursor-pointer' : ''} ${className}`.trim()
  
  const cardContent = (
    <div className={combinedClassName} onClick={onClick} {...props}>
      {children}
    </div>
  )
  
  // Если карточка интерактивная, оборачиваем в motion.div для анимаций
  if (hoverable || onClick) {
    return (
      <motion.div
        whileHover={hoverable ? { scale: 1.02, y: -2 } : {}} // Анимация при наведении
        whileTap={onClick ? { scale: 0.98 } : {}} // Анимация при клике
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {cardContent}
      </motion.div>
    )
  }
  
  return cardContent
}

Card.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  onClick: PropTypes.func,
  hoverable: PropTypes.bool
}

export default Card

