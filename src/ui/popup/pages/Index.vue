<template>
  <div class="min-h-[500px] w-[400px] p-4">
    <!-- Шапка приложения -->
    <header class="flex justify-between items-center mb-6 pb-2 border-b">
      <h1 class="text-2xl font-bold">Web Check</h1>
      <button 
        class="bg-[#3e66fb] text-white p-2 rounded-full hover:bg-[#2d52cc] transition-colors"
        :title="t('popup.header.addTask')"
        @click="handleAddTask"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
        </svg>
      </button>
    </header>
    
    <!-- Индикатор загрузки -->
    <div v-if="tasksStore.loading" class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#3e66fb]"></div>
      <span class="ml-3 text-gray-600">{{ t('popup.taskList.loading') }}</span>
    </div>
    
    <!-- Сообщение об ошибке -->
    <div v-else-if="tasksStore.error" class="bg-red-50 border border-red-200 rounded-xl p-4 mt-4 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-red-500 mb-2" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>
      <p class="text-red-800 mb-2">{{ tasksStore.error }}</p>
      <button 
        class="text-[#3e66fb] hover:underline mt-2"
        @click="tasksStore.loadTasks()"
      >
        {{ t('popup.taskList.retry') }}
      </button>
    </div>
    
    <!-- Пустой список задач -->
    <div v-else-if="tasksStore.tasks.length === 0" class="flex flex-col items-center justify-center h-64 text-gray-400">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mb-4 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm0 2a1 1 0 00-1 1v6a1 1 0 001 1h10a1 1 0 001-1V7a1 1 0 00-1-1H5z" clip-rule="evenodd" />
      </svg>
      <p class="text-lg mb-4">{{ t('popup.taskList.noTasks') }}</p>
      <button 
        class="bg-[#3e66fb] text-white px-4 py-2 rounded hover:bg-[#2d52cc] transition-colors"
        @click="handleAddTask"
      >
        {{ t('popup.taskList.addFirst') }}
      </button>
    </div>
    
    <!-- Список задач -->
    <div v-else>
      <div class="space-y-0">
        <TaskCard 
          v-for="task in tasksStore.tasks" 
          :key="task.id" 
          :task="task"
          @update:interval="updateTaskInterval"
          @update:status="updateTaskStatus"
          @view="viewTaskChanges"
          @remove="removeTask"
        />
      </div>
    </div>
    
    <!-- Футер с информацией о количестве задач -->
    <footer class="mt-4 pt-4 border-t text-center" v-if="tasksStore.tasks.length > 0">
      <p class="text-sm text-gray-500">
        {{ t('popup.taskList.activeCount', { count: tasksStore.activeTaskCount, total: tasksStore.maxTasks }) }}
      </p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useTasksStore } from '~/stores/tasks'
import { sendMessage } from 'webext-bridge/popup'
import { TaskInterval, TaskStatus } from '~/types/task'
import TaskCard from '~/components/TaskCard.vue'
import browser from 'webextension-polyfill'

const { t } = useI18n()
const router = useRouter()
const tasksStore = useTasksStore()

onMounted(async () => {
  await tasksStore.loadTasks()
})

async function handleAddTask() {
  // Проверяем лимит задач
  if (tasksStore.taskCount >= tasksStore.maxTasks) {
    alert(t('popup.errors.taskLimitReached'))
    return
  }
  
  try {
    // Отправить сообщение в контент-скрипт для активации селектора элементов
    const activeTabId = await getActiveTabId()
    if (activeTabId > 0) {
      await sendMessage('activate-selector', null, { context: 'content-script', tabId: activeTabId })
      
      // Можно добавить дополнительную обработку
      window.close() // Закрываем попап для удобства выбора элемента
    } else {
      alert(t('popup.errors.noActiveTab'))
    }
  } catch (error) {
    console.error('Ошибка при активации селектора:', error)
    alert(t('popup.errors.selectorActivation'))
  }
}

async function updateTaskInterval(taskId: string, interval: TaskInterval) {
  await tasksStore.updateTaskInterval(taskId, interval)
}

async function updateTaskStatus(taskId: string, status: TaskStatus) {
  await tasksStore.updateTaskStatus(taskId, status)
}

async function viewTaskChanges(taskId: string) {
  router.push(`/view-changes/${taskId}`)
}

async function removeTask(taskId: string) {
  if (confirm(t('popup.taskList.confirmDelete'))) {
    await tasksStore.removeTask(taskId)
  }
}

// Получить ID активной вкладки
async function getActiveTabId(): Promise<number> {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true })
    if (tabs && tabs.length > 0 && tabs[0].id) {
      return tabs[0].id
    }
    throw new Error('Не удалось получить ID активной вкладки')
  } catch (error) {
    console.error('Ошибка при получении ID активной вкладки:', error)
    return -1 // Фиктивный ID для случая ошибки
  }
}
</script>
