/**
 * Менеджер надежности системы коммуникации
 * Отслеживает состояние content scripts и восстанавливает связь при необходимости
 */

import browser from 'webextension-polyfill'
import { checkContentScriptReady, injectContentScriptsIntoAllTabs } from './safeMessaging'

interface TabState {
  id: number
  url?: string
  contentScriptReady: boolean
  lastPingTime: number
  injectionAttempts: number
  lastInjectionTime: number
}

export class ReliabilityManager {
  private tabStates = new Map<number, TabState>()
  private healthCheckInterval: number | null = null
  private readonly HEALTH_CHECK_INTERVAL = 30000 // 30 секунд
  private readonly MAX_INJECTION_ATTEMPTS = 3
  private readonly INJECTION_COOLDOWN = 10000 // 10 секунд

  constructor() {
    console.log('[RELIABILITY] Reliability manager initialized')
    this.setupEventListeners()
    this.startHealthChecks()
  }

  /**
   * Настройка обработчиков событий браузера
   */
  private setupEventListeners(): void {
    // Отслеживание создания новых табов
    browser.tabs.onCreated.addListener((tab) => {
      if (tab.id) {
        this.addTab(tab.id, tab.url)
      }
    })

    // Отслеживание обновления табов
    browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        this.updateTab(tabId, tab.url)

        // Проверяем готовность content script после загрузки страницы
        setTimeout(() => {
          this.checkTabHealth(tabId)
        }, 1000)
      }
    })

    // Отслеживание закрытия табов
    browser.tabs.onRemoved.addListener((tabId) => {
      this.removeTab(tabId)
    })

    // Отслеживание сообщений о готовности content script
    browser.runtime.onMessage.addListener((message, sender) => {
      if (message.action === 'contentScriptReady' && sender.tab?.id) {
        this.markTabAsReady(sender.tab.id)
      }
    })
  }

  /**
   * Добавление нового таба в отслеживание
   */
  private addTab(tabId: number, url?: string): void {
    this.tabStates.set(tabId, {
      id: tabId,
      url,
      contentScriptReady: false,
      lastPingTime: 0,
      injectionAttempts: 0,
      lastInjectionTime: 0,
    })

    console.log(`[RELIABILITY] Added tab ${tabId} to monitoring`)
  }

  /**
   * Обновление информации о табе
   */
  private updateTab(tabId: number, url: string): void {
    const tabState = this.tabStates.get(tabId)
    if (tabState) {
      tabState.url = url
      tabState.contentScriptReady = false // Сбрасываем статус при обновлении страницы
      console.log(`[RELIABILITY] Updated tab ${tabId} URL: ${url}`)
    } else {
      this.addTab(tabId, url)
    }
  }

  /**
   * Удаление таба из отслеживания
   */
  private removeTab(tabId: number): void {
    this.tabStates.delete(tabId)
    console.log(`[RELIABILITY] Removed tab ${tabId} from monitoring`)
  }

  /**
   * Отметка таба как готового
   */
  private markTabAsReady(tabId: number): void {
    const tabState = this.tabStates.get(tabId)
    if (tabState) {
      tabState.contentScriptReady = true
      tabState.lastPingTime = Date.now()
      console.log(`[RELIABILITY] Tab ${tabId} marked as ready`)
    }
  }

  /**
   * Запуск периодических проверок здоровья
   */
  private startHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }

    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck()
    }, this.HEALTH_CHECK_INTERVAL) as unknown as number

    console.log('[RELIABILITY] Health checks started')
  }

  /**
   * Остановка проверок здоровья
   */
  public stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
      console.log('[RELIABILITY] Health checks stopped')
    }
  }

  /**
   * Выполнение проверки здоровья всех табов
   */
  private async performHealthCheck(): Promise<void> {
    console.log('[RELIABILITY] Performing health check')

    try {
      // Получаем список всех табов
      const tabs = await browser.tabs.query({})

      // Проверяем каждый таб
      for (const tab of tabs) {
        if (tab.id) {
          await this.checkTabHealth(tab.id)
        }
      }

      // Очищаем состояния для несуществующих табов
      const existingTabIds = new Set(tabs.map((tab) => tab.id).filter(Boolean))
      for (const tabId of this.tabStates.keys()) {
        if (!existingTabIds.has(tabId)) {
          this.removeTab(tabId)
        }
      }
    } catch (error) {
      console.error('[RELIABILITY] Error during health check:', error)
    }
  }

  /**
   * Проверка здоровья конкретного таба
   */
  private async checkTabHealth(tabId: number): Promise<boolean> {
    try {
      const tab = await browser.tabs.get(tabId)

      // Проверяем, что таб подходит для инжекции content script
      if (!tab.url || this.isSystemUrl(tab.url)) {
        return false
      }

      // Обновляем состояние таба
      if (!this.tabStates.has(tabId)) {
        this.addTab(tabId, tab.url)
      }

      // Проверяем готовность content script
      const isReady = await checkContentScriptReady(tabId, 3000)

      if (isReady) {
        this.markTabAsReady(tabId)
        return true
      } else {
        console.log(`[RELIABILITY] Tab ${tabId} content script not ready, attempting recovery`)
        return await this.recoverTab(tabId)
      }
    } catch (error) {
      console.warn(`[RELIABILITY] Error checking tab ${tabId} health:`, error)
      return false
    }
  }

  /**
   * Восстановление работы content script в табе
   */
  private async recoverTab(tabId: number): Promise<boolean> {
    const tabState = this.tabStates.get(tabId)
    if (!tabState) {
      return false
    }

    const now = Date.now()

    // Проверяем, не превышен ли лимит попыток инжекции
    if (tabState.injectionAttempts >= this.MAX_INJECTION_ATTEMPTS) {
      const timeSinceLastInjection = now - tabState.lastInjectionTime
      if (timeSinceLastInjection < this.INJECTION_COOLDOWN) {
        return false // Еще в периоде охлаждения
      } else {
        // Сбрасываем счетчик после периода охлаждения
        tabState.injectionAttempts = 0
      }
    }

    try {
      console.log(`[RELIABILITY] Attempting to recover tab ${tabId}`)

      // Пробуем инжектировать content script
      await browser.scripting.executeScript({
        target: { tabId },
        files: ['assets/js/index-legacy.js.js'],
      })

      tabState.injectionAttempts++
      tabState.lastInjectionTime = now

      // Ждем инициализации и проверяем готовность
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const isReady = await checkContentScriptReady(tabId, 3000)

      if (isReady) {
        this.markTabAsReady(tabId)
        console.log(`[RELIABILITY] Successfully recovered tab ${tabId}`)
        return true
      } else {
        console.warn(`[RELIABILITY] Failed to recover tab ${tabId}`)
        return false
      }
    } catch (error) {
      tabState.injectionAttempts++
      tabState.lastInjectionTime = now
      console.error(`[RELIABILITY] Error recovering tab ${tabId}:`, error)
      return false
    }
  }

  /**
   * Проверка системных URL
   */
  private isSystemUrl(url: string): boolean {
    return [
      'chrome://',
      'chrome-extension://',
      'moz-extension://',
      'edge://',
      'about:',
      'data:',
      'file:',
    ].some((prefix) => url.startsWith(prefix))
  }

  /**
   * Проверка готовности таба для отправки сообщений
   */
  public async ensureTabReady(tabId: number): Promise<boolean> {
    console.log(`[RELIABILITY] Ensuring tab ${tabId} is ready`)

    // Сначала быстрая проверка из кеша
    const tabState = this.tabStates.get(tabId)
    if (tabState?.contentScriptReady) {
      const timeSinceLastPing = Date.now() - tabState.lastPingTime
      if (timeSinceLastPing < 60000) {
        // Считаем готовым, если пинг был менее минуты назад
        return true
      }
    }

    // Полная проверка и восстановление при необходимости
    return await this.checkTabHealth(tabId)
  }

  /**
   * Получение статистики надежности
   */
  public getStats(): { totalTabs: number; readyTabs: number; problemTabs: number } {
    const totalTabs = this.tabStates.size
    let readyTabs = 0
    let problemTabs = 0

    for (const tabState of this.tabStates.values()) {
      if (tabState.contentScriptReady) {
        readyTabs++
      } else {
        problemTabs++
      }
    }

    return { totalTabs, readyTabs, problemTabs }
  }

  /**
   * Принудительная переинжекция во все табы
   */
  public async forceReinjectAll(): Promise<void> {
    console.log('[RELIABILITY] Force reinjecting content scripts into all tabs')

    try {
      await injectContentScriptsIntoAllTabs()

      // Сбрасываем состояния всех табов
      for (const tabState of this.tabStates.values()) {
        tabState.contentScriptReady = false
        tabState.injectionAttempts = 0
        tabState.lastInjectionTime = 0
      }

      // Ждем инициализации и проверяем все табы
      setTimeout(() => {
        this.performHealthCheck()
      }, 2000)
    } catch (error) {
      console.error('[RELIABILITY] Error during force reinject:', error)
    }
  }

  /**
   * Регистрация активности системы
   */
  public registerActivity(): void {
    console.log('[RELIABILITY] Activity registered')
    // Обновляем время последней активности для всех готовых табов
    const now = Date.now()
    for (const tabState of this.tabStates.values()) {
      if (tabState.contentScriptReady) {
        tabState.lastPingTime = now
      }
    }
  }

  /**
   * Выполнение операции с повторными попытками при ошибке
   */
  public async withReliability<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[RELIABILITY] Executing operation (attempt ${attempt}/${maxRetries})`)
        const result = await operation()
        console.log(`[RELIABILITY] Operation succeeded on attempt ${attempt}`)
        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        console.warn(
          `[RELIABILITY] Operation failed on attempt ${attempt}/${maxRetries}:`,
          lastError.message
        )

        if (attempt < maxRetries) {
          console.log(`[RELIABILITY] Waiting ${delay}ms before retry`)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }

    console.error(`[RELIABILITY] Operation failed after ${maxRetries} attempts`)
    throw lastError!
  }
}

// Создаем глобальный экземпляр менеджера надежности
export const reliabilityManager = new ReliabilityManager()

/**
 * Утилитарные функции для удобного использования менеджера надежности
 */

/**
 * Инициализация менеджера надежности
 */
export function initReliabilityManager(): void {
  // Менеджер уже инициализирован при импорте, эта функция для совместимости
  console.log('[RELIABILITY] Reliability manager initialization requested')
}

/**
 * Получение состояния надежности
 */
export function getReliabilityState(): {
  totalTabs: number
  readyTabs: number
  problemTabs: number
  healthCheckActive: boolean
} {
  const stats = reliabilityManager.getStats()
  return {
    ...stats,
    healthCheckActive: true,
  }
}

/**
 * Выполнение диагностики системы
 */
export async function performDiagnostics(): Promise<{
  documentExists: boolean
  documentResponsive: boolean
  tabsReady: number
  tabsTotal: number
  healthCheckActive: boolean
  lastHealthCheck: number
}> {
  try {
    const stats = reliabilityManager.getStats()

    // Пробуем проверить готовность случайного таба
    const tabs = await browser.tabs.query({ active: true, currentWindow: true })
    let documentResponsive = false

    if (tabs.length > 0 && tabs[0].id) {
      try {
        documentResponsive = await reliabilityManager.ensureTabReady(tabs[0].id)
      } catch (error) {
        console.warn('[RELIABILITY] Diagnostic tab check failed:', error)
      }
    }

    return {
      documentExists: true,
      documentResponsive,
      tabsReady: stats.readyTabs,
      tabsTotal: stats.totalTabs,
      healthCheckActive: true,
      lastHealthCheck: Date.now(),
    }
  } catch (error) {
    console.error('[RELIABILITY] Diagnostics failed:', error)
    return {
      documentExists: false,
      documentResponsive: false,
      tabsReady: 0,
      tabsTotal: 0,
      healthCheckActive: false,
      lastHealthCheck: 0,
    }
  }
}

/**
 * Регистрация активности
 */
export function registerActivity(): void {
  reliabilityManager.registerActivity()
}

/**
 * Выполнение операции с повторными попытками
 */
export function withReliability<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  return reliabilityManager.withReliability(operation, maxRetries, delay)
}
