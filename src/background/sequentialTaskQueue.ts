/**
 * Последовательная очередь задач с защитой от превышения лимитов
 */
import { offscreenSemaphore } from '~/utils/semaphore'
import { sendMessageToOffscreen } from './offscreenManager'

interface QueueTask {
  id: string
  url: string
  selector: string
}

interface TaskResult {
  content?: string
  html?: string
  error?: string
  success: boolean
}

interface OffscreenResponse {
  success: boolean
  content?: string
  error?: string
}

export class SequentialTaskQueue {
  private queue: QueueTask[] = []
  private processing = false
  private readonly MAX_RETRIES = 3
  private readonly RETRY_DELAY_BASE = 1000 // 1 секунда базовая задержка
  private readonly TASK_TIMEOUT = 30000 // 30 секунд таймаут

  /**
   * Валидация задачи
   */
  private isValidTask(task: unknown): task is QueueTask {
    return (
      task !== null &&
      typeof task === 'object' &&
      'id' in task &&
      'url' in task &&
      'selector' in task &&
      typeof (task as QueueTask).id === 'string' &&
      typeof (task as QueueTask).url === 'string' &&
      typeof (task as QueueTask).selector === 'string'
    )
  }

  /**
   * Добавление задачи в очередь
   */
  async addTask(task: unknown): Promise<void> {
    if (!this.isValidTask(task)) {
      console.error('[TASK QUEUE] Invalid task:', task)
      throw new Error('Invalid task format')
    }

    console.log(`[TASK QUEUE] Adding task ${task.id} to queue`)
    this.queue.push(task)

    // Запускаем обработку если не активна
    if (!this.processing) {
      this.processQueue()
    }
  }

  /**
   * Обработка очереди задач
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return

    this.processing = true
    console.log('[TASK QUEUE] Starting queue processing')

    try {
      while (this.queue.length > 0) {
        const task = this.queue.shift()!

        try {
          await this.processTask(task)

          // Пауза между задачами для избежания перегрузки
          await this.delay(1000)
        } catch (error) {
          console.error(`[TASK QUEUE] Failed to process task ${task.id}:`, error)
          // Продолжаем обработку других задач
        }
      }
    } finally {
      this.processing = false
      console.log('[TASK QUEUE] Queue processing completed')
    }
  }

  /**
   * Обработка одной задачи с повторными попытками
   */
  private async processTask(task: QueueTask): Promise<TaskResult> {
    console.log(`[TASK QUEUE] Processing task ${task.id}`)

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        // Используем семафор для гарантии последовательности
        return await offscreenSemaphore.use(async () => {
          return await this.executeTaskWithTimeout(task)
        })
      } catch (error) {
        console.warn(`[TASK QUEUE] Attempt ${attempt} failed for task ${task.id}:`, error)

        if (attempt < this.MAX_RETRIES) {
          // Экспоненциальная задержка с джиттером
          const delay = this.RETRY_DELAY_BASE * Math.pow(2, attempt - 1)
          const jitter = Math.random() * 1000 // 0-1 секунда джиттер
          await this.delay(delay + jitter)
        } else {
          throw error
        }
      }
    }

    // Этот код никогда не выполнится, но TypeScript требует возвращаемое значение
    throw new Error('All retry attempts failed')
  }

  /**
   * Выполнение задачи с таймаутом
   */
  private async executeTaskWithTimeout(task: QueueTask): Promise<TaskResult> {
    return Promise.race([
      this.executeTask(task),
      new Promise<TaskResult>((_, reject) =>
        setTimeout(() => reject(new Error('Task timeout')), this.TASK_TIMEOUT)
      ),
    ])
  }

  /**
   * Выполнение задачи через offscreen документ
   */
  private async executeTask(task: QueueTask): Promise<TaskResult> {
    console.log(`[TASK QUEUE] Executing task ${task.id}`)

    const response = (await sendMessageToOffscreen({
      type: 'PROCESS_URL',
      url: task.url,
      selector: task.selector,
      requestId: task.id,
    })) as OffscreenResponse

    if (!response.success) {
      throw new Error(response.error || 'Task execution failed')
    }

    return {
      success: true,
      content: response.content,
    }
  }

  /**
   * Вспомогательная функция задержки
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Получение статистики очереди
   */
  getStats() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.processing,
    }
  }
}

// Экспортируем единственный экземпляр
export const taskQueue = new SequentialTaskQueue()
