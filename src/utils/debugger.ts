/**
 * Debug утилита для отслеживания undefined errors
 */

// Глобальный перехватчик ошибок
export function setupGlobalErrorHandler(): void {
  // Перехват необработанных ошибок
  self.addEventListener('error', (event) => {
    console.error('[GLOBAL ERROR]', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
      stack: event.error?.stack,
    })
  })

  // Перехват rejected promises
  self.addEventListener('unhandledrejection', (event) => {
    console.error('[UNHANDLED REJECTION]', {
      reason: event.reason,
      promise: event.promise,
      stack: event.reason?.stack,
    })
  })
}

/**
 * Обёртка для безопасного вызова функций
 */
export function wrapFunction<T extends (...args: unknown[]) => unknown>(fn: T, name: string): T {
  return ((...args: Parameters<T>) => {
    try {
      console.log(`[DEBUG] Calling ${name} with args:`, args)
      const result = fn(...args)

      // Если это промис, добавляем обработку ошибок
      if (
        result &&
        typeof result === 'object' &&
        'catch' in result &&
        typeof (result as Promise<unknown>).catch === 'function'
      ) {
        return (result as Promise<unknown>).catch((error: unknown) => {
          console.error(`[DEBUG] Error in ${name}:`, error)
          throw error
        })
      }

      return result
    } catch (error) {
      console.error(`[DEBUG] Sync error in ${name}:`, error)
      throw error
    }
  }) as T
}
