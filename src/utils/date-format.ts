import { useI18n } from 'vue-i18n'

/**
 * Форматирует временную метку в читаемый формат даты и времени
 */
export function formatDate(timestamp: number): string {
  if (!timestamp) return ''
  
  const date = new Date(timestamp)
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/**
 * Форматирует ключ интервала в читаемую строку с использованием i18n
 */
export function formatInterval(intervalKey: string): string {
  const { t } = useI18n()
  return t(`popup.taskCard.intervals.${intervalKey}`)
}

/**
 * Рассчитывает процент оставшегося времени до следующей проверки
 */
export function formatTimeRemaining(lastCheckedAt: number, interval: string): number {
  const now = Date.now()
  const intervalMs = getIntervalMs(interval)
  const nextCheckAt = lastCheckedAt + intervalMs
  const remainingMs = Math.max(0, nextCheckAt - now)
  
  // Возвращаем процент оставшегося времени
  return Math.floor((remainingMs / intervalMs) * 100)
}

/**
 * Форматирует оставшееся время до следующей проверки в читаемом виде
 */
export function formatRemainingTimeText(lastCheckedAt: number, interval: string): string {
  const { t } = useI18n()
  const now = Date.now()
  const intervalMs = getIntervalMs(interval)
  const nextCheckAt = lastCheckedAt + intervalMs
  const remainingMs = Math.max(0, nextCheckAt - now)
  
  // Если время истекло
  if (remainingMs <= 0) {
    return t('popup.taskCard.nextCheck', { time: t('popup.taskCard.interval.15m') })
  }
  
  // Переводим в минуты/часы/дни
  const minutes = Math.floor(remainingMs / (60 * 1000))
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  const remainingMinutes = minutes % 60
  
  let timeString = ''
  
  if (days > 0) {
    timeString = `${days}d ${remainingHours}h`
  } else if (hours > 0) {
    timeString = `${hours}h ${remainingMinutes}m`
  } else {
    timeString = `${minutes}m`
  }
  
  return t('popup.taskCard.nextCheck', { time: timeString })
}

/**
 * Преобразует строковый интервал в миллисекунды
 */
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
