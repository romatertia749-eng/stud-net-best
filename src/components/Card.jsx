import { motion } from 'framer-motion'
import PropTypes from 'prop-types'

const Card = ({
  children,
  className = '',
  onClick,
  hoverable = false,
  ...props
}) => {
  const baseStyles = 'bg-white/40 backdrop-blur-xl rounded-2xl p-6 shadow-lg shadow-black/10 border border-white/30'
  
  const combinedClassName = `${baseStyles} ${onClick || hoverable ? 'cursor-pointer' : ''} ${className}`.trim()
  
  const cardContent = (
    <div className={combinedClassName} onClick={onClick} {...props}>
      {children}
    </div>
  )
  
  if (hoverable || onClick) {
    return (
      <motion.div
        whileHover={hoverable ? { scale: 1.02, y: -2 } : {}}
        whileTap={onClick ? { scale: 0.98 } : {}}
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

