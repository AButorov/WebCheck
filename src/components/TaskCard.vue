<template>
  <div 
    :class="[
      'task-card relative rounded-xl p-4 mb-4 border-2 transition-all hover:shadow-md',
      {
        'bg-[#fff8e1] border-[#ffecb3]': task.status === 'changed',
        'bg-[#f1f8e9] border-[#dcedc8]': task.status === 'unchanged',
        'bg-[#f5f5f5] border-[#eeeeee]': task.status === 'paused'
      }
    ]"
  >
    <!-- Заголовок и статус -->
    <div class="flex items-start mb-2">
      <div class="mr-3">
        <button 
          @click="toggleStatus" 
          class="flex items-center justify-center w-6 h-6 border-2 rounded" 
          :class="checkboxClass"
          :title="checkboxTitle"
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
        class="absolute top-2 right-2 text-[#f44336] hover:bg-[#ffebee] rounded-full p-1"
        @click="$emit('remove', task.id)"
        :title="t('popup.taskCard.actions.delete')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
    
    <!-- Интервал и кнопка просмотра изменений -->
    <div class="flex items-center justify-between mt-3">
      <div class="flex items-center">
        <span class="text-sm mr-2">{{ t('popup.taskCard.interval.label') }}:</span>
        <select 
          v-model="selectedInterval" 
          class="bg-white border border-gray-300 rounded px-2 py-1 text-sm"
          :disabled="task.status === 'paused'"
        >
          <option value="15m">{{ t('popup.taskCard.interval.15m') }}</option>
          <option value="1h">{{ t('popup.taskCard.interval.1h') }}</option>
          <option value="3h">{{ t('popup.taskCard.interval.3h') }}</option>
          <option value="1d">{{ t('popup.taskCard.interval.1d') }}</option>
        </select>
      </div>
      
      <!-- Кнопка просмотра изменений -->
      <button 
        class="bg-[#673ab7] text-white px-3 py-1 rounded flex items-center"
        :disabled="task.status !== 'changed'"
        :class="{ 'opacity-50 cursor-not-allowed': task.status !== 'changed' }"
        @click="$emit('view', task.id)"
        :title="t('popup.taskCard.actions.view')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
        </svg>
        {{ t('popup.taskCard.actions.view') }}
      </button>
    </div>
    
    <!-- Прогресс-бар и время до следующей проверки -->
    <div class="mt-3">
      <div class="bg-gray-200 rounded-full h-2 mb-1">
        <div 
          class="h-2 rounded-full"
          :style="{ width: `${remainingTimePercent}%` }"
          :class="{
            'bg-[#ffb300]': task.status === 'changed',
            'bg-[#4caf50]': task.status === 'unchanged',
            'bg-[#9e9e9e]': task.status === 'paused'
          }"
        ></div>
      </div>
      <div class="text-xs text-gray-500">
        {{ task.status === 'paused' ? t('popup.taskCard.paused') : remainingTimeText }}
      </div>
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

// Обработка ошибки загрузки favicon
function onFaviconError(event: Event) {
  const target = event.target as HTMLImageElement;
  target.src = '/icons/icon-16.png';
}

const displayUrl = computed(() => {
  try {
    const url = new URL(props.task.url)
    return url.hostname
  } catch {
    return props.task.url
  }
})

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
