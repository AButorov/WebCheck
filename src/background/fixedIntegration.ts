/**
 * Интеграция всех исправлений
 */
import { createAsyncMessageHandler } from './asyncMessageWrapper'
import { getMonitoringStats, getPerformanceStats } from './monitor'
import { taskQueue } from './sequentialTaskQueue'

// Создаём обработчики для различных типов сообщений
const messageHandlers = {
  'get-monitoring-stats': async () => {
    return await getMonitoringStats();
  },
  
  'get-performance-stats': async () => {
    const queueStats = taskQueue.getStats();
    const perfStats = await getPerformanceStats();
    
    return {
      ...perfStats,
      queue: queueStats
    };
  },
  
  'check-element': async (request: any) => {
    const { task } = request;
    await taskQueue.addTask(task);
    return { queued: true };
  }
};

// Регистрируем обработчик
export function setupFixedMessageHandling(): void {
  console.log('[INTEGRATION] Setting up fixed message handling');
  
  const handler = createAsyncMessageHandler(messageHandlers);
  chrome.runtime.onMessage.addListener(handler);
  
  console.log('[INTEGRATION] Message handling ready');
}
