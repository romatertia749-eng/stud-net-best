/**
 * Debounce функция - откладывает выполнение функции до истечения задержки
 * @param {Function} func - функция для выполнения
 * @param {number} wait - задержка в миллисекундах
 * @returns {Function} - debounced функция
 */
export const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

import { useRef, useCallback } from 'react'

/**
 * Хук для использования debounce в React компонентах
 * @param {Function} callback - функция для debounce
 * @param {number} delay - задержка в миллисекундах
 * @returns {Function} - debounced функция
 */
export const useDebounce = (callback, delay) => {
  const timeoutRef = useRef(null)
  
  return useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      callback(...args)
    }, delay)
  }, [callback, delay])
}
