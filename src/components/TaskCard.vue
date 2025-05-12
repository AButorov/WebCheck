<template>
  <div 
    :class="cardClasses"
  >
    <!-- Заголовок и статус -->
    <div class="flex items-start mb-2">
      <div class="mr-3">
        <button 
          @click="toggleStatus" 
          class="flex items-center justify-center w-6 h-6 border-2 rounded" 
          :class="checkboxClass"
        >
          <svg v-if="task.status !== 'paused'" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
      
      <div class="flex-grow">
        <h3 class="text-lg font-bold mb-1 pr-6">{{ task.title }}</h3>
        <div class="flex items-center text-sm text-gray-600 mb-1">
          <img 
            :src="task.faviconUrl || '/icons/icon-16.png'" 
            alt="Site icon" 
            class="w-4 h-4 mr-1"
            @error="onFaviconError"
          />
          <a :href="task.url" target="_blank" class="hover:underline truncate">{{ displayUrl }}</a>
        </div>
      </div>
      
      <!-- Кнопка удаления -->
      <button 
        class="absolute top-2 right-2 text-red-500 hover:bg-red-50 rounded-full p-1"
        @click="emit('remove', task.id)"
        title="Удалить задачу"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
    
    <!-- Интервал и кнопка просмотра изменений -->
    <div class="flex items-center justify-between mt-3">
      <div class="flex items-center">
        <span class="text-sm mr-2">Интервал:</span>
        <select 
          v-model="interval" 
          class="bg-white border border-gray-300 rounded px-2 py-1 text-sm"
          :disabled="task.status === 'paused'"
          @change="updateInterval"
        >
          <option value="15m">15м</option>
          <option value="1h">1ч</option>
          <option value="3h">3ч</option>
          <option value="1d">1д</option>
        </select>
      </div>
      
      <!-- Кнопка просмотра изменений -->
      <button 
        class="bg-purple-600 text-white px-3 py-1 rounded flex items-center"
        :disabled="task.status !== 'changed'"
        :class="{ 'opacity-50 cursor-not-allowed': task.status !== 'changed' }"
        @click="emit('view', task.id)"
        title="Просмотр изменений"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
        </svg>
        Просмотр
      </button>
    </div>
    
    <!-- Прогресс-бар и время до следующей проверки -->
    <div class="mt-3">
      <div class="bg-gray-200 rounded-full h-2 mb-1">
        <div 
          class="h-2 rounded-full"
          :style="{ width: remainingTimePercent + '%' }"
          :class="progressClass"
        ></div>
      </div>
      <div class="text-xs text-gray-500">
        {{ remainingTimeText }}
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, computed } from 'vue'

export default defineComponent({
  name: 'TaskCard',
  
  props: {
    task: {
      type: Object,
      required: true
    }
  },
  
  emits: ['update:interval', 'update:status', 'view', 'remove'],
  
  setup(props, { emit }) {
    // Локальный реф для интервала
    const interval = ref(props.task.interval)
    
    // Обработка ошибки загрузки favicon
    function onFaviconError(event) {
      event.target.src = '/icons/icon-16.png'
    }
    
    // Обработчик изменения интервала
    function updateInterval() {
      emit('update:interval', props.task.id, interval.value)
    }
    
    // Вычисление URL для отображения
    const displayUrl = computed(() => {
      try {
        const url = new URL(props.task.url)
        return url.hostname
      } catch {
        return props.task.url
      }
    })
    
    // Определение классов для чекбокса в зависимости от статуса
    const checkboxClass = computed(() => {
      switch (props.task.status) {
        case 'changed':
          return 'text-amber-500 border-amber-500'
        case 'unchanged':
          return 'text-green-500 border-green-500'
        case 'paused':
          return 'text-gray-400 border-gray-400'
      }
    })
    
    // Классы для карточки
    const cardClasses = computed(() => {
      const baseClasses = 'task-card relative rounded-xl p-4 mb-4 border-2 transition-all hover:shadow-md'
      
      switch (props.task.status) {
        case 'changed':
          return `${baseClasses} bg-amber-50 border-amber-200`
        case 'unchanged':
          return `${baseClasses} bg-green-50 border-green-200`
        case 'paused':
          return `${baseClasses} bg-gray-50 border-gray-200`
      }
    })
    
    // Классы для прогресс-бара
    const progressClass = computed(() => {
      switch (props.task.status) {
        case 'changed':
          return 'bg-amber-500'
        case 'unchanged':
          return 'bg-green-500'
        case 'paused':
          return 'bg-gray-400'
      }
    })
    
    // Процент оставшегося времени
    const remainingTimePercent = computed(() => {
      if (props.task.status === 'paused') {
        return 0
      }
      
      return calculateTimeRemaining(props.task.lastCheckedAt, props.task.interval)
    })
    
    // Текст оставшегося времени
    const remainingTimeText = computed(() => {
      if (props.task.status === 'paused') {
        return 'Приостановлено'
      }
      
      return formatRemainingTime(props.task.lastCheckedAt, props.task.interval)
    })
    
    // Функция для расчета оставшегося времени в процентах
    function calculateTimeRemaining(lastCheckedAt, interval) {
      const now = Date.now()
      const intervalMs = getIntervalMs(interval)
      const nextCheckAt = lastCheckedAt + intervalMs
      const remainingMs = Math.max(0, nextCheckAt - now)
      
      return Math.floor((remainingMs / intervalMs) * 100)
    }
    
    // Функция для форматирования оставшегося времени
    function formatRemainingTime(lastCheckedAt, interval) {
      const now = Date.now()
      const intervalMs = getIntervalMs(interval)
      const nextCheckAt = lastCheckedAt + intervalMs
      const remainingMs = Math.max(0, nextCheckAt - now)
      
      if (remainingMs <= 0) {
        return 'Следующая проверка в ближайшее время'
      }
      
      const minutes = Math.floor(remainingMs / (60 * 1000))
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      
      if (hours > 0) {
        return `${hours}ч ${remainingMinutes}м`
      } else {
        return `${minutes}м`
      }
    }
    
    // Преобразование интервала в миллисекунды
    function getIntervalMs(interval) {
      switch (interval) {
        case '15m':
          return 15 * 60 * 1000
        case '1h':
          return 60 * 60 * 1000
        case '3h':
          return 3 * 60 * 60 * 1000
        case '1d':
          return 24 * 60 * 60 * 1000
        default:
          return 60 * 60 * 1000 // default to 1 hour
      }
    }
    
    // Переключение статуса (приостановлено/активно)
    function toggleStatus() {
      const newStatus = props.task.status === 'paused' ? 'unchanged' : 'paused'
      emit('update:status', props.task.id, newStatus)
    }
    
    return {
      interval,
      displayUrl,
      checkboxClass,
      cardClasses,
      progressClass,
      remainingTimePercent,
      remainingTimeText,
      onFaviconError,
      updateInterval,
      toggleStatus,
      emit
    }
  }
})
</script>
