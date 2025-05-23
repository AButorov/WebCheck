/**
 * Безопасная отправка сообщений в popup
 */
export async function sendMessageToPopup(message: any): Promise<void> {
  try {
    // Проверяем, открыт ли popup
    const views = chrome.extension.getViews({ type: 'popup' })
    
    if (views.length === 0) {
      // Popup закрыт, не отправляем сообщение
      console.log('[MESSAGING] Popup is closed, message not sent:', message.type)
      return
    }
    
    // Отправляем сообщение
    await chrome.runtime.sendMessage(message)
  } catch (error) {
    // Игнорируем ошибки отправки, если popup уже закрыт
    if ((error as Error).message?.includes('message port closed')) {
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
  const views = chrome.extension.getViews({ type: 'popup' })
  return views.length > 0
}
