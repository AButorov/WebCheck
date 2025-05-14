<template>
  <div 
    :class="cardClasses"
  >
    <!-- Статус и заголовок -->
    <div class="flex items-start">
      <div class="mr-2">
        <button 
          @click="toggleStatus" 
          class="flex items-center justify-center w-7 h-7 border-2 rounded" 
          :class="checkboxClass"
          :title="statusTitle"
        >
          <svg v-if="task.status !== 'paused'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
      
      <div class="flex-grow mr-20">
        <h3 class="text-xl font-bold mb-1 truncate">{{ task.title }}</h3>
        <div class="flex items-center text-base text-gray-600">
          <img 
            :src="task.faviconUrl || '/icons/icon-16.png'" 
            alt="Site icon" 
            class="w-5 h-5 mr-1.5"
            @error="onFaviconError"
          />
          <a :href="task.url" target="_blank" class="hover:underline truncate">{{ displayUrl }}</a>
        </div>
      </div>
      
      <!-- Кнопка удаления (справа вверху) -->
      <div class="absolute top-2 right-2">
        <button 
          class="text-white bg-[#f44336] hover:bg-red-600 rounded-full p-1.5"
          @click="emit('remove', task.id)"
          title="Удалить задачу"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
    
    <!-- Интервал и прогресс -->
    <div class="flex items-center mt-3">
      <div class="flex items-center text-sm mr-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1.5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
        </svg>
        <select 
          v-model="interval" 
          class="bg-transparent text-sm border border-gray-300 rounded px-2 py-0.5"
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
        <div class="bg-gray-200 rounded-full h-3">
          <div 
            class="h-3 rounded-full"
            :style="{ width: remainingTimePercent + '%' }"
            :class="progressClass"
          ></div>
        </div>
        <div class="text-sm text-gray-600 mt-1">
          {{ remainingTimeText }}
        </div>
      </div>
    </div>
    
    <!-- Блок кнопок (остановка/возобновление, просмотр изменений) -->
    <div class="flex space-x-2 mt-3 justify-end">
      <!-- Кнопка остановки/возобновления -->
      <button 
        class="text-white rounded-full p-2"
        :class="task.status === 'paused' ? 'bg-[#4caf50] hover:bg-green-600' : 'bg-[#ff9800] hover:bg-orange-600'"
        @click="toggleStatus"
        :title="task.status === 'paused' ? 'Возобновить отслеживание' : 'Приостановить отслеживание'"
      >
        <svg v-if="task.status === 'paused'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
      </button>
      
      <!-- Кнопка просмотра изменений -->
      <button 
        class="rounded-full p-2"
        :class="viewButtonClass"
        :disabled="task.status !== 'changed'"
        @click="emit('view', task.id)"
        :title="task.status === 'changed' ? 'Просмотр изменений' : 'Нет изменений для просмотра'"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
        </svg>
      </button>
      
      <!-- Кнопка обновления -->
      <button 
        class="text-white bg-[#2196f3] hover:bg-blue-600 rounded-full p-2"
        @click="emit('refresh', task.id)"
        title="Обновить сейчас"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, computed } from 'vue'
// Константы используются только в JavaScript, не в шаблонах
import { COLORS, CHECK_INTERVALS } from '~/utils/constants'

export default defineComponent({
  name: 'TaskCard',
  
  props: {
    task: {
      type: Object,
      required: true
    }
  },
  
  emits: ['update:interval', 'update:status', 'view', 'remove', 'edit', 'refresh'],
  
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
          return 'text-[#ffb300] border-[#ffb300]'
        case 'unchanged':
          return 'text-[#4caf50] border-[#4caf50]'
        case 'paused':
          return 'text-[#9e9e9e] border-[#9e9e9e]'
      }
    })
    
    // Определение классов для кнопки просмотра в зависимости от статуса
    const viewButtonClass = computed(() => {
      if (props.task.status === 'changed') {
        return 'text-white bg-[#673ab7] hover:bg-purple-700'
      }
      return 'text-white bg-gray-400 cursor-not-allowed opacity-50'
    })
    
    // Классы для карточки
    const cardClasses = computed(() => {
      const baseClasses = 'task-card relative rounded-lg p-4 mb-4 border-2 transition-all hover:shadow-md'
      
      switch (props.task.status) {
        case 'changed':
          return `${baseClasses} bg-[#fff8e1] border-[#ffecb3]`
        case 'unchanged':
          return `${baseClasses} bg-[#f1f8e9] border-[#dcedc8]`
        case 'paused':
          return `${baseClasses} bg-[#f5f5f5] border-[#eeeeee]`
      }
    })
    
    // Классы для прогресс-бара
    const progressClass = computed(() => {
      switch (props.task.status) {
        case 'changed':
          return 'bg-[#ffb300]'
        case 'unchanged':
          return 'bg-[#4caf50]'
        case 'paused':
          return 'bg-[#9e9e9e]'
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
      // Используем константы из файла констант
      switch (interval) {
        case CHECK_INTERVALS.FIFTEEN_MINUTES.value:
          return CHECK_INTERVALS.FIFTEEN_MINUTES.milliseconds
        case CHECK_INTERVALS.ONE_HOUR.value:
          return CHECK_INTERVALS.ONE_HOUR.milliseconds
        case CHECK_INTERVALS.THREE_HOURS.value:
          return CHECK_INTERVALS.THREE_HOURS.milliseconds
        case CHECK_INTERVALS.ONE_DAY.value:
          return CHECK_INTERVALS.ONE_DAY.milliseconds
        default:
          return CHECK_INTERVALS.ONE_HOUR.milliseconds // По умолчанию 1 час
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
