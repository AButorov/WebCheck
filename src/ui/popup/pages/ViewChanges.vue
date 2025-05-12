<template>
  <div class="bg-white w-full min-h-[500px] w-[400px]">
    <!-- Шапка экрана просмотра изменений -->
    <header class="flex items-center p-4 border-b">
      <button 
        class="mr-2 text-gray-600 hover:text-gray-900"
        @click="router.push('/')"
        :title="t('popup.viewChanges.backButton')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
      </button>
      
      <div class="flex-1 mx-2 truncate">
        <div class="text-lg font-bold truncate">{{ task?.title || t('popup.viewChanges.title') }}</div>
        <div class="text-sm text-gray-500 truncate">{{ displayUrl }}</div>
      </div>
      
      <a 
        :href="task?.url" 
        target="_blank"
        class="text-[#2d6cdf] bg-blue-50 px-3 py-1 rounded text-sm hover:bg-blue-100 whitespace-nowrap flex items-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
          <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
        </svg>
        {{ t('popup.viewChanges.openPage') }}
      </a>
    </header>
    
    <!-- Индикатор загрузки -->
    <div v-if="loading" class="flex flex-col items-center justify-center h-64">
      <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#2d6cdf]"></div>
      <p class="mt-4 text-gray-600">{{ t('popup.viewChanges.loading') }}</p>
    </div>
    
    <!-- Ошибка загрузки -->
    <div v-else-if="!task" class="flex flex-col items-center justify-center h-64">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-gray-300 mb-4" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>
      <p class="text-gray-600 mb-4">{{ t('popup.viewChanges.noChanges') }}</p>
      <button 
        class="px-4 py-2 bg-[#2d6cdf] text-white rounded hover:bg-blue-700"
        @click="router.push('/')"
      >
        {{ t('popup.viewChanges.backButton') }}
      </button>
    </div>
    
    <!-- Панель сравнения изменений -->
    <div v-else class="p-4">
      <!-- Заголовки панелей сравнения -->
      <div class="grid grid-cols-2 gap-4 mb-2">
        <div class="bg-gray-50 rounded p-2 text-center text-sm font-medium text-gray-700">
          {{ t('popup.viewChanges.original') }}
        </div>
        <div class="bg-gray-50 rounded p-2 text-center text-sm font-medium text-gray-700">
          {{ t('popup.viewChanges.current') }}
        </div>
      </div>
      
      <!-- Даты снимков -->
      <div class="grid grid-cols-2 gap-4 mb-2">
        <div class="text-xs text-gray-500 text-center">
          {{ t('popup.viewChanges.originalSnapshot', { date: formatDate(task.createdAt) }) }}
        </div>
        <div class="text-xs text-gray-500 text-center">
          {{ t('popup.viewChanges.currentSnapshot', { date: formatDate(task.lastCheckedAt) }) }}
        </div>
      </div>
      
      <!-- Панели сравнения -->
      <div class="grid grid-cols-2 gap-4 mb-4">
        <!-- Левая панель (исходный вид) -->
        <div class="border border-gray-200 rounded overflow-hidden shadow-sm">
          <div 
            class="p-3 max-h-64 overflow-auto text-sm diff-panel"
            v-html="task.initialHtml"
          ></div>
        </div>
        
        <!-- Правая панель (текущий вид) -->
        <div class="border border-gray-200 rounded overflow-hidden shadow-sm">
          <div 
            class="p-3 max-h-64 overflow-auto text-sm diff-panel"
            v-html="task.currentHtml"
          ></div>
        </div>
      </div>
      
      <!-- Кнопки действий -->
      <div class="flex space-x-2 mt-4">
        <button 
          class="flex-1 py-2 rounded bg-[#673ab7] text-white hover:bg-purple-700"
          @click="resetChanges"
        >
          {{ t('popup.viewChanges.backButton') }}
        </button>
        <a 
          :href="task.url" 
          target="_blank"
          class="flex-1 py-2 rounded bg-[#2d6cdf] text-white hover:bg-blue-700 text-center"
        >
          {{ t('popup.viewChanges.openPage') }}
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useTasksStore } from '~/stores/tasks'
import { WebCheckTask } from '~/types/task'
import { formatDate } from '~/utils/date-format'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const tasksStore = useTasksStore()
const task = ref<WebCheckTask | null>(null)
const loading = ref(true)

const taskId = computed(() => route.params.id as string)

const displayUrl = computed(() => {
  if (!task.value?.url) return ''
  
  try {
    const url = new URL(task.value.url)
    return url.hostname
  } catch {
    return task.value.url
  }
})

onMounted(async () => {
  try {
    await tasksStore.loadTasks()
    task.value = tasksStore.tasks.find(t => t.id === taskId.value) || null
    
    if (!task.value) {
      console.error('Task not found:', taskId.value)
    }
  } catch (error) {
    console.error('Error loading task:', error)
  } finally {
    loading.value = false
  }
})

async function resetChanges() {
  if (!task.value) {
    router.push('/')
    return
  }
  
  try {
    await tasksStore.resetTaskChanges(task.value.id)
    router.push('/')
  } catch (error) {
    console.error('Error resetting changes:', error)
  }
}
</script>

<style scoped>
.diff-panel :deep(ins) {
  background-color: #e6ffed;
  text-decoration: none;
}

.diff-panel :deep(del) {
  background-color: #ffeef0;
  text-decoration: line-through;
}
</style>
