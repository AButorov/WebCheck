// Вспомогательная функция для перевода с запасным вариантом
// Создаем новый файл, чтобы предоставить функцию перевода с резервным решением

import en from '~/locales/en.json'
import ru from '~/locales/ru.json'

// Запасные словари переводов
const fallbackMessages: Record<string, Record<string, unknown>> = { en, ru }

/**
 * Функция перевода с резервным решением
 * Сначала пытается использовать глобальную window.t,
 * а если она недоступна, то использует встроенную логику
 *
 * @param key - Ключ перевода (например, 'popup.taskCard.title')
 * @returns Переведенная строка или исходный ключ, если перевод не найден
 */
export function translate(key: string): string {
  try {
    // Защита от ошибок
    if (!key) return ''

    // Если глобальная функция доступна, используем её с защитой от ошибок
    if (window.t && typeof window.t === 'function') {
      try {
        return window.t(key)
      } catch (err) {
        console.error('[i18n-helper] Error in window.t:', err)
        // Если произошла ошибка, используем запасное решение
      }
    }

    // Запасное решение на случай, если глобальная функция недоступна или вызвала ошибку
    const userLang = navigator.language.split('-')[0] || 'en'
    const langMessages = fallbackMessages[userLang] || fallbackMessages.en
    const keys = key.split('.')
    let result: unknown = langMessages

    // Перемещение по вложенным ключам
    for (const k of keys) {
      if (result && typeof result === 'object' && result !== null && k in result) {
        result = (result as Record<string, unknown>)[k]
      } else {
        return key // Возвращаем ключ, если не найден
      }
    }

    return typeof result === 'string' ? result : key
  } catch (err) {
    // В случае любой ошибки возвращаем ключ
    console.error('[i18n-helper] Error in translate function:', err)
    return key
  }
}
