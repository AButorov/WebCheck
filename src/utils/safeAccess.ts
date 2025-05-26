/**
 * Безопасный доступ к вложенным свойствам объекта
 */
export function safeGet<T = unknown>(obj: unknown, path: string, defaultValue?: T): T | undefined {
  try {
    const keys = path.split('.')
    let result: unknown = obj

    for (const key of keys) {
      if (result == null) {
        return defaultValue
      }
      if (typeof result === 'object' && result !== null && key in result) {
        result = (result as Record<string, unknown>)[key]
      } else {
        return defaultValue
      }
    }

    return (result as T) ?? defaultValue
  } catch {
    return defaultValue
  }
}

/**
 * Проверка наличия всех обязательных свойств
 */
export function hasRequiredProps<T extends object>(obj: unknown, props: (keyof T)[]): obj is T {
  if (!obj || typeof obj !== 'object') {
    return false
  }

  return props.every((prop) => prop in obj && (obj as Record<keyof T, unknown>)[prop] != null)
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
