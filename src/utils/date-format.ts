export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString()
}

export function formatInterval(intervalKey: string, t: Function): string {
  return t(`popup.taskCard.intervals.${intervalKey}`)
}

export function formatTimeRemaining(lastCheckedAt: number, interval: string): number {
  const now = Date.now()
  const intervalMs = getIntervalMs(interval)
  const nextCheckAt = lastCheckedAt + intervalMs
  const remainingMs = Math.max(0, nextCheckAt - now)
  
  // Возвращаем процент оставшегося времени
  return Math.floor((remainingMs / intervalMs) * 100)
}

// Форматирование оставшегося времени в читаемом виде
export function formatRemainingTimeText(lastCheckedAt: number, interval: string): string {
  const now = Date.now()
  const intervalMs = getIntervalMs(interval)
  const nextCheckAt = lastCheckedAt + intervalMs
  const remainingMs = Math.max(0, nextCheckAt - now)
  
  // Если время истекло
  if (remainingMs <= 0) {
    return 'Следующая проверка в ближайшее время'
  }
  
  // Переводим в минуты/часы
  const minutes = Math.floor(remainingMs / (60 * 1000))
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (hours > 0) {
    return `${hours} ч ${remainingMinutes} мин`
  } else {
    return `${minutes} мин`
  }
}

export function getIntervalMs(interval: string): number {
  switch (interval) {
    case '15m':
      return 15 * 60 * 1000
    case '1h':
      return 60 * 60 * 1000
    case '3h':
      return 3 * 60 * 60 * 1000
    case '1d':
      return 24 * 60 * 60 * 1000
    default:
      return 60 * 60 * 1000 // default to 1 hour
  }
}
