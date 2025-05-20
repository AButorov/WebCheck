<template>
  <div class="min-h-[500px] w-[380px] h-[420px] p-3 overflow-y-auto">
    <header class="flex justify-between items-center mb-6 pb-2 border-b sticky top-0 bg-white z-10">
      <div class="flex items-center">
        <h1 class="text-2xl font-bold">Новая задача</h1>
      </div>
      <button 
        class="text-gray-600 hover:text-gray-900 p-2.5 rounded-full hover:bg-gray-100 transition-colors"
        title="Закрыть"
        @click="goBack"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </header>
    
    <div v-if="loading" class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#2d6cdf]"></div>
      <span class="ml-3 text-gray-600">Загрузка...</span>
    </div>
    
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-xl p-4 mt-4 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-red-500 mb-2" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>
      <p class="text-red-800 mb-2">{{ error }}</p>
      <button 
        class="text-[#2d6cdf] hover:underline mt-2"
        @click="goBack"
      >
        Вернуться назад
      </button>
    </div>
    
    <div v-else-if="elementSelection" class="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-blue-500 mb-2" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 001.415-1.415L11 9.586V6z" clip-rule="evenodd" />
      </svg>
      <p class="text-blue-800 mb-2">Выберите элемент на странице для отслеживания.</p>
      <p class="text-blue-600 text-sm mb-4">Наведите курсор на интересующий вас элемент и кликните на него.</p>
      <button 
        class="text-[#2d6cdf] hover:underline mt-2"
        @click="cancelSelection"
      >
        Отменить
      </button>
    </div>
    
    <TaskEditor 
      v-else 
      :task="task" 
      :isEdit="false"
      :debug="debug"
      @save="saveTask"
      @cancel="goBack"
    />
  </div>
</template>

<script>
import { defineComponent, ref, onMounted, onUnmounted } from 'vue'
import TaskEditor from '~/components/TaskEditor.vue'
import browser from 'webextension-polyfill'

export default defineComponent({
  name: 'NewTaskPage',
  
  components: {
    TaskEditor
  },
  
  setup() {
    const router = window.vueRouter
    const task = ref({})
    const loading = ref(true)
    const error = ref(null)
    const elementSelection = ref(true) // По умолчанию показываем уведомление о выборе элемента
    const debug = ref(false)
    const activeTabId = ref(null)
    let messageListener = null
    
    // Проверяем наличие флага отладки
    if (import.meta.env.MODE === 'development') {
      debug.value = true;
    }
    
    // Получение данных о выбранном элементе
    async function loadTaskData() {
      loading.value = true;
      error.value = null;
      
      try {
        // Получаем данные из local storage, куда background script сохранил данные о задаче
        const result = await browser.storage.local.get('newTaskData');
        
        if (result.newTaskData) {
          task.value = result.newTaskData;
          elementSelection.value = false; // Элемент уже выбран
          
          // Удаляем данные из storage, так как они больше не нужны
          await browser.storage.local.remove('newTaskData');
          
          console.log('[TaskEditor] Task data loaded:', task.value);
        } else {
          // Данные о задаче ещё не получены, сохраняем флаг выбора элемента
          elementSelection.value = true;
          console.log('[NewTask] Waiting for element selection');
          
          // Если данных нет, активируем выбор элемента
          activateElementSelection();
        }
      } catch (err) {
        console.error('[NewTask] Error loading task data:', err);
        error.value = 'Не удалось загрузить данные о задаче: ' + (err.message || 'Неизвестная ошибка');
        elementSelection.value = false;
      } finally {
        loading.value = false;
      }
    }
    
// Активация выбора элемента на странице
async function activateElementSelection() {
try {
// Получаем активную вкладку
const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

if (!tab) {
throw new Error('Не удалось получить активную вкладку');
}

activeTabId.value = tab.id;
console.log('[NewTask] Activating element selection on tab:', tab.id);

// Сначала отправляем сообщение в background script для активации выбора элемента
const response = await browser.runtime.sendMessage({
action: 'activateElementSelection',
tabId: tab.id
});

console.log('[NewTask] Element selection activation response:', response);

// Показываем уведомление о выборе элемента
elementSelection.value = true;

// Активируем вкладку и окно после отправки сообщения
await browser.tabs.update(tab.id, { active: true });
await browser.windows.update(tab.windowId, { focused: true });

// Небольшая задержка для гарантированной активации вкладки
await new Promise(resolve => setTimeout(resolve, 100));

// Только после успешной активации закрываем popup
window.close();

console.log('[NewTask] Element selection activation complete');
} catch (err) {
console.error('[NewTask] Error activating element selection:', err);
error.value = 'Не удалось активировать выбор элемента: ' + (err.message || 'Неизвестная ошибка');
elementSelection.value = false;
}
}
    
    // Отмена выбора элемента
    async function cancelSelection() {
      try {
        if (activeTabId.value) {
          console.log('[NewTask] Cancelling element selection on tab:', activeTabId.value);
          
          // Отправляем сообщение в background script для отмены выбора элемента
          await browser.runtime.sendMessage({
            action: 'cancelElementSelection',
            tabId: activeTabId.value
          });
        }
      } catch (err) {
        console.error('[NewTask] Error cancelling element selection:', err);
      }
      
      // Возвращаемся на главную страницу
      goBack();
    }
    
    // Сохранение задачи
    async function saveTask(editedTask) {
      try {
        loading.value = true;
        
        const result = await browser.storage.local.get('tasks');
        let tasks = [];
        
        if (result.tasks) {
          // Проверим, является ли tasks массивом
          if (Array.isArray(result.tasks)) {
            tasks = [...result.tasks];
          } else if (typeof result.tasks === 'object') {
            // Если это объект, преобразуем его в массив
            console.log('[NewTask] Converting tasks object to array:', result.tasks);
            tasks = Object.values(result.tasks);
          }
        }
        
        // Добавляем новую задачу
        tasks.push(editedTask);
        
        // Убедимся, что сохраняем действительно массив
        if (!Array.isArray(tasks)) {
          console.error('[NewTask] Tasks is still not an array after conversion!', tasks);
          tasks = [editedTask]; // На крайний случай просто создаем массив с одной новой задачей
        }
        
        console.log('[NewTask] Saving tasks array:', tasks);
        await browser.storage.local.set({ tasks: tasks }); // Явно указываем tasks
        
        console.log('[NewTask] Task saved successfully:', editedTask);
        
        // Возвращаемся на главную страницу
        goBack();
        
      } catch (err) {
        console.error('[NewTask] Error saving task:', err);
        error.value = 'Не удалось сохранить задачу: ' + (err.message || 'Неизвестная ошибка');
      } finally {
        loading.value = false;
      }
    }
    
    // Возврат на главную страницу
    function goBack() {
      if (router) {
        router.push('/');
      } else {
        console.warn('[NewTask] Router not available');
        window.close(); // Закрываем popup, если роутер недоступен
      }
    }
    
    // Обработчик сообщений от background script
    function setupMessageListener() {
      messageListener = (message, sender, sendResponse) => {
        console.log('[NewTask] Received message:', message);
        
        // Обработка ping-сообщения
        if (message.action === 'ping') {
          sendResponse({ status: 'pong' });
          return true;
        }
        
        if (message.action === 'elementCaptured') {
          // Элемент успешно выбран и данные получены
          console.log('[NewTask] Element captured, task data received:', message.task);
          task.value = message.task;
          elementSelection.value = false;
          loading.value = false;
          
          // Сразу показываем форму редактирования
          console.log('[NewTask] Showing task editor form immediately');
        } else if (message.action === 'captureError') {
          // Ошибка при захвате элемента
          error.value = 'Ошибка при захвате элемента: ' + message.error;
          elementSelection.value = false;
          loading.value = false;
        } else if (message.action === 'elementSelectionCancelled') {
          // Отмена выбора элемента
          goBack();
        } else if (message.action === 'elementSelectionError') {
          // Ошибка при активации выбора элемента
          error.value = 'Ошибка при активации выбора элемента: ' + message.error;
          elementSelection.value = false;
          loading.value = false;
        }
      };
      
      browser.runtime.onMessage.addListener(messageListener);
      return messageListener;
    }
    
    // Загрузка данных при монтировании компонента
    onMounted(() => {
      // Настраиваем обработчик сообщений
      setupMessageListener();
      
      // Загружаем данные о задаче, если они есть
      loadTaskData();
      
      // Не активируем выбор элемента автоматически
      // Это будет сделано внутри loadTaskData, если данные не найдены
    });
    
    // Очистка при размонтировании компонента
    onUnmounted(() => {
      if (messageListener) {
        browser.runtime.onMessage.removeListener(messageListener);
      }
      
      if (activeTabId.value && elementSelection.value) {
        // Пытаемся отменить выбор элемента при закрытии страницы
        try {
          browser.runtime.sendMessage({
            action: 'cancelElementSelection',
            tabId: activeTabId.value
          }).catch(() => {});
        } catch (e) {
          // Игнорируем ошибки при отмене
        }
      }
    });
    
    return {
      task,
      loading,
      error,
      elementSelection,
      debug,
      saveTask,
      goBack,
      cancelSelection
    };
  }
});
</script>
