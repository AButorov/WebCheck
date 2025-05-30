/**
 * Безопасная система сообщений для Chrome Extension
 * Решает проблему "Could not establish connection. Receiving end does not exist"
 */

import browser from 'webextension-polyfill'

export interface SafeMessageOptions {
  retryCount?: number
  retryDelay?: number
  timeout?: number
  injectContentScript?: boolean
}

export interface SafeMessageResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  retried?: boolean
}

// Интерфейсы для типизации сообщений
interface MessageWithAction {
  action?: string
  type?: string
  [key: string]: unknown
}

function isMessageWithAction(message: unknown): message is MessageWithAction {
  return typeof message === 'object' && message !== null
}

/**
 * Безопасная отправка сообщения в content script
 */
export async function sendSafeMessage<T = unknown>(
  tabId: number,
  message: unknown,
  options: SafeMessageOptions = {}
): Promise<SafeMessageResult<T>> {
  const {
    retryCount = 3,
    retryDelay = 300,
    timeout = 5000,
    injectContentScript: shouldInject = true,
  } = options

  const messageForLog = isMessageWithAction(message)
    ? message.action || message.type || 'unknown'
    : 'unknown'
  console.log(`[SAFE_MESSAGING] Sending message to tab ${tabId}:`, messageForLog)

  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      // Проверяем готовность content script
      const isReady = await checkContentScriptReady(tabId, timeout / retryCount)

      if (!isReady && shouldInject) {
        console.log(`[SAFE_MESSAGING] Content script not ready, injecting... (attempt ${attempt})`)
        await injectContentScript(tabId)

        // Ждем инициализации
        await delay(retryDelay * 2)

        // Повторно проверяем готовность
        const isReadyAfterInjection = await checkContentScriptReady(tabId, timeout / retryCount)
        if (!isReadyAfterInjection) {
          console.warn(
            `[SAFE_MESSAGING] Content script still not ready after injection (attempt ${attempt})`
          )
          if (attempt < retryCount) {
            await delay(retryDelay)
            continue
          } else {
            return {
              success: false,
              error: 'Content script not ready after injection',
              retried: attempt > 1,
            }
          }
        }
      }

      // Отправляем сообщение с таймаутом
      const response = await sendMessageWithTimeout(tabId, message, timeout / retryCount)

      console.log(`[SAFE_MESSAGING] Message sent successfully to tab ${tabId} (attempt ${attempt})`)
      return {
        success: true,
        data: response as T,
        retried: attempt > 1,
      }
    } catch (error) {
      console.warn(`[SAFE_MESSAGING] Attempt ${attempt} failed for tab ${tabId}:`, error)

      if (attempt === retryCount) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          retried: attempt > 1,
        }
      }

      // Ждем перед повторной попыткой
      await delay(retryDelay * attempt)
    }
  }

  return {
    success: false,
    error: 'Max retry attempts exceeded',
    retried: true,
  }
}

/**
 * Проверка готовности content script
 */
// Интерфейс для ответа ping
interface PingResponse {
  status: string
}

function isPingResponse(response: unknown): response is PingResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'status' in response &&
    typeof (response as Record<string, unknown>).status === 'string'
  )
}

export async function checkContentScriptReady(
  tabId: number,
  timeout: number = 3000
): Promise<boolean> {
  try {
    const response = await sendMessageWithTimeout(tabId, { action: 'ping' }, timeout)
    return isPingResponse(response) && response.status === 'pong'
  } catch (error) {
    console.log(`[SAFE_MESSAGING] Content script not ready in tab ${tabId}:`, error)
    return false
  }
}

/**
 * Отправка сообщения с таймаутом
 */
async function sendMessageWithTimeout(
  tabId: number,
  message: unknown,
  timeout: number
): Promise<unknown> {
  return Promise.race([
    browser.tabs.sendMessage(tabId, message),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Message timeout')), timeout)),
  ])
}

/**
 * Инжекция content script в таб
 */
async function injectContentScript(tabId: number): Promise<void> {
  try {
    // Получаем информацию о табе
    const tab = await browser.tabs.get(tabId)

    // Проверяем URL
    if (!tab.url || isSystemUrl(tab.url)) {
      throw new Error(`Cannot inject into system URL: ${tab.url}`)
    }

    // Пробуем инжектировать основной content script
    try {
      await browser.scripting.executeScript({
        target: { tabId },
        files: ['assets/js/index.ts.js'],
      })
      console.log(`[SAFE_MESSAGING] Content script injected successfully into tab ${tabId}`)
    } catch (error) {
      console.log(`[SAFE_MESSAGING] Failed to inject main script, trying fallback:`, error)

      // Fallback инжекция
      await browser.scripting.executeScript({
        target: { tabId },
        func: createFallbackContentScript,
      })
      console.log(`[SAFE_MESSAGING] Fallback content script injected into tab ${tabId}`)
    }
  } catch (error) {
    console.error(`[SAFE_MESSAGING] Failed to inject content script into tab ${tabId}:`, error)
    throw error
  }
}

/**
 * Проверка системных URL
 */
function isSystemUrl(url: string): boolean {
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
 * Минимальный fallback content script
 */
function createFallbackContentScript() {
  console.log('[WebCheck:FallbackContentScript] Fallback content script loaded')

  // Проверяем, не загружен ли уже основной content script
  if (window.webCheckContentScriptLoaded) {
    console.log('[WebCheck:FallbackContentScript] Main content script already loaded')
    return
  }

  window.webCheckContentScriptLoaded = true

  // Обработчик ping сообщений
  // Типизация для content script сообщений
  interface ContentMessage {
    action: string
    [key: string]: unknown
  }

  function isContentMessage(message: unknown): message is ContentMessage {
    return (
      typeof message === 'object' &&
      message !== null &&
      'action' in message &&
      typeof (message as Record<string, unknown>).action === 'string'
    )
  }

  browser.runtime.onMessage.addListener(
    (message: unknown, sender: unknown, sendResponse: unknown) => {
      if (!isContentMessage(message)) {
        return // Возвращаем void для несовпадающих типов сообщений
      }

      const response = sendResponse as (response?: unknown) => void

      if (message.action === 'ping') {
        response({ status: 'pong' })
        return true
      }

      if (message.action === 'activateElementSelection') {
        // Простейший element picker
        activateSimpleElementPicker()
        response({ status: 'activated' })
        return true
      }

      return // Возвращаем void для несовпадающих сообщений
    }
  )

  function activateSimpleElementPicker() {
    let isActive = false
    let hoveredElement: Element | null = null

    const overlay = document.createElement('div')
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: Arial, sans-serif;
    `

    const instructions = document.createElement('div')
    instructions.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `
    instructions.innerHTML = `
      <h3 style="margin-top: 0;">Выберите элемент</h3>
      <p>Наведите курсор и кликните на элемент для отслеживания</p>
      <button id="webcheck-cancel" style="padding: 8px 16px;">Отмена</button>
    `

    overlay.appendChild(instructions)
    document.body.appendChild(overlay)

    const style = document.createElement('style')
    style.textContent = `
      .webcheck-highlight {
        outline: 2px solid #4285f4 !important;
        outline-offset: 2px !important;
        background-color: rgba(66, 133, 244, 0.1) !important;
      }
    `
    document.head.appendChild(style)

    function handleMouseMove(e: MouseEvent) {
      if (!isActive) return

      if (hoveredElement) {
        hoveredElement.classList.remove('webcheck-highlight')
      }

      const target = document.elementFromPoint(e.clientX, e.clientY)
      if (target && !target.closest('#webcheck-overlay')) {
        hoveredElement = target
        hoveredElement.classList.add('webcheck-highlight')
      }
    }

    function handleClick(e: MouseEvent) {
      if (!isActive) return

      e.preventDefault()
      e.stopPropagation()

      if (hoveredElement && !hoveredElement.closest('#webcheck-overlay')) {
        const rect = hoveredElement.getBoundingClientRect()
        const selector = hoveredElement.id
          ? `#${hoveredElement.id}`
          : hoveredElement.tagName.toLowerCase() +
            (hoveredElement.className ? `.${hoveredElement.className.split(' ').join('.')}` : '')

        const elementInfo = {
          selector,
          rect: {
            top: rect.top + window.pageYOffset,
            left: rect.left + window.pageXOffset,
            width: rect.width,
            height: rect.height,
            bottom: rect.bottom,
            right: rect.right,
          },
          html: hoveredElement.outerHTML,
          pageTitle: document.title,
          pageUrl: window.location.href,
          faviconUrl: '/favicon.ico',
        }

        browser.runtime.sendMessage({
          action: 'captureElement',
          elementInfo,
        })

        cleanup()
      }
    }

    function cleanup() {
      isActive = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('click', handleClick)
      if (hoveredElement) {
        hoveredElement.classList.remove('webcheck-highlight')
      }
      overlay.remove()
      style.remove()
    }

    isActive = true
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('click', handleClick)

    const cancelButton = document.getElementById('webcheck-cancel')
    if (cancelButton) {
      cancelButton.addEventListener('click', cleanup)
    }
    setTimeout(cleanup, 30000) // автоотмена через 30 секунд
  }
}

/**
 * Инжекция content scripts во все подходящие табы
 */
export async function injectContentScriptsIntoAllTabs(): Promise<void> {
  console.log('[SAFE_MESSAGING] Injecting content scripts into all tabs...')

  try {
    const tabs = await browser.tabs.query({})
    const injectionPromises = []

    for (const tab of tabs) {
      if (tab.id && tab.url && !isSystemUrl(tab.url)) {
        injectionPromises.push(
          injectContentScript(tab.id).catch((error) => {
            console.log(`[SAFE_MESSAGING] Failed to inject into tab ${tab.id} (${tab.url}):`, error)
          })
        )
      }
    }

    await Promise.allSettled(injectionPromises)
    console.log(
      `[SAFE_MESSAGING] Content script injection completed for ${injectionPromises.length} tabs`
    )
  } catch (error) {
    console.error('[SAFE_MESSAGING] Error injecting content scripts:', error)
  }
}

/**
 * Утилита для задержки
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Добавляем типы для window объекта
declare global {
  interface Window {
    webCheckContentScriptLoaded?: boolean
  }
}
