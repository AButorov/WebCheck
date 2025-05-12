<template>
  <div class="bg-white w-full">
    <!-- Шапка экрана просмотра изменений -->
    <header class="flex items-center p-4 border-b">
      <button 
        class="mr-2 text-gray-600 hover:text-gray-900"
        @click="router.push('/')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <div class="flex-1 mx-2 truncate">
        <div class="text-lg font-bold truncate">{{ task?.title }}</div>
        <div class="text-sm text-gray-500 truncate">{{ displayUrl }}</div>
      </div>
      
      <a 
        :href="task?.url" 
        target="_blank"
        class="text-blue-600 bg-blue-50 px-2 py-1 rounded text-sm hover:bg-blue-100 whitespace-nowrap"
      >
        Перейти на страницу
      </a>
    </header>
    
    <!-- Панель сравнения изменений -->
    <div class="p-4">
      <div class="mb-3 flex justify-between text-sm text-gray-500">
        <div>
          <div>Исходный вид:</div>
          <div>{{ formatDate(task?.createdAt || 0) }}</div>
        </div>
        <div class="text-right">
          <div>Текущий вид:</div>
          <div>{{ formatDate(task?.lastCheckedAt || 0) }}</div>
        </div>
      </div>
      
      <!-- Панели сравнения -->
      <div class="flex">
        <!-- Левая панель (исходный вид) -->
        <div class="w-1/2 pr-1 border border-gray-200 rounded-l overflow-hidden">
          <div 
            class="p-2 max-h-60 overflow-auto text-sm"
            v-html="task?.initialHtml"
          ></div>
        </div>
        
        <!-- Правая панель (текущий вид) -->
        <div class="w-1/2 pl-1 border border-gray-200 rounded-r overflow-hidden">
          <div 
            class="p-2 max-h-60 overflow-auto text-sm"
            v-html="task?.currentHtml"
          ></div>
        </div>
      </div>
      
      <!-- Кнопка сброса изменений -->
      <button 
        class="mt-4 w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors"
        @click="resetChanges"
      >
        Сбросить изменения
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTasksStore } from '~/stores/tasks'
import { WebCheckTask } from '~/types/task'
import { formatDate } from '~/utils/date-format'

const route = useRoute()
const router = useRouter()
const tasksStore = useTasksStore()
const task = ref<WebCheckTask | null>(null)

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
  await tasksStore.loadTasks()
  task.value = tasksStore.tasks.find(t => t.id === taskId.value) || null
  
  if (!task.value) {
    router.push('/')
  }
})

async function resetChanges() {
  if (!task.value) return
  
  await tasksStore.resetTaskChanges(task.value.id)
  router.push('/')
}
</script>
