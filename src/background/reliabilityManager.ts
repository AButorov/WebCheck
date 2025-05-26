/**
 * Менеджер надёжности для offscreen-документов WebCheck
 *
 * Этот модуль отвечает за:
 * 1. Мониторинг здоровья offscreen-документов
 * 2. Автоматическое восстановление при сбоях
 * 3. Управление жизненным циклом документов
 * 4. Обработку критических ошибок
 */

import browser from 'webextension-polyfill'
import {
  ensureOffscreenDocument,
  hasOffscreenDocument,
  closeOffscreenDocument,
  pingOffscreenDocument,
  invalidateCache,
} from './offscreenManager'

// Конфигурация менеджера надёжности
const RELIABILITY_CONFIG = {
  HEALTH_CHECK_INTERVAL: 30000, // 30 секунд между проверками здоровья
  MAX_RECOVERY_ATTEMPTS: 3, // Максимальное количество попыток восстановления
  RECOVERY_DELAY: 5000, // 5 секунд задержка между попытками восстановления
  DOCUMENT_IDLE_TIMEOUT: 300000, // 5 минут бездействия перед закрытием документа
  ERROR_THRESHOLD: 5, // Количество ошибок подряд перед принудительным восстановлением
  PING_TIMEOUT: 10000, // 10 секунд таймаут для ping
}

// Состояние менеджера надёжности
interface ReliabilityState {
  isHealthy: boolean
  lastHealthCheck: number
  consecutiveErrors: number
  totalRecoveries: number
  lastRecoveryAt: number
  lastActivityAt: number
  currentErrors: string[]
}

// Текущее состояние
let reliabilityState: ReliabilityState = {
  isHealthy: true,
  lastHealthCheck: 0,
  consecutiveErrors: 0,
  totalRecoveries: 0,
  lastRecoveryAt: 0,
  lastActivityAt: Date.now(),
  currentErrors: [],
}

// Интервал проверки здоровья
let healthCheckInterval: NodeJS.Timeout | null = null

// Флаг активности восстановления
let isRecovering = false

/**
 * Инициализация менеджера надёжности
 */
export function initReliabilityManager(): void {
  console.log('[RELIABILITY] Initializing reliability manager')

  // Запускаем периодические проверки здоровья
  startHealthChecks()

  // Устанавливаем обработчики событий браузера
  setupBrowserEventHandlers()

  console.log('[RELIABILITY] Reliability manager initialized')
}

/**
 * Остановка менеджера надёжности
 */
export function stopReliabilityManager(): void {
  console.log('[RELIABILITY] Stopping reliability manager')

  if (healthCheckInterval) {
    clearInterval(healthCheckInterval)
    healthCheckInterval = null
  }

  console.log('[RELIABILITY] Reliability manager stopped')
}

/**
 * Запуск периодических проверок здоровья
 */
function startHealthChecks(): void {
  // Останавливаем предыдущий интервал, если он был
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval)
  }

  // Запускаем новый интервал
  healthCheckInterval = setInterval(async () => {
    await performHealthCheck()
  }, RELIABILITY_CONFIG.HEALTH_CHECK_INTERVAL)

  // Выполняем первую проверку сразу
  performHealthCheck()
}

/**
 * Выполнение проверки здоровья offscreen-документа
 */
async function performHealthCheck(): Promise<boolean> {
  const now = Date.now()
  reliabilityState.lastHealthCheck = now

  console.log('[RELIABILITY] Performing health check')

  try {
    // Сбрасываем кэш для точной проверки
    invalidateCache()

    // Проверяем существование документа
    const documentExists = await hasOffscreenDocument()

    if (!documentExists) {
      console.log('[RELIABILITY] Document does not exist')
      reliabilityState.isHealthy = false
      addError('Document does not exist')
      return false
    }

    // Проверяем отзывчивость документа
    const isResponsive = await performPingWithTimeout()

    if (!isResponsive) {
      console.warn('[RELIABILITY] Document is not responsive')
      reliabilityState.isHealthy = false
      addError('Document is not responsive')
      return false
    }

    // Все проверки прошли успешно
    console.log('[RELIABILITY] Health check passed')
    reliabilityState.isHealthy = true
    reliabilityState.consecutiveErrors = 0
    reliabilityState.currentErrors = []

    // Проверяем, нужно ли закрыть документ из-за бездействия
    checkIdleTimeout()

    return true
  } catch (error) {
    console.error('[RELIABILITY] Health check failed:', error)
    reliabilityState.isHealthy = false
    addError(error instanceof Error ? error.message : String(error))
    return false
  }
}

/**
 * Ping с таймаутом
 */
async function performPingWithTimeout(): Promise<boolean> {
  try {
    const pingPromise = pingOffscreenDocument()
    const timeoutPromise = new Promise<boolean>((_, reject) => {
      setTimeout(() => reject(new Error('Ping timeout')), RELIABILITY_CONFIG.PING_TIMEOUT)
    })

    return await Promise.race([pingPromise, timeoutPromise])
  } catch (error) {
    console.warn('[RELIABILITY] Ping failed:', error)
    return false
  }
}

/**
 * Добавление ошибки в список текущих ошибок
 */
function addError(error: string): void {
  reliabilityState.currentErrors.push(error)
  reliabilityState.consecutiveErrors++

  // Ограничиваем размер списка ошибок
  if (reliabilityState.currentErrors.length > 10) {
    reliabilityState.currentErrors = reliabilityState.currentErrors.slice(-10)
  }

  // Проверяем, нужно ли запустить восстановление
  if (reliabilityState.consecutiveErrors >= RELIABILITY_CONFIG.ERROR_THRESHOLD) {
    console.warn(
      `[RELIABILITY] Error threshold reached (${reliabilityState.consecutiveErrors} errors)`
    )
    triggerRecovery()
  }
}

/**
 * Запуск процесса восстановления
 */
async function triggerRecovery(): Promise<void> {
  if (isRecovering) {
    console.log('[RELIABILITY] Recovery already in progress')
    return
  }

  isRecovering = true
  console.log('[RELIABILITY] Starting recovery process')

  let recoverySuccess = false

  for (let attempt = 1; attempt <= RELIABILITY_CONFIG.MAX_RECOVERY_ATTEMPTS; attempt++) {
    console.log(
      `[RELIABILITY] Recovery attempt ${attempt}/${RELIABILITY_CONFIG.MAX_RECOVERY_ATTEMPTS}`
    )

    try {
      // Закрываем текущий документ
      await forceCloseDocument()

      // Ждём некоторое время
      await delay(RELIABILITY_CONFIG.RECOVERY_DELAY)

      // Создаём новый документ
      await ensureOffscreenDocument()

      // Проверяем, что новый документ работает
      const isHealthy = await performHealthCheck()

      if (isHealthy) {
        console.log(`[RELIABILITY] Recovery successful on attempt ${attempt}`)
        recoverySuccess = true
        break
      } else {
        console.warn(`[RELIABILITY] Recovery attempt ${attempt} failed - document not healthy`)
      }
    } catch (error) {
      console.error(`[RELIABILITY] Recovery attempt ${attempt} failed:`, error)
    }

    // Задержка перед следующей попыткой
    if (attempt < RELIABILITY_CONFIG.MAX_RECOVERY_ATTEMPTS) {
      await delay(RELIABILITY_CONFIG.RECOVERY_DELAY)
    }
  }

  if (recoverySuccess) {
    reliabilityState.totalRecoveries++
    reliabilityState.lastRecoveryAt = Date.now()
    reliabilityState.consecutiveErrors = 0
    reliabilityState.currentErrors = []
    reliabilityState.isHealthy = true
    console.log('[RELIABILITY] Recovery completed successfully')
  } else {
    console.error('[RELIABILITY] Recovery failed after all attempts')
    reliabilityState.isHealthy = false
  }

  isRecovering = false
}

/**
 * Принудительное закрытие документа
 */
async function forceCloseDocument(): Promise<void> {
  try {
    // Сначала проверяем, существует ли документ
    const exists = await hasOffscreenDocument()

    if (!exists) {
      console.log('[RELIABILITY] Document does not exist, skipping close')
      return
    }

    console.log('[RELIABILITY] Force closing offscreen document')
    await closeOffscreenDocument()
  } catch (error) {
    // Игнорируем ошибки при закрытии - возможно, документ уже закрыт
    console.log('[RELIABILITY] Error closing document (may be already closed):', error)
  }
}

/**
 * Проверка таймаута бездействия
 */
function checkIdleTimeout(): void {
  const now = Date.now()
  const idleTime = now - reliabilityState.lastActivityAt

  if (idleTime > RELIABILITY_CONFIG.DOCUMENT_IDLE_TIMEOUT) {
    console.log(
      `[RELIABILITY] Document idle for ${Math.round(idleTime / 1000)}s, closing to save resources`
    )

    // Закрываем документ для экономии ресурсов
    forceCloseDocument().catch((error) => {
      console.warn('[RELIABILITY] Error closing idle document:', error)
    })
  }
}

/**
 * Регистрация активности
 */
export function registerActivity(): void {
  reliabilityState.lastActivityAt = Date.now()
  console.log('[RELIABILITY] Activity registered')
}

/**
 * Получение состояния надёжности
 */
export function getReliabilityState(): ReliabilityState & {
  isRecovering: boolean
  config: typeof RELIABILITY_CONFIG
} {
  return {
    ...reliabilityState,
    isRecovering,
    config: { ...RELIABILITY_CONFIG },
  }
}

/**
 * Принудительное восстановление (для отладки)
 */
export async function forceRecovery(): Promise<void> {
  console.log('[RELIABILITY] Force recovery requested')
  await triggerRecovery()
}

/**
 * Сброс состояния надёжности
 */
export function resetReliabilityState(): void {
  reliabilityState = {
    isHealthy: true,
    lastHealthCheck: 0,
    consecutiveErrors: 0,
    totalRecoveries: 0,
    lastRecoveryAt: 0,
    lastActivityAt: Date.now(),
    currentErrors: [],
  }
  console.log('[RELIABILITY] State reset')
}

/**
 * Безопасная обёртка для выполнения операций с offscreen-документом
 */
export async function withReliability<T>(
  operation: () => Promise<T>,
  maxRetries: number = 2
): Promise<T> {
  registerActivity()

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      // Проверяем здоровье документа перед операцией
      if (!reliabilityState.isHealthy) {
        console.warn('[RELIABILITY] Document not healthy, attempting recovery')
        await triggerRecovery()
      }

      // Выполняем операцию
      const result = await operation()

      // Операция успешна
      return result
    } catch (error) {
      console.error(`[RELIABILITY] Operation failed on attempt ${attempt}:`, error)

      // Добавляем ошибку в статистику
      addError(error instanceof Error ? error.message : String(error))

      // Если это не последняя попытка, пробуем восстановить
      if (attempt <= maxRetries) {
        console.log(`[RELIABILITY] Attempting recovery before retry ${attempt + 1}`)
        await triggerRecovery()
        await delay(1000) // Небольшая задержка перед повтором
      } else {
        // Исчерпаны все попытки
        throw new Error(
          `Operation failed after ${maxRetries + 1} attempts: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }
  }

  throw new Error('Unexpected end of withReliability function')
}

/**
 * Настройка обработчиков событий браузера
 */
function setupBrowserEventHandlers(): void {
  // Обработчик запуска браузера
  if (browser.runtime.onStartup) {
    browser.runtime.onStartup.addListener(() => {
      console.log('[RELIABILITY] Browser startup detected, resetting state')
      resetReliabilityState()
    })
  }

  // Обработчик установки/обновления расширения
  browser.runtime.onInstalled.addListener(() => {
    console.log('[RELIABILITY] Extension installed/updated, resetting state')
    resetReliabilityState()
  })

  console.log('[RELIABILITY] Browser event handlers set up')
}

/**
 * Диагностика состояния системы
 */
export async function performDiagnostics(): Promise<{
  documentExists: boolean
  documentResponsive: boolean
  reliabilityHealthy: boolean
  consecutiveErrors: number
  totalRecoveries: number
  lastErrors: string[]
  recommendations: string[]
}> {
  console.log('[RELIABILITY] Performing system diagnostics')

  const documentExists = await hasOffscreenDocument()
  const documentResponsive = documentExists ? await performPingWithTimeout() : false

  const recommendations: string[] = []

  if (!documentExists) {
    recommendations.push('Document does not exist - will be created on next operation')
  }

  if (documentExists && !documentResponsive) {
    recommendations.push('Document is not responsive - consider force recovery')
  }

  if (reliabilityState.consecutiveErrors > 0) {
    recommendations.push(`${reliabilityState.consecutiveErrors} consecutive errors detected`)
  }

  if (reliabilityState.totalRecoveries > 5) {
    recommendations.push('High number of recoveries - check for underlying issues')
  }

  if (recommendations.length === 0) {
    recommendations.push('System appears to be functioning normally')
  }

  return {
    documentExists,
    documentResponsive,
    reliabilityHealthy: reliabilityState.isHealthy,
    consecutiveErrors: reliabilityState.consecutiveErrors,
    totalRecoveries: reliabilityState.totalRecoveries,
    lastErrors: [...reliabilityState.currentErrors],
    recommendations,
  }
}

/**
 * Вспомогательная функция для задержки
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
