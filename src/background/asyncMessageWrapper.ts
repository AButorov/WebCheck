import browser from 'webextension-polyfill'

/**
 * Обёртка для безопасной обработки асинхронных сообщений
 */

// Типы для обработчиков сообщений
export interface AsyncMessageRequest {
  type?: string
  action?: string
  [key: string]: unknown
}

interface AsyncMessageResponse<T = unknown> {
  success: boolean
  result?: T
  error?: string
}

type AsyncMessageHandler<T = unknown> = (
  request: AsyncMessageRequest,
  sender: browser.Runtime.MessageSender
) => Promise<T>

/**
 * Создаёт обработчик сообщений с правильной обработкой асинхронных ответов
 */
export function createAsyncMessageHandler(
  handlers: Record<string, AsyncMessageHandler>
): (
  request: AsyncMessageRequest,
  sender: browser.Runtime.MessageSender,
  sendResponse: (response?: AsyncMessageResponse) => void
) => boolean | undefined {
  return (request, sender, sendResponse) => {
    // Определяем тип сообщения
    const messageType = request?.type || request?.action

    if (!messageType || !(messageType in handlers)) {
      // Не наш обработчик, пропускаем
      return false
    }

    // Логируем входящее сообщение
    console.log(`[ASYNC HANDLER] Processing ${messageType}`, request)

    // Обрабатываем асинхронно
    Promise.resolve()
      .then(() => handlers[messageType](request, sender))
      .then((result) => {
        console.log(`[ASYNC HANDLER] Success for ${messageType}`, result)
        sendResponse({ success: true, result })
      })
      .catch((error) => {
        console.error(`[ASYNC HANDLER] Error for ${messageType}:`, error)
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        })
      })

    // КРИТИЧНО: Возвращаем true для асинхронного ответа
    return true
  }
}

/**
 * Хелпер для отправки сообщений с ожиданием ответа
 */
export async function sendMessageAsync<T = unknown>(message: AsyncMessageRequest): Promise<T> {
  const response = (await browser.runtime.sendMessage(message)) as AsyncMessageResponse<T>

  if (!response) {
    throw new Error('No response received')
  }

  if (!response.success) {
    throw new Error(response.error || 'Unknown error')
  }

  return response.result as T
}
