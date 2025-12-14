import { motion } from 'framer-motion'
import PropTypes from 'prop-types'

/**
 * EffectOverlay - компонент для визуальных эффектов при свайпе
 * 
 * Показывает анимацию при свайпе карточки:
 * - Вправо: градиентная волна
 * - Влево: частицы, разлетающиеся в стороны
 */
const EffectOverlay = ({ direction, onComplete }) => {
  // Создаём массив частиц для анимации свайпа влево
  const particles = Array.from({ length: 20 }, (_, i) => i)

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      {direction === 'right' ? (
        <motion.div
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background: `linear-gradient(to right, 
              rgba(0, 255, 255, 0.1) 0%, 
              rgba(54, 207, 255, 0.2) 50%, 
              transparent 100%)`,
          }}
          onAnimationComplete={onComplete}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {particles.map((i) => {
            const angle = (Math.PI * 2 * i) / particles.length
            const distance = 150 + Math.random() * 100
            const x = Math.cos(angle) * distance
            const y = Math.sin(angle) * distance
            
            return (
              <motion.div
                key={i}
                initial={{ 
                  opacity: 1, 
                  scale: 1,
                  x: 0,
                  y: 0,
                }}
                animate={{ 
                  opacity: 0,
                  scale: 0,
                  x: x,
                  y: y,
                }}
                transition={{ 
                  duration: 0.7,
                  delay: Math.random() * 0.2,
                  ease: [0.25, 0.1, 0.25, 1]
                }}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  background: `radial-gradient(circle, 
                    rgba(0, 255, 255, 0.8) 0%, 
                    rgba(54, 207, 255, 0.6) 50%, 
                    transparent 100%)`,
                  boxShadow: '0 0 10px rgba(0, 255, 255, 0.8)',
                }}
              />
            )
          })}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            onAnimationComplete={onComplete}
            className="absolute inset-0"
          />
        </motion.div>
      )}
    </div>
  )
}

EffectOverlay.propTypes = {
  direction: PropTypes.oneOf(['left', 'right']).isRequired,
  onComplete: PropTypes.func.isRequired,
}

export default EffectOverlay

