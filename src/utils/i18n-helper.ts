// Вспомогательная функция для перевода с запасным вариантом
// Создаем новый файл, чтобы предоставить функцию перевода с резервным решением

import en from '~/locales/en.json'
import ru from '~/locales/ru.json'

// Запасные словари переводов
const fallbackMessages = { en, ru }

/**
 * Функция перевода с резервным решением
 * Сначала пытается использовать глобальную window.t, 
 * а если она недоступна, то использует встроенную логику
 * 
 * @param key - Ключ перевода (например, 'popup.taskCard.title')
 * @returns Переведенная строка или исходный ключ, если перевод не найден
 */
export function translate(key) {
  // Если глобальная функция доступна, используем её
  if (window.t && typeof window.t === 'function') {
    return window.t(key)
  }
  
  // Запасное решение на случай, если глобальная функция недоступна
  if (!key) return ''
  
  const userLang = navigator.language.split('-')[0] || 'en'
  const langMessages = fallbackMessages[userLang] || fallbackMessages.en
  const keys = key.split('.')
  let result = langMessages
  
  // Перемещение по вложенным ключам
  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = result[k]
    } else {
      return key // Возвращаем ключ, если не найден
    }
  }
  
  return typeof result === 'string' ? result : key
}
