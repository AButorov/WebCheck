<template>
  <div class="app-container">
    <router-view />
  </div>
</template>

<script>
import { defineComponent, onMounted, onErrorCaptured } from 'vue'
import '~/assets/styles/tailwind.css'
import browser from 'webextension-polyfill'

export default defineComponent({
  name: 'App',
  
  setup() {
    const router = window.vueRouter
    
    // Обработка ошибок
    onErrorCaptured((err, instance, info) => {
      console.error('[APP] Error captured:', err)
      console.error('[APP] Error info:', info)
      
      // Возвращаем false, чтобы остановить распространение ошибки
      return false
    })
    
    onMounted(async () => {
      console.log('[APP] App component mounted')
      
      // Добавляем класс для скроллбара
      document.documentElement.classList.add('custom-scrollbar')
      
      // Проверяем, нужно ли перейти на страницу редактирования задачи
      try {
        // Проверяем наличие флага для открытия формы редактирования
        const result = await browser.storage.local.get(['openNewTaskEditor', 'newTaskData'])
        
        if (result.openNewTaskEditor === true && result.newTaskData) {
          console.log('[APP] Auto-redirecting to new task editor')
          
          // Очищаем флаг перенаправления
          await browser.storage.local.remove('openNewTaskEditor')
          
          // Переходим на страницу редактирования
          if (router) {
            router.push('/new-task')
          }
        }
      } catch (err) {
        console.error('[APP] Error checking for redirect flag:', err)
      }
    })
    
    return {}
  }
})
</script>

<style>
body, html {
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
  width: 400px;
  height: 500px;
}

.app-container {
  width: 400px;
  min-height: 500px;
  max-height: 600px;
  overflow-y: auto;
  background-color: #ffffff;
  position: relative;
  color: #333333;
}

/* Стилизация скроллбара для WebKit браузеров */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

/* Стилизация для других элементов с прокруткой */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 #f1f1f1;
}

/* Общие стили для улучшения UI */
button, select, a {
  transition: all 0.2s ease;
}

/* Улучшение доступности - фокус */
button:focus, a:focus, select:focus {
  outline: 2px solid #2d6cdf;
  outline-offset: 2px;
}

/* Улучшение для карточек */
.task-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.task-card:hover {
  transform: translateY(-2px);
}
</style>
