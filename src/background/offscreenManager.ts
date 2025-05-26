/**
 * Улучшенный менеджер offscreen-документов с Singleton паттерном
 * Гарантирует создание только одного offscreen-документа
 *
 * Использует Chrome API напрямую, так как offscreen документы
 * не поддерживаются в webextension-polyfill
 */

// Типизация для Chrome Offscreen API
declare global {
  interface Window {
    chrome: {
      runtime: {
        getContexts: (options: { contextTypes: string[] }) => Promise<
          Array<{
            documentUrl?: string
            creationTime?: number
          }>
        >
        getURL: (path: string) => string
        sendMessage: (message: unknown) => Promise<unknown>
        onStartup: {
          addListener: (callback: () => void) => void
        }
        onInstalled: {
          addListener: (callback: () => void) => void
        }
      }
      offscreen: {
        createDocument: (options: {
          url: string
          reasons: string[]
          justification: string
        }) => Promise<void>
        closeDocument: () => Promise<void>
        Reason: {
          DOM_SCRAPING: string
        }
      }
    }
  }
}

// Получаем Chrome API
const chromeAPI = (globalThis as typeof globalThis & Window).chrome

// Singleton класс для управления offscreen документом
class OffscreenManager {
  private static instance: OffscreenManager
  private isCreating = false
  private documentExists = false
  private lastCheck = 0
  private readonly CACHE_DURATION = 5000 // 5 секунд кэша
  private readonly DOCUMENT_PATH = 'offscreen/offscreen.html'

  private constructor() {}

  static getInstance(): OffscreenManager {
    if (!OffscreenManager.instance) {
      OffscreenManager.instance = new OffscreenManager()
    }
    return OffscreenManager.instance
  }

  async hasDocument(): Promise<boolean> {
    if (!chromeAPI) {
      console.warn('[OffscreenManager] Chrome API not available')
      return false
    }

    const now = Date.now()

    // Используем кэш для частых проверок
    if (this.documentExists && now - this.lastCheck < this.CACHE_DURATION) {
      return true
    }

    try {
      const contexts = await chromeAPI.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
      })

      this.documentExists = contexts.some((context) =>
        context.documentUrl?.endsWith(this.DOCUMENT_PATH)
      )
      this.lastCheck = now

      console.log(`[OffscreenManager] Document exists: ${this.documentExists}`)
      return this.documentExists
    } catch (error) {
      console.error('[OffscreenManager] Error checking document:', error)
      this.documentExists = false
      return false
    }
  }

  async ensureDocument(): Promise<void> {
    if (!chromeAPI) {
      throw new Error('Chrome API not available')
    }

    // Проверяем существование документа
    if (await this.hasDocument()) {
      console.log('[OffscreenManager] Document already exists')
      return
    }

    // Предотвращаем одновременное создание
    if (this.isCreating) {
      console.log('[OffscreenManager] Document creation in progress, waiting...')
      while (this.isCreating) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
      return
    }

    this.isCreating = true
    try {
      console.log('[OffscreenManager] Creating offscreen document...')
      await chromeAPI.offscreen.createDocument({
        url: chromeAPI.runtime.getURL(this.DOCUMENT_PATH),
        reasons: [chromeAPI.offscreen.Reason.DOM_SCRAPING],
        justification: 'Parse DOM content for web page change detection',
      })

      this.documentExists = true
      this.lastCheck = Date.now()
      console.log('[OffscreenManager] Document created successfully')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('Only a single offscreen document')) {
        console.log('[OffscreenManager] Document already exists (caught)')
        this.documentExists = true
      } else {
        console.error('[OffscreenManager] Failed to create document:', error)
        throw error
      }
    } finally {
      this.isCreating = false
    }
  }

  async closeDocument(): Promise<void> {
    if (!chromeAPI) {
      console.warn('[OffscreenManager] Chrome API not available')
      return
    }

    if (!(await this.hasDocument())) {
      console.log('[OffscreenManager] No document to close')
      return
    }

    try {
      await chromeAPI.offscreen.closeDocument()
      this.documentExists = false
      this.lastCheck = 0
      console.log('[OffscreenManager] Document closed')
    } catch (error) {
      console.error('[OffscreenManager] Error closing document:', error)
    }
  }

  invalidateCache(): void {
    this.documentExists = false
    this.lastCheck = 0
  }
}

// Экспортируем единственный экземпляр
export const offscreenManager = OffscreenManager.getInstance()

// Функции для обратной совместимости
export async function hasOffscreenDocument(): Promise<boolean> {
  return offscreenManager.hasDocument()
}

export async function ensureOffscreenDocument(): Promise<void> {
  return offscreenManager.ensureDocument()
}

export async function closeOffscreenDocument(): Promise<void> {
  return offscreenManager.closeDocument()
}

export function invalidateCache(): void {
  offscreenManager.invalidateCache()
}

export async function sendMessageToOffscreen(message: Record<string, unknown>): Promise<unknown> {
  await ensureOffscreenDocument()

  if (!chromeAPI) {
    throw new Error('Chrome API not available')
  }

  return chromeAPI.runtime.sendMessage({
    target: 'offscreen',
    ...message,
  })
}

export async function pingOffscreenDocument(): Promise<boolean> {
  try {
    const response = (await sendMessageToOffscreen({ type: 'PING' })) as { status?: string }
    return response?.status === 'alive'
  } catch {
    return false
  }
}

export function setupOffscreenEventHandlers(): void {
  if (!chromeAPI) {
    console.warn('[OffscreenManager] Chrome API not available for event handlers')
    return
  }

  chromeAPI.runtime.onStartup.addListener(() => {
    console.log('[OffscreenManager] Browser startup, invalidating cache')
    offscreenManager.invalidateCache()
  })

  chromeAPI.runtime.onInstalled.addListener(() => {
    console.log('[OffscreenManager] Extension installed/updated')
    offscreenManager.invalidateCache()
  })
}
