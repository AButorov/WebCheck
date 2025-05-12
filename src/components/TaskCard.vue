<template>
  <div 
    :class="cardClasses"
  >
    <!-- Статус и заголовок -->
    <div class="flex items-start">
      <div class="mr-2">
        <button 
          @click="toggleStatus" 
          class="flex items-center justify-center w-5 h-5 border-2 rounded" 
          :class="checkboxClass"
          :title="statusTitle"
        >
          <svg v-if="task.status !== 'paused'" xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
      
      <div class="flex-grow mr-16">
        <h3 class="text-md font-bold mb-0.5 truncate">{{ task.title }}</h3>
        <div class="flex items-center text-xs text-gray-600">
          <img 
            :src="task.faviconUrl || '/icons/icon-16.png'" 
            alt="Site icon" 
            class="w-3 h-3 mr-1"
            @error="onFaviconError"
          />
          <a :href="task.url" target="_blank" class="hover:underline truncate">{{ displayUrl }}</a>
        </div>
      </div>
      
      <!-- Кнопки управления (справа вверху) -->
      <div class="absolute top-2 right-2 flex space-x-1">
        <!-- Кнопка просмотра изменений -->
        <button 
          class="rounded-full p-1.5"
          :class="viewButtonClass"
          :disabled="task.status !== 'changed'"
          @click="emit('view', task.id)"
          :title="task.status === 'changed' ? 'Просмотр изменений' : 'Нет изменений для просмотра'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
          </svg>
        </button>
        
        <!-- Кнопка удаления -->
        <button 
          :class="`text-white bg-[${COLORS.DELETE}] hover:bg-red-600 rounded-full p-1.5`"
          @click="emit('remove', task.id)"
          title="Удалить задачу"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
    
    <!-- Интервал и прогресс -->
    <div class="flex items-center mt-2">
      <div class="flex items-center text-xs mr-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 mr-1 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
        </svg>
        <select 
          v-model="interval" 
          class="bg-transparent text-xs border border-gray-300 rounded px-1 py-0.5"
          :disabled="task.status === 'paused'"
          @change="updateInterval"
        >
          <option value="15m">15м</option>
          <option value="1h">1ч</option>
          <option value="3h">3ч</option>
          <option value="1d">1д</option>
        </select>
      </div>
      
      <div class="flex-grow">
        <div class="bg-gray-200 rounded-full h-1.5">
          <div 
            class="h-1.5 rounded-full"
            :style="{ width: remainingTimePercent + '%' }"
            :class="progressClass"
          ></div>
        </div>
        <div class="text-xs text-gray-500 mt-0.5">
          {{ remainingTimeText }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, computed } from 'vue'
import { COLORS } from '~/utils/constants'

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
    
    // Заголовок статуса для подсказки
    const statusTitle = computed(() => {
      switch (props.task.status) {
        case 'changed':
          return 'Обнаружены изменения (нажмите чтобы приостановить)'
        case 'unchanged':
          return 'Активно (нажмите чтобы приостановить)'
        case 'paused':
          return 'Приостановлено (нажмите чтобы возобновить)'
      }
    })
    
    // Определение классов для чекбокса в зависимости от статуса
    const checkboxClass = computed(() => {
      switch (props.task.status) {
        case 'changed':
          return `text-[${COLORS.CHANGED.MAIN}] border-[${COLORS.CHANGED.MAIN}]`
        case 'unchanged':
          return `text-[${COLORS.UNCHANGED.MAIN}] border-[${COLORS.UNCHANGED.MAIN}]`
        case 'paused':
          return `text-[${COLORS.PAUSED.MAIN}] border-[${COLORS.PAUSED.MAIN}]`
      }
    })
    
    // Определение классов для кнопки просмотра в зависимости от статуса
    const viewButtonClass = computed(() => {
      if (props.task.status === 'changed') {
        return `text-white bg-[${COLORS.VIEW_CHANGES}] hover:bg-purple-700`
      }
      return 'text-white bg-gray-400 cursor-not-allowed'
    })
    
    // Классы для карточки
    const cardClasses = computed(() => {
      const baseClasses = 'task-card relative rounded-lg p-3 mb-3 border-2 transition-all hover:shadow-md'
      
      switch (props.task.status) {
        case 'changed':
          return `${baseClasses} bg-[${COLORS.CHANGED.BG}] border-[${COLORS.CHANGED.BORDER}]`
        case 'unchanged':
          return `${baseClasses} bg-[${COLORS.UNCHANGED.BG}] border-[${COLORS.UNCHANGED.BORDER}]`
        case 'paused':
          return `${baseClasses} bg-[${COLORS.PAUSED.BG}] border-[${COLORS.PAUSED.BORDER}]`
      }
    })
    
    // Классы для прогресс-бара
    const progressClass = computed(() => {
      switch (props.task.status) {
        case 'changed':
          return `bg-[${COLORS.CHANGED.MAIN}]`
        case 'unchanged':
          return `bg-[${COLORS.UNCHANGED.MAIN}]`
        case 'paused':
          return `bg-[${COLORS.PAUSED.MAIN}]`
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
      viewButtonClass,
      remainingTimePercent,
      remainingTimeText,
      statusTitle,
      onFaviconError,
      updateInterval,
      toggleStatus,
      emit
    }
  }
})
</script>
