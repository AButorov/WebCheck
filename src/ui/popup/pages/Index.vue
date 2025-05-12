<template>
  <div class="bg-white p-4 w-full">
    <!-- Шапка приложения -->
    <header class="flex justify-between items-center p-2 border-b mb-4">
      <h1 class="text-xl font-bold">{{ t('popup.header.title') }}</h1>
      <button 
        class="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-sm hover:bg-blue-600"
        :title="t('popup.header.addTask')"
        @click="handleAddTask"
      >
        +
      </button>
    </header>
    
    <!-- Индикатор загрузки -->
    <div v-if="tasksStore.loading" class="text-center py-8">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      <p class="mt-2 text-gray-500">{{ t('popup.taskList.loading') }}</p>
    </div>
    
    <!-- Сообщение об ошибке -->
    <div v-else-if="tasksStore.error" class="text-center py-8">
      <div class="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
        <p>{{ tasksStore.error }}</p>
        <button 
          class="mt-2 text-blue-500 hover:underline"
          @click="tasksStore.loadTasks()"
        >
          {{ t('popup.taskList.retry') }}
        </button>
      </div>
    </div>
    
    <!-- Пустой список задач -->
    <div v-else-if="tasksStore.tasks.length === 0" class="text-center py-8 text-gray-500">
      {{ t('popup.taskList.noTasks') }}
    </div>
    
    <div v-else class="task-list">
      <!-- Отладочная информация о задачах -->
      <div class="my-4 p-2 bg-gray-100 rounded-md text-xs">
        <p>Найдено задач: {{ tasksStore.tasks.length }}</p>
      </div>
      
      <!-- Список задач -->
      <div v-for="task in tasksStore.tasks" :key="task.id" class="mb-4 p-3 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
        <div class="font-medium">{{ task.title }}</div>
        <div class="text-sm text-gray-500 mt-1">{{ task.url }}</div>
        <div class="flex justify-between items-center mt-2">
          <span class="text-xs" :class="{
            'text-amber-500': task.status === 'changed',
            'text-green-500': task.status === 'unchanged',
            'text-gray-500': task.status === 'paused',
          }">
            {{ task.status === 'changed' ? 'Есть изменения' : 
               task.status === 'unchanged' ? 'Без изменений' : 
               'Приостановлено' }}
          </span>
          <span class="text-xs bg-gray-100 px-2 py-1 rounded">{{ task.interval }}</span>
        </div>
      </div>
      
      <!-- Полные карточки задач (закомментированы для отладки) -->
      <!-- 
      <TaskCard 
        v-for="task in tasksStore.tasks" 
        :key="task.id" 
        :task="task"
        @update:interval="updateTaskInterval"
        @update:status="updateTaskStatus"
        @view="viewTaskChanges"
        @remove="removeTask"
      />
      -->
    </div>
    
    <!-- Футер с информацией о количестве задач -->
    <footer class="p-4 border-t mt-4">
      <p class="text-center text-gray-500 text-sm">
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
import { MessagePayloads } from '~/types/messages'
import TaskCard from '~/components/TaskCard.vue'
import browser from 'webextension-polyfill'

const { t } = useI18n()
const router = useRouter()
const tasksStore = useTasksStore()

onMounted(async () => {
  await tasksStore.loadTasks()
})

async function handleAddTask() {
  // В реальном приложении здесь будет логика для активации селектора элементов
  // и сохранения выбранного элемента.
  // Для MVP мы просто перейдем на страницу создания задачи
  
  // Проверяем лимит задач
  if (tasksStore.taskCount >= tasksStore.maxTasks) {
    alert('Достигнут лимит задач. Пожалуйста, удалите какую-либо задачу перед добавлением новой.')
    return
  }
  
  try {
    // Отправить сообщение в контент-скрипт для активации селектора элементов
    await sendMessage('activate-selector', null, { context: 'content-script', tabId: await getActiveTabId() })
    // Дальнейшая логика будет обрабатываться через события от контент-скрипта
  } catch (error) {
    console.error('Ошибка при активации селектора:', error)
  }
}

async function updateTaskInterval(taskId: string, interval: TaskInterval) {
  await tasksStore.updateTaskInterval(taskId, interval)
}

async function updateTaskStatus(taskId: string, status: TaskStatus) {
  await tasksStore.updateTaskStatus(taskId, status)
}

async function viewTaskChanges(taskId: string) {
  // Переход на страницу просмотра изменений
  router.push(`/view-changes/${taskId}`)
}

async function removeTask(taskId: string) {
  if (confirm('Вы уверены, что хотите удалить эту задачу?')) {
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
