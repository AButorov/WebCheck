/**
 * Обёртка для безопасной обработки асинхронных сообщений
 */

type AsyncMessageHandler = (
  request: any,
  sender: chrome.runtime.MessageSender
) => Promise<any>;

/**
 * Создаёт обработчик сообщений с правильной обработкой асинхронных ответов
 */
export function createAsyncMessageHandler(
  handlers: Record<string, AsyncMessageHandler>
): (
  request: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) => boolean | undefined {
  
  return (request, sender, sendResponse) => {
    // Определяем тип сообщения
    const messageType = request?.type || request?.action;
    
    if (!messageType || !(messageType in handlers)) {
      // Не наш обработчик, пропускаем
      return false;
    }

    // Логируем входящее сообщение
    console.log(`[ASYNC HANDLER] Processing ${messageType}`, request);

    // Обрабатываем асинхронно
    Promise.resolve()
      .then(() => handlers[messageType](request, sender))
      .then(result => {
        console.log(`[ASYNC HANDLER] Success for ${messageType}`, result);
        sendResponse({ success: true, result });
      })
      .catch(error => {
        console.error(`[ASYNC HANDLER] Error for ${messageType}:`, error);
        sendResponse({ 
          success: false, 
          error: error.message || String(error) 
        });
      });

    // КРИТИЧНО: Возвращаем true для асинхронного ответа
    return true;
  };
}

/**
 * Хелпер для отправки сообщений с ожиданием ответа
 */
export async function sendMessageAsync<T = any>(message: any): Promise<T> {
  const response = await chrome.runtime.sendMessage(message);
  
  if (!response) {
    throw new Error('No response received');
  }
  
  if (!response.success) {
    throw new Error(response.error || 'Unknown error');
  }
  
  return response.result;
}
