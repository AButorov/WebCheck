<template>
  <div class="container mx-auto p-6 max-w-3xl">
    <h1 class="text-2xl font-bold mb-6">{{ t('options.title') }}</h1>
    
    <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h2 class="text-xl font-semibold mb-4">{{ t('options.general') }}</h2>
      
      <!-- Языковые настройки -->
      <div class="mb-4">
        <label class="block text-gray-700 mb-2" for="language">
          {{ t('options.language') }}
        </label>
        <select 
          id="language" 
          v-model="language" 
          class="w-full border border-gray-300 rounded px-3 py-2"
        >
          <option value="ru">Русский</option>
          <option value="en">English</option>
        </select>
      </div>
      
      <!-- Максимальное количество задач -->
      <div class="mb-4">
        <label class="block text-gray-700 mb-2" for="maxTasks">
          {{ t('options.maxTasks') }}
        </label>
        <input 
          id="maxTasks" 
          v-model="maxTasks" 
          type="number" 
          min="1" 
          max="20" 
          class="w-full border border-gray-300 rounded px-3 py-2"
        />
        <p class="text-sm text-gray-500 mt-1">
          {{ t('options.maxTasksDescription') }}
        </p>
      </div>
      
      <!-- Интервал проверки по умолчанию -->
      <div class="mb-4">
        <label class="block text-gray-700 mb-2" for="defaultInterval">
          {{ t('options.defaultInterval') }}
        </label>
        <select 
          id="defaultInterval" 
          v-model="defaultInterval" 
          class="w-full border border-gray-300 rounded px-3 py-2"
        >
          <option value="15m">{{ t('popup.taskCard.intervals.15m') }}</option>
          <option value="1h">{{ t('popup.taskCard.intervals.1h') }}</option>
          <option value="3h">{{ t('popup.taskCard.intervals.3h') }}</option>
          <option value="1d">{{ t('popup.taskCard.intervals.1d') }}</option>
        </select>
      </div>
    </div>
    
    <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h2 class="text-xl font-semibold mb-4">{{ t('options.notifications') }}</h2>
      
      <!-- Включение/выключение уведомлений -->
      <div class="mb-4">
        <label class="flex items-center">
          <input 
            type="checkbox" 
            v-model="enableNotifications" 
            class="form-checkbox h-5 w-5 text-primary"
          />
          <span class="ml-2">{{ t('options.enableNotifications') }}</span>
        </label>
      </div>
      
      <!-- Звук уведомлений -->
      <div class="mb-4" v-if="enableNotifications">
        <label class="block text-gray-700 mb-2" for="notificationSound">
          {{ t('options.notificationSound') }}
        </label>
        <select 
          id="notificationSound" 
          v-model="notificationSound" 
          class="w-full border border-gray-300 rounded px-3 py-2"
        >
          <option value="default">{{ t('options.defaultSound') }}</option>
          <option value="none">{{ t('options.noSound') }}</option>
        </select>
      </div>
    </div>
    
    <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h2 class="text-xl font-semibold mb-4">{{ t('options.data') }}</h2>
      
      <!-- Экспорт/импорт данных -->
      <div class="flex flex-wrap gap-4">
        <button 
          @click="exportData" 
          class="bg-primary text-white px-4 py-2 rounded hover:bg-primary-bright transition-colors"
        >
          {{ t('options.exportData') }}
        </button>
        
        <label 
          class="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors cursor-pointer"
        >
          {{ t('options.importData') }}
          <input 
            type="file" 
            @change="importData" 
            accept=".json" 
            class="hidden"
          />
        </label>
        
        <button
          @click="resetConfirmationVisible = true"
          class="bg-red-action text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
        >
          {{ t('options.resetData') }}
        </button>
      </div>
    </div>
    
    <!-- Кнопки в нижней части -->
    <div class="flex justify-end gap-4">
      <button 
        @click="resetSettings" 
        class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
      >
        {{ t('options.resetSettings') }}
      </button>
      
      <button 
        @click="saveSettings" 
        class="bg-primary text-white px-4 py-2 rounded hover:bg-primary-bright transition-colors"
      >
        {{ t('options.saveSettings') }}
      </button>
    </div>
    
    <!-- Модальное окно подтверждения сброса данных -->
    <div v-if="resetConfirmationVisible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div class="bg-white rounded-lg p-6 max-w-md mx-4">
        <h3 class="text-xl font-bold mb-4">{{ t('options.confirmReset') }}</h3>
        <p class="mb-6">{{ t('options.confirmResetDescription') }}</p>
        
        <div class="flex justify-end gap-4">
          <button 
            @click="resetConfirmationVisible = false" 
            class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
          >
            {{ t('options.cancel') }}
          </button>
          
          <button 
            @click="resetData" 
            class="bg-red-action text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
          >
            {{ t('options.confirmResetBtn') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import browser from 'webextension-polyfill'
import { useTasksStore } from '~/stores/tasks'

const { t, locale } = useI18n()
const tasksStore = useTasksStore()

// Настройки
const language = ref('ru')
const maxTasks = ref(5)
const defaultInterval = ref('1h')
const enableNotifications = ref(true)
const notificationSound = ref('default')
const resetConfirmationVisible = ref(false)

// Загрузка настроек
onMounted(async () => {
  const storage = await browser.storage.local.get('settings')
  if (storage.settings) {
    language.value = storage.settings.language || 'ru'
    maxTasks.value = storage.settings.maxTasks || 5
    defaultInterval.value = storage.settings.defaultInterval || '1h'
    enableNotifications.value = storage.settings.enableNotifications !== false
    notificationSound.value = storage.settings.notificationSound || 'default'
    
    // Установка языка
    locale.value = language.value
  }
})

// Сохранение настроек
async function saveSettings() {
  const settings = {
    language: language.value,
    maxTasks: maxTasks.value,
    defaultInterval: defaultInterval.value,
    enableNotifications: enableNotifications.value,
    notificationSound: notificationSound.value,
  }
  
  await browser.storage.local.set({ settings })
  
  // Обновление языка
  locale.value = language.value
  
  // Обновление максимального количества задач
  tasksStore.maxTasks = maxTasks.value
  
  alert(t('options.settingsSaved'))
}

// Сброс настроек
async function resetSettings() {
  language.value = 'ru'
  maxTasks.value = 5
  defaultInterval.value = '1h'
  enableNotifications.value = true
  notificationSound.value = 'default'
}

// Экспорт данных
async function exportData() {
  const storage = await browser.storage.local.get()
  const dataStr = JSON.stringify(storage, null, 2)
  const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`
  
  const exportEl = document.createElement('a')
  exportEl.setAttribute('href', dataUri)
  exportEl.setAttribute('download', `web-check-backup-${new Date().toISOString().slice(0, 10)}.json`)
  exportEl.click()
}

// Импорт данных
async function importData(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  
  const file = input.files[0]
  const reader = new FileReader()
  
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target?.result as string)
      await browser.storage.local.set(data)
      alert(t('options.dataImported'))
      
      // Перезагрузка страницы для применения новых настроек
      window.location.reload()
    } catch (error) {
      alert(t('options.dataImportError'))
      console.error('Import error:', error)
    }
  }
  
  reader.readAsText(file)
}

// Сброс данных
async function resetData() {
  await browser.storage.local.clear()
  resetConfirmationVisible.value = false
  alert(t('options.dataReset'))
  
  // Перезагрузка страницы
  window.location.reload()
}
</script>
