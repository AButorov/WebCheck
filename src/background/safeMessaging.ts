/**
 * Безопасная отправка сообщений в popup
 */
import browser from 'webextension-polyfill'

interface PopupMessage {
  type: string
  [key: string]: unknown
}

/**
 * Отправка сообщения в popup с проверкой его состояния
 */
export async function sendMessageToPopup(message: PopupMessage): Promise<void> {
  try {
    // Проверяем, открыт ли popup
    const views = browser.extension.getViews({ type: 'popup' })

    if (views.length === 0) {
      // Popup закрыт, не отправляем сообщение
      console.log('[MESSAGING] Popup is closed, message not sent:', message.type)
      return
    }

    // Отправляем сообщение
    await browser.runtime.sendMessage(message)
  } catch (error) {
    // Игнорируем ошибки отправки, если popup уже закрыт
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('message port closed')) {
      console.log('[MESSAGING] Popup closed before response received')
    } else {
      console.error('[MESSAGING] Error sending message to popup:', error)
    }
  }
}

/**
 * Проверка, открыт ли popup
 */
export function isPopupOpen(): boolean {
  const views = browser.extension.getViews({ type: 'popup' })
  return views.length > 0
}
