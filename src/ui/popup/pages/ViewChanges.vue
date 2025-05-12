<template>
  <div class="bg-white w-full min-h-[500px] w-[400px]">
    <!-- Шапка экрана просмотра изменений -->
    <header class="flex items-center p-4 border-b">
      <button 
        class="mr-2 text-gray-600 hover:text-gray-900"
        @click="goBack"
        title="Назад"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
      </button>
      
      <div class="flex-1 mx-2 truncate">
        <div class="text-lg font-bold truncate">{{ taskTitle }}</div>
        <div class="text-sm text-gray-500 truncate">{{ displayUrl }}</div>
      </div>
      
      <a 
        :href="taskUrl" 
        target="_blank"
        class="text-blue-600 bg-blue-50 px-3 py-1 rounded text-sm hover:bg-blue-100 whitespace-nowrap flex items-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
          <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
        </svg>
        Открыть страницу
      </a>
    </header>
    
    <!-- Индикатор загрузки -->
    <div v-if="loading" class="flex flex-col items-center justify-center h-64">
      <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
      <p class="mt-4 text-gray-600">Загрузка изменений...</p>
    </div>
    
    <!-- Ошибка загрузки -->
    <div v-else-if="!task" class="flex flex-col items-center justify-center h-64">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-gray-300 mb-4" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>
      <p class="text-gray-600 mb-4">Задача не найдена</p>
      <button 
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        @click="goBack"
      >
        Назад
      </button>
    </div>
    
    <!-- Панель сравнения изменений -->
    <div v-else class="p-4">
      <!-- Заголовки панелей сравнения -->
      <div class="grid grid-cols-2 gap-4 mb-2">
        <div class="bg-gray-50 rounded p-2 text-center text-sm font-medium text-gray-700">
          Исходный вид
        </div>
        <div class="bg-gray-50 rounded p-2 text-center text-sm font-medium text-gray-700">
          Текущий вид
        </div>
      </div>
      
      <!-- Даты снимков -->
      <div class="grid grid-cols-2 gap-4 mb-2">
        <div class="text-xs text-gray-500 text-center">
          {{ formatDate(task.createdAt) }}
        </div>
        <div class="text-xs text-gray-500 text-center">
          {{ formatDate(task.lastCheckedAt) }}
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
          class="flex-1 py-2 rounded bg-purple-600 text-white hover:bg-purple-700"
          @click="resetChanges"
        >
          Сбросить изменения
        </button>
        <a 
          :href="task.url" 
          target="_blank"
          class="flex-1 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-center"
        >
          Открыть сайт
        </a>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, computed, onMounted } from 'vue'
import browser from 'webextension-polyfill'

export default defineComponent({
  name: 'ViewChanges',
  
  setup() {
    const router = window.vueRouter
    const loading = ref(true)
    const task = ref(null)
    const tasks = ref([])
    
    // Получение ID задачи из URL
    const taskId = computed(() => {
      if (!router) return null
      const routeParams = router.currentRoute.value.params
      return routeParams.id
    })
    
    // Вычисляемые свойства
    const taskTitle = computed(() => task.value?.title || 'Просмотр изменений')
    const taskUrl = computed(() => task.value?.url || '#')
    const displayUrl = computed(() => {
      if (!task.value?.url) return ''
      
      try {
        const url = new URL(task.value.url)
        return url.hostname
      } catch {
        return task.value.url
      }
    })
    
    // Форматирование даты
    function formatDate(timestamp) {
      if (!timestamp) return ''
      
      const date = new Date(timestamp)
      return date.toLocaleString()
    }
    
    // Загрузка задач
    async function loadTasks() {
      loading.value = true
      
      try {
        // Загрузка из хранилища
        const result = await browser.storage.local.get('tasks')
        
        if (result.tasks && Array.isArray(result.tasks)) {
          tasks.value = result.tasks
          
          // Находим нужную задачу по ID
          if (taskId.value) {
            task.value = tasks.value.find(t => t.id === taskId.value) || null
          }
          
          if (!task.value) {
            console.warn('Task not found:', taskId.value)
          }
        } else {
          console.warn('No tasks found in storage')
        }
      } catch (err) {
        console.error('Error loading tasks:', err)
      } finally {
        loading.value = false
      }
    }
    
    // Переход назад
    function goBack() {
      if (router) {
        router.push('/')
      } else {
        window.history.back()
      }
    }
    
    // Сброс изменений
    async function resetChanges() {
      if (!task.value) return
      
      try {
        // Обновление задачи
        const taskIndex = tasks.value.findIndex(t => t.id === task.value.id)
        if (taskIndex !== -1) {
          // Обновляем статус и исходный HTML
          tasks.value[taskIndex].status = 'unchanged'
          tasks.value[taskIndex].initialHtml = task.value.currentHtml
          
          // Сохраняем изменения
          await browser.storage.local.set({ tasks: tasks.value })
          
          // Возвращаемся на главный экран
          goBack()
        }
      } catch (err) {
        console.error('Error resetting changes:', err)
        alert('Не удалось сбросить изменения')
      }
    }
    
    // Загрузка при монтировании
    onMounted(() => {
      loadTasks()
    })
    
    return {
      loading,
      task,
      taskId,
      taskTitle,
      taskUrl,
      displayUrl,
      formatDate,
      goBack,
      resetChanges
    }
  }
})
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
