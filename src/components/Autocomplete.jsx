import { useState, useRef, useEffect } from 'react'
import PropTypes from 'prop-types'

/**
 * Autocomplete - компонент автодополнения
 * 
 * Позволяет вводить текст и выбирать из списка опций
 * Автоматически фильтрует опции по введённому тексту
 */
const Autocomplete = ({ options, value, onChange, placeholder, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false) // Открыт ли dropdown
  const [filteredOptions, setFilteredOptions] = useState(options) // Отфильтрованные опции
  const [inputValue, setInputValue] = useState(value || '') // Значение в input
  const wrapperRef = useRef(null) // Ссылка на контейнер (для закрытия при клике вне)

  // Синхронизируем inputValue с внешним value
  useEffect(() => {
    setInputValue(value || '')
  }, [value])

  // Фильтруем опции при изменении введённого текста
  useEffect(() => {
    if (inputValue) {
      // Фильтруем опции, которые содержат введённый текст (без учёта регистра)
      const filtered = options.filter(opt =>
        opt.toLowerCase().includes(inputValue.toLowerCase())
      )
      setFilteredOptions(filtered)
    } else {
      // Если текст пустой, показываем все опции
      setFilteredOptions(options)
    }
  }, [inputValue, options])

  // Закрываем dropdown при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false)
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

  /**
   * Обработчик изменения текста в input
   * Открывает dropdown и вызывает onChange
   */
  const handleInputChange = (e) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setIsOpen(true) // Открываем dropdown при вводе
    onChange(newValue) // Уведомляем родителя об изменении
  }

  /**
   * Обработчик выбора опции из списка
   * Устанавливает выбранное значение и закрывает dropdown
   */
  const handleSelect = (option) => {
    setInputValue(option)
    onChange(option)
    setIsOpen(false) // Закрываем dropdown после выбора
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className={`w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm ${className}`}
      />
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-xl border border-gray-200 max-h-60 overflow-y-auto">
          {filteredOptions.map((option, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(option)}
              className="w-full text-left px-4 py-3 hover:bg-teal-50 transition-colors text-sm"
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

Autocomplete.propTypes = {
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  className: PropTypes.string,
}

export default Autocomplete


