import { defineStore } from 'pinia'
import { WebCheckTask, TaskInterval, TaskStatus } from '~/types/task'
import { nanoid } from '~/utils/nanoid'
import { getStorageLocal, setStorageLocal } from '~/utils/browser-storage'
import { initDemoMode } from '~/utils/demo-data'
import { ref } from 'vue'

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
      this.loading = true
      this.error = null
      
      try {
        console.log('Loading tasks...')
        
        // Инициализация демо-режима (только если нет задач)
        await initDemoMode(getStorageLocal, setStorageLocal)
        
        // Загрузка задач
        const tasks = await getStorageLocal('tasks', [] as WebCheckTask[])
        console.log('Tasks loaded:', tasks)
        
        // Если задач нет, используем прямой импорт
        if (tasks.length === 0) {
          console.log('No tasks found, importing demo data...')
          const { generateDemoTasks } = await import('~/utils/demo-data')
          this.tasks = generateDemoTasks()
          // Сохраняем демо-данные в хранилище
          await setStorageLocal('tasks', this.tasks)
          console.log('Demo tasks generated:', this.tasks)
        } else {
          this.tasks = tasks
        }
      } catch (error) {
        console.error('Ошибка при загрузке задач:', error)
        this.error = 'Не удалось загрузить задачи'
        
        // В случае ошибки все равно попробуем сгенерировать демо-данные
        try {
          const { generateDemoTasks } = await import('~/utils/demo-data')
          this.tasks = generateDemoTasks()
          console.log('Fallback: Demo tasks generated:', this.tasks)
        } catch (innerError) {
          console.error('Не удалось сгенерировать демо-данные:', innerError)
          this.tasks = []
        }
      } finally {
        this.loading = false
      }
    },
    
    async saveTasks() {
      try {
        await setStorageLocal('tasks', this.tasks)
      } catch (error) {
        console.error('Ошибка при сохранении задач:', error)
      }
    },
    
    async addTask(task: Omit<WebCheckTask, 'id' | 'createdAt' | 'lastCheckedAt' | 'lastChangedAt'>) {
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
      const taskIndex = this.tasks.findIndex(task => task.id === id)
      if (taskIndex !== -1) {
        this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...updates }
        await this.saveTasks()
      }
    },
    
    async removeTask(id: string) {
      this.tasks = this.tasks.filter(task => task.id !== id)
      await this.saveTasks()
    },
    
    async updateTaskStatus(id: string, status: TaskStatus) {
      await this.updateTask(id, { status })
    },
    
    async updateTaskInterval(id: string, interval: TaskInterval) {
      await this.updateTask(id, { interval })
    },
    
    async markTaskAsChecked(id: string, hasChanges: boolean, newHtml?: string) {
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
      const task = this.tasks.find(t => t.id === id)
      if (task && task.status === 'changed') {
        await this.updateTask(id, {
          status: 'unchanged',
          initialHtml: task.currentHtml,
        })
      }
    },
  },
})
