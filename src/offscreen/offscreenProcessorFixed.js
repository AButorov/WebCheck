/**
 * Улучшенный процессор для offscreen документа
 * Обрабатывает только одну задачу за раз
 */

class OffscreenProcessor {
  constructor() {
    this.currentIframe = null
    this.processing = false
    this.setupMessageHandler()
  }

  setupMessageHandler() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.target !== 'offscreen') {
        return false
      }

      console.log('[OFFSCREEN] Received message:', request.type)

      switch (request.type) {
        case 'PING':
          sendResponse({ status: 'alive' })
          return false

        case 'PROCESS_URL':
          this.handleProcessUrl(request, sendResponse)
          return true // Асинхронный ответ

        default:
          sendResponse({ error: 'Unknown message type' })
          return false
      }
    })
  }

  async handleProcessUrl(request, sendResponse) {
    const { url, selector, requestId } = request

    if (this.processing) {
      sendResponse({
        success: false,
        error: 'Another task is being processed',
      })
      return
    }

    this.processing = true
    try {
      const content = await this.processElement(url, selector)
      sendResponse({
        success: true,
        content,
        requestId,
        timestamp: Date.now(),
      })
    } catch (error) {
      console.error('[OFFSCREEN] Processing error:', error)
      sendResponse({
        success: false,
        error: error.message,
        requestId,
      })
    } finally {
      this.processing = false
      this.cleanup()
    }
  }

  async processElement(url, selector) {
    console.log(`[OFFSCREEN] Processing ${url} with selector ${selector}`)

    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.sandbox = 'allow-scripts allow-same-origin'

      this.currentIframe = iframe

      const timeout = setTimeout(() => {
        reject(new Error('Iframe load timeout'))
      }, 20000)

      iframe.onload = () => {
        clearTimeout(timeout)

        // Даём странице время на загрузку динамического контента
        setTimeout(() => {
          try {
            const doc = iframe.contentDocument
            if (!doc) {
              throw new Error('Cannot access iframe document')
            }

            const element = doc.querySelector(selector)
            if (!element) {
              throw new Error(`Element not found: ${selector}`)
            }

            resolve(element.textContent || element.innerHTML)
          } catch (error) {
            // CORS ограничение - используем postMessage
            this.handleCrossOrigin(iframe, selector, resolve, reject)
          }
        }, 2000) // 2 секунды на загрузку динамического контента
      }

      iframe.onerror = () => {
        clearTimeout(timeout)
        reject(new Error('Failed to load page'))
      }

      // Очищаем URL от проблемных фрагментов
      const cleanUrl = url.split('#')[0]
      iframe.src = cleanUrl

      document.body.appendChild(iframe)
    })
  }

  handleCrossOrigin(iframe, selector, resolve, reject) {
    console.log('[OFFSCREEN] Using postMessage for cross-origin')

    const messageHandler = (event) => {
      if (event.source !== iframe.contentWindow) return

      if (event.data.type === 'ELEMENT_CONTENT') {
        window.removeEventListener('message', messageHandler)
        resolve(event.data.content)
      }
    }

    window.addEventListener('message', messageHandler)

    // Инжектируем скрипт через URL
    const script = `
      const element = document.querySelector('${selector}');
      if (element) {
        parent.postMessage({
          type: 'ELEMENT_CONTENT',
          content: element.textContent || element.innerHTML
        }, '*');
      }
    `

    iframe.src = `javascript:${encodeURIComponent(script)}`

    // Таймаут для cross-origin
    setTimeout(() => {
      window.removeEventListener('message', messageHandler)
      reject(new Error('Cross-origin timeout'))
    }, 5000)
  }

  cleanup() {
    if (this.currentIframe) {
      this.currentIframe.remove()
      this.currentIframe = null
    }
  }
}

// Создаём единственный экземпляр процессора
new OffscreenProcessor()

console.log('[OFFSCREEN] Processor initialized')
