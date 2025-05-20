import { defineStore } from 'pinia'
import { WebCheckTask, TaskInterval, TaskStatus } from '~/types/task'
import { nanoid } from '~/utils/nanoid'
import { getStorageLocal, setStorageLocal } from '~/utils/browser-storage'
import { ref } from 'vue'

console.log('[TASKS STORE] Initializing tasks store...')

export const useTasksStore = defineStore('tasks', {
  state: () => ({
    tasks: [] as WebCheckTask[],
    maxTasks: 5,
    loading: false,
    error: null as string | null,
  }),
  
  getters: {
    activeTasks: (state) => state.tasks.filter(task => task.status !== 'paused'),
    taskCount: (state) => state.tasks.length,
    activeTaskCount: (state) => state.tasks.filter(task => task.status !== 'paused').length,
  },
  
  actions: {
    async loadTasks() {
      console.log('[TASKS STORE] Loading tasks...')
      this.loading = true
      this.error = null
      
      try {
        // Загрузка задач из хранилища
        const tasks = await getStorageLocal('tasks', [] as WebCheckTask[])
        console.log('[TASKS STORE] Tasks loaded from storage:', tasks)
        
        // Проверяем, что задачи являются массивом
        if (!Array.isArray(tasks)) {
          console.warn('[TASKS STORE] Tasks is not an array, resetting to empty array')
          this.tasks = []
          await setStorageLocal('tasks', [])
        } else {
          // Если задач нет, используем демо-данные
          if (tasks.length === 0) {
            console.log('[TASKS STORE] No tasks found, generating demo data...')
            
            // Генерируем демо-задачи
            this.tasks = generateDemoTasks()
            
            // Сохраняем демо-данные в хранилище
            await setStorageLocal('tasks', this.tasks)
            console.log('[TASKS STORE] Demo tasks saved to storage:', this.tasks)
          } else {
            // Проверяем целостность задач
            const validTasks = tasks.filter(task => {
              // Проверяем наличие обязательных полей
              return task && task.id && task.url && task.selector
            })
            
            if (validTasks.length !== tasks.length) {
              console.warn('[TASKS STORE] Some tasks are invalid, filtered out:', tasks.length - validTasks.length)
              // Сохраняем только валидные задачи
              await setStorageLocal('tasks', validTasks)
            }
            
            this.tasks = validTasks
          }
        }
      } catch (error) {
        console.error('[TASKS STORE] Error loading tasks:', error)
        this.error = 'Не удалось загрузить задачи'
        
        // В случае ошибки все равно попробуем сгенерировать демо-данные
        try {
          console.log('[TASKS STORE] Fallback: Generating demo data...')
          this.tasks = generateDemoTasks()
          // Сохраняем демо-данные в хранилище
          await setStorageLocal('tasks', this.tasks)
        } catch (innerError) {
          console.error('[TASKS STORE] Failed to generate demo data:', innerError)
          this.tasks = []
        }
      } finally {
        this.loading = false
        console.log('[TASKS STORE] Tasks loading complete. Tasks count:', this.tasks.length)
      }
    },
    
    async saveTasks() {
      console.log('[TASKS STORE] Saving tasks...')
      try {
        await setStorageLocal('tasks', this.tasks)
        console.log('[TASKS STORE] Tasks saved successfully')
      } catch (error) {
        console.error('[TASKS STORE] Error saving tasks:', error)
      }
    },
    
    async addTask(task: Omit<WebCheckTask, 'id' | 'createdAt' | 'lastCheckedAt' | 'lastChangedAt'>) {
      console.log('[TASKS STORE] Adding new task:', task)
      const newTask: WebCheckTask = {
        ...task,
        id: nanoid(),
        createdAt: Date.now(),
        lastCheckedAt: Date.now(),
        lastChangedAt: null,
      }
      
      this.tasks.push(newTask)
      await this.saveTasks()
      return newTask
    },
    
    async updateTask(id: string, updates: Partial<WebCheckTask>) {
      console.log('[TASKS STORE] Updating task:', id, updates)
      const taskIndex = this.tasks.findIndex(task => task.id === id)
      if (taskIndex !== -1) {
        this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...updates }
        await this.saveTasks()
        console.log('[TASKS STORE] Task updated successfully')
      } else {
        console.warn('[TASKS STORE] Task not found for update:', id)
      }
    },
    
    async removeTask(id: string) {
      console.log('[TASKS STORE] Removing task:', id)
      this.tasks = this.tasks.filter(task => task.id !== id)
      await this.saveTasks()
      console.log('[TASKS STORE] Task removed successfully')
    },
    
    async updateTaskStatus(id: string, status: TaskStatus) {
      console.log('[TASKS STORE] Updating task status:', id, status)
      await this.updateTask(id, { status })
    },
    
    async updateTaskInterval(id: string, interval: TaskInterval) {
      console.log('[TASKS STORE] Updating task interval:', id, interval)
      await this.updateTask(id, { interval })
    },
    
    async markTaskAsChecked(id: string, hasChanges: boolean, newHtml?: string) {
      console.log('[TASKS STORE] Marking task as checked:', id, 'hasChanges:', hasChanges)
      const updates: Partial<WebCheckTask> = {
        lastCheckedAt: Date.now(),
      }
      
      if (hasChanges) {
        updates.status = 'changed'
        updates.lastChangedAt = Date.now()
        if (newHtml) {
          updates.currentHtml = newHtml
        }
      }
      
      await this.updateTask(id, updates)
    },
    
    async resetTaskChanges(id: string) {
      console.log('[TASKS STORE] Resetting task changes:', id)
      const task = this.tasks.find(t => t.id === id)
      if (task && task.status === 'changed') {
        await this.updateTask(id, {
          status: 'unchanged',
          initialHtml: task.currentHtml,
        })
        console.log('[TASKS STORE] Task changes reset successfully')
      } else {
        console.warn('[TASKS STORE] Task not found or not in changed state:', id)
      }
    },
  },
})

// Функция для генерации демо-данных
function generateDemoTasks(): WebCheckTask[] {
  console.log('[TASKS STORE] Generating demo tasks...')
  const now = Date.now()
  const hourAgo = now - 60 * 60 * 1000
  const dayAgo = now - 24 * 60 * 60 * 1000
  
  return [
    {
      id: nanoid(),
      title: 'Цена на iPhone 15 Pro',
      url: 'https://www.apple.com/ru/iphone-15-pro/',
      faviconUrl: 'https://www.apple.com/favicon.ico',
      selector: '.price-point',
      createdAt: dayAgo,
      status: 'changed',
      interval: '1h',
      initialHtml: '<div class="price-point">89 990 ₽</div>',
      currentHtml: '<div class="price-point">85 990 ₽</div>',
      lastCheckedAt: hourAgo,
      lastChangedAt: hourAgo,
    },
    {
      id: nanoid(),
      title: 'Курс Bitcoin на Binance',
      url: 'https://www.binance.com/ru/price/bitcoin',
      faviconUrl: 'https://public.bnbstatic.com/static/images/common/favicon.ico',
      selector: '.price-value',
      createdAt: dayAgo,
      status: 'unchanged',
      interval: '15m',
      initialHtml: '<div class="price-value">$60,245.32</div>',
      currentHtml: '<div class="price-value">$60,245.32</div>',
      lastCheckedAt: hourAgo - 15 * 60 * 1000,
      lastChangedAt: null,
    },
    {
      id: nanoid(),
      title: 'Наличие PS5 в DNS',
      url: 'https://www.dns-shop.ru/product/fd5650d1c517ed20/igrovaa-konsol-sony-playstation-5/',
      faviconUrl: 'https://www.dns-shop.ru/favicon.ico',
      selector: '.availability-text',
      createdAt: dayAgo,
      status: 'paused',
      interval: '3h',
      initialHtml: '<div class="availability-text">Нет в наличии</div>',
      currentHtml: '<div class="availability-text">Нет в наличии</div>',
      lastCheckedAt: dayAgo,
      lastChangedAt: null,
    }
  ]
}
