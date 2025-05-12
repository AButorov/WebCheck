<template>
  <div 
    :class="[
      'relative rounded-lg shadow-sm p-4 mb-4 border',
      {
        'bg-amber-50 border-amber-200': task.status === 'changed',
        'bg-green-50 border-green-200': task.status === 'unchanged',
        'bg-gray-50 border-gray-200': task.status === 'paused'
      }
    ]"
  >
    <!-- Заголовок и статус -->
    <div class="flex justify-between items-start mb-2">
      <div class="flex-1">
        <h3 class="text-lg font-bold truncate pr-8">{{ task.title }}</h3>
        <div class="flex items-center mt-1 text-sm">
          <img 
            :src="task.faviconUrl || '/icons/icon-16.png'" 
            alt="Site icon" 
            class="w-4 h-4 mr-2"
          />
          <span class="truncate">{{ displayUrl }}</span>
        </div>
      </div>
      
      <!-- Кнопка удаления -->
      <button 
        class="absolute top-3 right-3 text-red-500 hover:bg-gray-100 rounded-full p-1"
        @click="$emit('remove', task.id)"
        :title="t('popup.taskCard.actions.delete')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
    
    <!-- Индикатор статуса и интервал -->
    <div class="flex items-center justify-between mt-3">
      <div class="flex items-center">
        <!-- Индикатор статуса (чекбокс) -->
        <button 
          :class="[
            'w-6 h-6 border-2 rounded flex items-center justify-center mr-2',
            {
              'border-amber-500 text-amber-500': task.status === 'changed',
              'border-green-500 text-green-500': task.status === 'unchanged',
              'border-gray-400': task.status === 'paused'
            }
          ]"
          @click="toggleStatus"
          :title="checkboxTitle"
        >
          <svg v-if="task.status !== 'paused'" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </button>
        
        <span :class="['text-sm', { 'text-gray-500': task.status === 'paused' }]">
          {{ t(`popup.taskCard.statuses.${task.status}`) }}
        </span>
      </div>
      
      <!-- Селектор интервала -->
      <select 
        v-model="selectedInterval" 
        class="text-sm bg-white border border-gray-300 rounded px-2 py-1"
        :disabled="task.status === 'paused'"
      >
        <option value="15m">15м</option>
        <option value="1h">1ч</option>
        <option value="3h">3ч</option>
        <option value="1d">1д</option>
      </select>
    </div>
    
    <!-- Индикатор времени и кнопка просмотра изменений -->
    <div class="flex items-center justify-between mt-3">
      <!-- Прогресс-бар оставшегося времени -->
      <div class="relative w-3/4 mr-4">
        <div class="bg-gray-200 rounded-full h-2">
          <div 
            class="h-2 rounded-full"
            :style="{ width: `${remainingTimePercent}%` }"
            :class="{
              'bg-amber-500': task.status === 'changed',
              'bg-green-500': task.status === 'unchanged',
              'bg-gray-400': task.status === 'paused'
            }"
          ></div>
        </div>
        <div class="text-xs text-gray-500 mt-1" v-if="task.status !== 'paused'">
          {{ remainingTimeText }}
        </div>
      </div>
      
      <!-- Кнопка просмотра изменений -->
      <button 
        v-if="task.status === 'changed'"
        class="bg-purple-600 text-white rounded p-1"
        @click="$emit('view', task.id)"
        :title="t('popup.taskCard.actions.view')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { WebCheckTask, TaskInterval } from '~/types/task'
import { formatTimeRemaining, formatRemainingTimeText } from '~/utils/date-format'

const { t } = useI18n()

const props = defineProps<{
  task: WebCheckTask
}>()

const emit = defineEmits<{
  (e: 'update:interval', id: string, interval: TaskInterval): void
  (e: 'update:status', id: string, status: 'paused' | 'unchanged'): void
  (e: 'view', id: string): void
  (e: 'remove', id: string): void
}>()

const selectedInterval = ref(props.task.interval)

watch(selectedInterval, (newValue) => {
  emit('update:interval', props.task.id, newValue as TaskInterval)
})

const displayUrl = computed(() => {
  try {
    const url = new URL(props.task.url)
    return url.hostname
  } catch {
    return props.task.url
  }
})

const remainingTimePercent = computed(() => {
  if (props.task.status === 'paused') {
    return 0
  }
  return formatTimeRemaining(props.task.lastCheckedAt, props.task.interval)
})

const remainingTimeText = computed(() => {
  if (props.task.status === 'paused') {
    return ''
  }
  return formatRemainingTimeText(props.task.lastCheckedAt, props.task.interval)
})

const checkboxTitle = computed(() => {
  if (props.task.status === 'paused') {
    return t('popup.taskCard.actions.resume')
  }
  return t('popup.taskCard.actions.pause')
})

function toggleStatus() {
  const newStatus = props.task.status === 'paused' ? 'unchanged' : 'paused'
  emit('update:status', props.task.id, newStatus)
}
</script>
