/**
 * Безопасный доступ к вложенным свойствам объекта
 */
export function safeGet<T = any>(
  obj: any,
  path: string,
  defaultValue?: T
): T | undefined {
  try {
    const keys = path.split('.')
    let result = obj
    
    for (const key of keys) {
      if (result == null) {
        return defaultValue
      }
      result = result[key]
    }
    
    return result ?? defaultValue
  } catch {
    return defaultValue
  }
}

/**
 * Проверка наличия всех обязательных свойств
 */
export function hasRequiredProps<T extends object>(
  obj: any,
  props: (keyof T)[]
): obj is T {
  if (!obj || typeof obj !== 'object') {
    return false
  }
  
  return props.every(prop => prop in obj && obj[prop] != null)
}

/**
 * Безопасное выполнение функции с fallback
 */
export async function safeTry<T>(
  fn: () => T | Promise<T>,
  fallback: T,
  errorHandler?: (error: unknown) => void
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (errorHandler) {
      errorHandler(error)
    }
    return fallback
  }
}
