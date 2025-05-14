<template>
  <div class="min-h-[500px] w-[380px] p-3">
    <!-- Шапка приложения -->
    <header class="flex justify-between items-center mb-6 pb-2 border-b">
      <div class="flex items-center">
        <h1 class="text-2xl font-bold">Web Check</h1>
        <button 
          class="ml-3 text-gray-600 hover:text-gray-900 p-1 rounded-full hover:bg-gray-100 transition-colors"
          title="Настройки"
          @click="openOptions"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
      <button 
        class="bg-[#3e66fb] text-white p-2 rounded-full hover:bg-blue-700 transition-colors"
        title="Добавить новую задачу"
        @click="handleAddTask"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
        </svg>
      </button>
    </header>
    
    <!-- Индикатор загрузки -->
    <div v-if="loading" class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#2d6cdf]"></div>
      <span class="ml-3 text-gray-600">Загрузка задач...</span>
    </div>
    
    <!-- Сообщение об ошибке -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-xl p-4 mt-4 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-red-500 mb-2" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>
      <p class="text-red-800 mb-2">{{ error }}</p>
      <button 
        class="text-[#2d6cdf] hover:underline mt-2"
        @click="loadTasks"
      >
        Попробовать снова
      </button>
    </div>
    
    <!-- Пустой список задач -->
    <div v-else-if="tasks.length === 0" class="flex flex-col items-center justify-center h-64 text-gray-400">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mb-4 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm0 2a1 1 0 00-1 1v6a1 1 0 001 1h10a1 1 0 001-1V7a1 1 0 00-1-1H5z" clip-rule="evenodd" />
      </svg>
      <p class="text-lg mb-4">Нет активных задач.</p>
      <button 
        class="bg-[#3e66fb] text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        @click="handleAddTask"
      >
        Добавить задачу
      </button>
    </div>
    
    <!-- Список задач -->
    <div v-else>
      <div class="space-y-4">
        <TaskCard 
          v-for="task in tasks" 
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
    <footer class="mt-4 pt-4 border-t text-center" v-if="tasks.length > 0">
      <p class="text-sm text-gray-500">
        Активно {{ activeTaskCount }} из {{ maxTasks }} задач
      </p>
    </footer>
  </div>
</template>

<script>
import { defineComponent, onMounted, ref, computed } from 'vue'
import TaskCard from '~/components/TaskCard.vue'
import browser from 'webextension-polyfill'
// Константы используются только в JavaScript, не в шаблонах
import { COLORS, MAX_TASKS } from '~/utils/constants'

export default defineComponent({
  name: 'IndexPage',
  
  components: {
    TaskCard
  },
  
  setup() {
    const router = window.vueRouter
    const tasks = ref([])
    const loading = ref(true)
    const error = ref(null)
    const maxTasks = ref(MAX_TASKS)
    
    // Вычисляемые свойства
    const activeTaskCount = computed(() => {
      return tasks.value.filter(task => task.status !== 'paused').length
    })
    
    // Загрузка задач
    async function loadTasks() {
      console.log('Loading tasks...')
      loading.value = true
      error.value = null
      
      try {
        // Загрузка из хранилища
        const result = await browser.storage.local.get('tasks')
        
        if (result.tasks && Array.isArray(result.tasks) && result.tasks.length > 0) {
          console.log('Tasks loaded:', result.tasks)
          tasks.value = result.tasks
        } else {
          console.log('No tasks found, generating demo tasks')
          tasks.value = generateDemoTasks()
          await saveTasks()
        }
      } catch (err) {
        console.error('Error loading tasks:', err)
        error.value = 'Не удалось загрузить задачи: ' + (err.message || 'Неизвестная ошибка')
        
        // Fallback to demo data
        tasks.value = generateDemoTasks()
      } finally {
        loading.value = false
      }
    }
    
    // Сохранение задач
    async function saveTasks() {
      try {
        await browser.storage.local.set({ tasks: tasks.value })
        console.log('Tasks saved')
      } catch (err) {
        console.error('Error saving tasks:', err)
        error.value = 'Не удалось сохранить задачи'
      }
    }
    
    // Демо-задачи
    function generateDemoTasks() {
      console.log('Generating demo tasks')
      const now = Date.now()
      const hourAgo = now - 60 * 60 * 1000
      const dayAgo = now - 24 * 60 * 60 * 1000
      
      return [
        {
          id: generateId(),
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
          id: generateId(),
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
          id: generateId(),
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
    
    // Генерация уникального ID
    function generateId() {
      return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
    }
    
    // Добавление новой задачи
    function handleAddTask() {
      if (tasks.value.length >= maxTasks.value) {
        alert('Достигнут лимит задач. Пожалуйста, удалите какую-либо задачу перед добавлением новой.')
        return
      }
      
      // Временная заглушка - в реальном расширении тут будет код для выбора элемента на странице
      alert('Функция добавления новой задачи находится в разработке')
    }
    
    // Обновление интервала задачи
    async function updateTaskInterval(taskId, interval) {
      const taskIndex = tasks.value.findIndex(task => task.id === taskId)
      if (taskIndex !== -1) {
        tasks.value[taskIndex].interval = interval
        await saveTasks()
      }
    }
    
    // Обновление статуса задачи
    async function updateTaskStatus(taskId, status) {
      const taskIndex = tasks.value.findIndex(task => task.id === taskId)
      if (taskIndex !== -1) {
        tasks.value[taskIndex].status = status
        await saveTasks()
      }
    }
    
    // Просмотр изменений
    function viewTaskChanges(taskId) {
      if (router) {
        router.push(`/view-changes/${taskId}`)
      } else {
        console.warn('Router not available')
        alert('Просмотр изменений временно недоступен')
      }
    }
    
    // Удаление задачи
    async function removeTask(taskId) {
      if (confirm('Вы уверены, что хотите удалить эту задачу?')) {
        tasks.value = tasks.value.filter(task => task.id !== taskId)
        await saveTasks()
      }
    }
    
    // Открытие страницы настроек
    function openOptions() {
      // Открываем страницу настроек в новой вкладке
      browser.runtime.openOptionsPage()
    }
    
    // Загрузка данных при монтировании
    onMounted(() => {
      loadTasks()
    })
    
    return {
      tasks,
      loading,
      error,
      maxTasks,
      activeTaskCount,
      loadTasks,
      handleAddTask,
      updateTaskInterval,
      updateTaskStatus,
      viewTaskChanges,
      removeTask,
      openOptions
    }
  }
})
</script>
