import { useState, useRef, useEffect } from 'react'
import PropTypes from 'prop-types'

const MultiSelect = ({ options, selected, onChange, placeholder, onAddCustom, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false)
        setShowCustomInput(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen])

  const handleToggle = (option) => {
    if (selected.includes(option)) {
      onChange(selected.filter(item => item !== option))
    } else {
      onChange([...selected, option])
    }
  }

  const handleAddCustom = () => {
    if (customValue.trim() && !selected.includes(customValue.trim())) {
      onAddCustom(customValue.trim())
      setCustomValue('')
      setShowCustomInput(false)
    }
  }

  const removeItem = (item) => {
    onChange(selected.filter(i => i !== item))
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm cursor-pointer bg-white min-h-[48px] flex items-center flex-wrap gap-2 ${className}`}
      >
        {selected.length === 0 ? (
          <span className="text-gray-400">{placeholder}</span>
        ) : (
          selected.map((item) => (
            <span
              key={item}
              className="px-2 py-1 bg-teal-100 text-teal-700 rounded-lg text-xs flex items-center gap-1"
            >
              {item}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeItem(item)
                }}
                className="hover:text-teal-900"
              >
                ×
              </button>
            </span>
          ))
        )}
        <svg
          className={`w-5 h-5 text-gray-400 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-xl border border-gray-200 max-h-60 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => handleToggle(option)}
              className={`w-full text-left px-4 py-3 hover:bg-teal-50 transition-colors text-sm flex items-center ${
                selected.includes(option) ? 'bg-teal-50' : ''
              }`}
            >
              <span className={`w-4 h-4 border-2 rounded mr-2 flex items-center justify-center ${
                selected.includes(option) ? 'bg-teal-500 border-teal-500' : 'border-gray-300'
              }`}>
                {selected.includes(option) && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              {option}
            </button>
          ))}
          {onAddCustom && (
            <div className="border-t border-gray-200 p-2">
              {!showCustomInput ? (
                <button
                  type="button"
                  onClick={() => setShowCustomInput(true)}
                  className="w-full text-left px-4 py-2 text-sm text-teal-600 hover:bg-teal-50 rounded-lg"
                >
                  + Добавить свой вариант
                </button>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    placeholder="Введите свой вариант..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddCustom()
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustom}
                    className="px-3 py-2 bg-teal-500 text-white rounded-lg text-sm hover:bg-teal-600"
                  >
                    Добавить
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

MultiSelect.propTypes = {
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
  selected: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  onAddCustom: PropTypes.func,
  className: PropTypes.string,
}

export default MultiSelect


