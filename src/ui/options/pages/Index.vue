<template>
  <div class="options-page bg-white min-h-screen p-6">
    <header class="mb-8">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-bold text-gray-900">
          {{ translate('options.title') }}
        </h1>
        <div class="flex items-center">
          <img 
            src="/icons/icon-48.png" 
            alt="Web Check Logo" 
            class="h-10 w-10 mr-2"
          >
          <span class="text-sm text-gray-500">Версия {{ version }}</span>
        </div>
      </div>
      <div class="h-0.5 bg-gray-200 w-full" />
    </header>

    <main class="max-w-3xl mx-auto">
      <!-- Форма настроек -->
      <form 
        class="space-y-8"
        @submit.prevent="saveSettings"
      >
        <!-- Секция основных настроек -->
        <div 
          class="bg-gray-50 p-6 rounded-lg shadow-sm"
        >
          <h2 class="text-lg font-semibold text-gray-800 mb-4">
            {{ translate('options.general') }}
          </h2>

          <!-- Язык интерфейса -->
          <div 
            class="mb-4"
          >
            <label 
              for="language" 
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              {{ translate('options.language') }}
            </label>
            <select
              id="language"
              v-model="settings.language"
              class="w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm"
            >
              <option 
                v-for="lang in availableLanguages" 
                :key="lang.code" 
                :value="lang.code"
              >
                {{ lang.name }}
              </option>
            </select>
          </div>

          <!-- Интервал проверки по умолчанию -->
          <div 
            class="mb-4"
          >
            <label 
              for="defaultInterval" 
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              {{ translate('options.defaultInterval') }}
            </label>
            <select
              id="defaultInterval"
              v-model="settings.defaultInterval"
              class="w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm"
            >
              <option value="15m">
                {{ translate('popup.taskCard.intervals.15m') }}
              </option>
              <option value="1h">
                {{ translate('popup.taskCard.intervals.1h') }}
              </option>
              <option value="3h">
                {{ translate('popup.taskCard.intervals.3h') }}
              </option>
              <option value="1d">
                {{ translate('popup.taskCard.intervals.1d') }}
              </option>
            </select>
          </div>

          <!-- Максимальное количество задач -->
          <div 
            class="mb-4"
          >
            <label 
              for="maxTasks" 
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              {{ translate('options.maxTasks') }}
            </label>
            <div class="relative mt-1 rounded-md shadow-sm">
              <input
                id="maxTasks"
                v-model="settings.maxTasks"
                type="number"
                min="1"
                max="20"
                class="w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm"
              >
            </div>
            <p class="mt-1 text-xs text-gray-500">
              Значение от 1 до 20 задач
            </p>
          </div>
        </div>

        <!-- Секция уведомлений -->
        <div 
          class="bg-gray-50 p-6 rounded-lg shadow-sm"
        >
          <h2 class="text-lg font-semibold text-gray-800 mb-4">
            {{ translate('options.notifications') }}
          </h2>

          <!-- Переключатель уведомлений -->
          <div 
            class="flex items-center justify-between mb-4"
          >
            <div>
              <label 
                for="notifications" 
                class="text-sm font-medium text-gray-700"
              >
                {{ translate('options.enableNotifications') }}
              </label>
              <p class="text-xs text-gray-500">
                Показывать всплывающие уведомления при обнаружении изменений
              </p>
            </div>
            <div>
              <button
                type="button"
                :class="[
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  settings.notifications ? 'bg-blue-600' : 'bg-gray-300',
                ]"
                @click="settings.notifications = !settings.notifications"
              >
                <span
                  :class="[
                    'inline-block h-4 w-4 rounded-full bg-white transition-transform',
                    settings.notifications ? 'translate-x-6' : 'translate-x-1',
                  ]"
                />
              </button>
            </div>
          </div>

          <!-- Переключатель счетчика на иконке -->
          <div 
            class="flex items-center justify-between mb-4"
          >
            <div>
              <label 
                for="badgeCounter" 
                class="text-sm font-medium text-gray-700"
              >
                Счетчик на иконке
              </label>
              <p class="text-xs text-gray-500">
                Показывать количество найденных изменений на иконке расширения
              </p>
            </div>
            <div>
              <button
                type="button"
                :class="[
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  settings.badgeCounter ? 'bg-blue-600' : 'bg-gray-300',
                ]"
                @click="settings.badgeCounter = !settings.badgeCounter"
              >
                <span
                  :class="[
                    'inline-block h-4 w-4 rounded-full bg-white transition-transform',
                    settings.badgeCounter ? 'translate-x-6' : 'translate-x-1',
                  ]"
                />
              </button>
            </div>
          </div>

          <!-- Переключатель авто-возобновления -->
          <div 
            class="flex items-center justify-between"
          >
            <div>
              <label 
                for="autoResume" 
                class="text-sm font-medium text-gray-700"
              >
                Автоматическое возобновление
              </label>
              <p class="text-xs text-gray-500">
                Автоматически возобновлять отслеживание при запуске браузера
              </p>
            </div>
            <div>
              <button
                type="button"
                :class="[
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  settings.autoResume ? 'bg-blue-600' : 'bg-gray-300',
                ]"
                @click="settings.autoResume = !settings.autoResume"
              >
                <span
                  :class="[
                    'inline-block h-4 w-4 rounded-full bg-white transition-transform',
                    settings.autoResume ? 'translate-x-6' : 'translate-x-1',
                  ]"
                />
              </button>
            </div>
          </div>
        </div>

        <!-- Секция данных -->
        <div 
          class="bg-gray-50 p-6 rounded-lg shadow-sm"
        >
          <h2 class="text-lg font-semibold text-gray-800 mb-4">
            {{ translate('options.data') }}
          </h2>

          <div class="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-3">
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
              @click="resetSettings"
            >
              {{ translate('options.resetSettings') }}
            </button>
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
              @click="exportData"
            >
              {{ translate('options.exportData') }}
            </button>
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
              @click="showImportDialog = true"
            >
              {{ translate('options.importData') }}
            </button>
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md shadow-sm hover:bg-red-700"
              @click="clearAllData"
            >
              {{ translate('options.resetData') }}
            </button>
          </div>
        </div>

        <!-- Кнопки действий -->
        <div class="flex justify-end space-x-3">
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
            @click="resetForm"
          >
            {{ translate('options.cancel') }}
          </button>
          <button
            type="submit"
            class="px-4 py-2 text-sm font-medium text-white bg-[#2d6cdf] rounded-md shadow-sm hover:bg-blue-700"
          >
            {{ translate('options.saveSettings') }}
          </button>
        </div>
      </form>
    </main>

    <!-- Модальное окно для импорта данных -->
    <div
      v-if="showImportDialog"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
    >
      <div 
        class="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
      >
        <h3 class="text-lg font-semibold text-gray-900 mb-4">
          Импорт данных
        </h3>
        <p class="text-sm text-gray-600 mb-4">
          Загрузите файл экспорта данных Web Check. Это заменит все ваши текущие настройки и задачи.
        </p>
        <div class="mb-4">
          <input
            type="file"
            class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            @change="handleFileUpload"
          >
        </div>
        <div class="flex justify-end space-x-3">
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
            @click="showImportDialog = false"
          >
            Отмена
          </button>
          <button
            type="button"
            :disabled="!importFile"
            :class="[
              'px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm',
              importFile ? 'bg-[#2d6cdf] hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed',
            ]"
            @click="importData"
          >
            Импортировать
          </button>
        </div>
      </div>
    </div>

    <!-- Сообщение об успешном сохранении -->
    <div
      v-if="showSuccessMessage"
      class="fixed bottom-4 right-4 bg-green-50 border-l-4 border-green-500 p-4 rounded shadow-md"
    >
      <div class="flex">
        <div class="flex-shrink-0">
          <svg 
            class="h-5 w-5 text-green-500" 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              fill-rule="evenodd"
              clip-rule="evenodd"
            />
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm text-green-700">
            {{ successMessage }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, reactive, onMounted } from 'vue'
import { AVAILABLE_LANGUAGES, DEFAULT_SETTINGS } from '~/utils/constants'
import browser from 'webextension-polyfill'
import packageJson from '../../../../package.json'
import { translate } from '~/utils/i18n-helper'

export default defineComponent({
  name: 'OptionsPage',

  setup() {
    // Версия расширения
    const version = ref(packageJson.version)

    // Настройки
    const settings = reactive({ ...DEFAULT_SETTINGS })
    const originalSettings = ref(null)

    // Доступные языки
    const availableLanguages = ref(AVAILABLE_LANGUAGES)

    // Состояние UI
    const showSuccessMessage = ref(false)
    const successMessage = ref('')
    const showImportDialog = ref(false)
    const importFile = ref(null)

    // Загрузка настроек при монтировании
    onMounted(async () => {
      await loadSettings()
    })

    // Загрузка настроек из storage
    async function loadSettings() {
      try {
        const result = await browser.storage.local.get('settings')
        if (result.settings) {
          // Объединяем значения по умолчанию с сохраненными настройками
          Object.assign(settings, { ...DEFAULT_SETTINGS, ...result.settings })
        }
        // Сохраняем копию оригинальных настроек для кнопки отмены
        originalSettings.value = { ...settings }
      } catch (error) {
        console.error('Ошибка при загрузке настроек:', error)
        showMessage('Ошибка при загрузке настроек. Используются значения по умолчанию.')
      }
    }

    // Сохранение настроек
    async function saveSettings() {
      try {
        await browser.storage.local.set({ settings })
        originalSettings.value = { ...settings }
        showMessage('Настройки успешно сохранены')
      } catch (error) {
        console.error('Ошибка при сохранении настроек:', error)
        showMessage('Ошибка при сохранении настроек')
      }
    }

    // Сброс формы
    function resetForm() {
      // Восстанавливаем значения из оригинальных настроек
      if (originalSettings.value) {
        Object.assign(settings, originalSettings.value)
      }
    }

    // Сброс настроек на значения по умолчанию
    function resetSettings() {
      if (confirm('Вы уверены, что хотите сбросить все настройки до значений по умолчанию?')) {
        Object.assign(settings, DEFAULT_SETTINGS)
        saveSettings()
      }
    }

    // Удаление всех данных
    function clearAllData() {
      if (
        confirm(
          'ВНИМАНИЕ: Это действие нельзя отменить. Вы уверены, что хотите удалить ВСЕ данные?'
        )
      ) {
        try {
          browser.storage.local.clear()
          Object.assign(settings, DEFAULT_SETTINGS)
          showMessage('Все данные успешно удалены')
        } catch (error) {
          console.error('Ошибка при удалении данных:', error)
          showMessage('Ошибка при удалении данных')
        }
      }
    }

    // Обработка загрузки файла для импорта
    function handleFileUpload(event) {
      const file = event.target.files[0]
      if (file) {
        importFile.value = file
      }
    }

    // Импорт данных из файла
    function importData() {
      if (!importFile.value) return

      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result)

          // Проверка структуры данных
          if (!data || (!data.settings && !data.tasks)) {
            throw new Error('Недопустимый формат файла')
          }

          // Импорт настроек
          if (data.settings) {
            await browser.storage.local.set({ settings: data.settings })
            Object.assign(settings, data.settings)
          }

          // Импорт задач
          if (data.tasks) {
            await browser.storage.local.set({ tasks: data.tasks })
          }

          showImportDialog.value = false
          showMessage('Данные успешно импортированы')
        } catch (error) {
          console.error('Ошибка при импорте данных:', error)
          showMessage('Ошибка при импорте данных. Проверьте формат файла.')
        }
      }
      reader.readAsText(importFile.value)
    }

    // Экспорт данных
    async function exportData() {
      try {
        // Получаем все данные из storage
        const data = await browser.storage.local.get(null)

        // Создаем и скачиваем файл
        const json = JSON.stringify(data, null, 2)
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)

        const a = document.createElement('a')
        a.href = url
        a.download = `web-check-export-${new Date().toISOString().slice(0, 10)}.json`
        document.body.appendChild(a)
        a.click()

        setTimeout(() => {
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }, 100)

        showMessage('Данные успешно экспортированы')
      } catch (error) {
        console.error('Ошибка при экспорте данных:', error)
        showMessage('Ошибка при экспорте данных')
      }
    }

    // Отображение сообщения
    function showMessage(message) {
      successMessage.value = message
      showSuccessMessage.value = true

      // Скрываем сообщение через 3 секунды
      setTimeout(() => {
        showSuccessMessage.value = false
      }, 3000)
    }

    return {
      version,
      settings,
      availableLanguages,
      showSuccessMessage,
      successMessage,
      showImportDialog,
      importFile,
      loadSettings,
      saveSettings,
      resetForm,
      resetSettings,
      clearAllData,
      handleFileUpload,
      importData,
      exportData,
      showMessage,
      translate,
    }
  },
})
</script>
