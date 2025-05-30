<template>
  <div class="min-h-[500px] w-[380px] h-[420px] p-3 overflow-y-auto">
    <header class="flex justify-between items-center mb-6 pb-2 border-b sticky top-0 bg-white z-10">
      <div class="flex items-center">
        <h1 class="text-2xl font-bold">
          Новая задача
        </h1>
      </div>
      <button 
        title="Закрыть"
        class="text-gray-600 hover:text-gray-900 p-2.5 rounded-full hover:bg-gray-100 transition-colors"
        @click="goBack"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          class="h-7 w-7" 
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path 
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            fill-rule="evenodd" 
            clip-rule="evenodd"
          />
        </svg>
      </button>
    </header>
    
    <div 
      v-if="loading" 
      class="flex flex-col justify-center items-center h-64"
    >
      <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#2d6cdf]" />
      <span class="ml-3 text-gray-600 mt-2">{{ loadingMessage }}</span>
    </div>
    
    <div 
      v-else-if="error" 
      class="bg-red-50 border border-red-200 rounded-xl p-4 mt-4 text-center"
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        class="h-12 w-12 mx-auto text-red-500 mb-2" 
        viewBox="0 0 20 20" 
        fill="currentColor"
      >
        <path 
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          fill-rule="evenodd" 
          clip-rule="evenodd"
        />
      </svg>
      <p class="text-red-800 mb-2">
        {{ error }}
      </p>
      <button 
        class="text-[#2d6cdf] hover:underline mt-2"
        @click="goBack"
      >
        Вернуться назад
      </button>
    </div>
    
    <div 
      v-else-if="elementSelection" 
      class="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4 text-center"
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        class="h-12 w-12 mx-auto text-blue-500 mb-2" 
        viewBox="0 0 20 20" 
        fill="currentColor"
      >
        <path 
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 001.415-1.415L11 9.586V6z"
          fill-rule="evenodd" 
          clip-rule="evenodd"
        />
      </svg>
      <p class="text-blue-800 mb-2">
        Выберите элемент на странице для отслеживания.
      </p>
      <p class="text-blue-600 text-sm mb-4">
        Popup остается открытым. Переключитесь на веб-страницу и кликните на элемент.
      </p>
      <div class="flex gap-2 justify-center">
        <button 
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          @click="switchToManualTab"
        >
          Переключиться на веб-страницу
        </button>
        <button 
          class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          @click="cancelSelection"
        >
          Отменить
        </button>
      </div>
    </div>
    
    <TaskEditor 
      v-else 
      :task="task" 
      :is-edit="false"
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
    const loadingMessage = ref('Инициализация...')
    const error = ref(null)
    const elementSelection = ref(false)
    const debug = ref(false)
    const activeTabId = ref(null)
    let messageListener = null
    let storageCheckInterval = null
    let pollingAttempts = 0
    
    // Проверяем наличие флага отладки
    if (import.meta.env.MODE === 'development') {
      debug.value = true;
    }
    
    console.log('[NewTask] 🎯 NewTask component initializing...');
    
    // Получение данных о выбранном элементе
    async function loadTaskData() {
      console.log('[NewTask] 📂 loadTaskData called');
      loading.value = true;
      loadingMessage.value = 'Проверка данных задачи...';
      error.value = null;
      
      try {
        // Сначала проверяем, есть ли уже готовые данные
        const result = await browser.storage.local.get('newTaskData');
        console.log('[NewTask] 📋 Initial storage check result:', result);
        
        if (result.newTaskData) {
          console.log('[NewTask] ✅ Found existing task data:', result.newTaskData);
          task.value = result.newTaskData;
          elementSelection.value = false;
          loading.value = false;
          
          // Удаляем данные из storage
          await browser.storage.local.remove('newTaskData');
          console.log('[NewTask] 🗑️ Removed newTaskData from storage');
          
          return; // Выходим, так как данные уже есть
        }
        
        // Данных нет, активируем выбор элемента
        console.log('[NewTask] 🎯 No existing data, activating element selection');
        await activateElementSelection();
        
        // Запускаем агрессивную проверку storage
        startAggressivePolling();
        
      } catch (err) {
        console.error('[NewTask] ❌ Error in loadTaskData:', err);
        error.value = 'Не удалось загрузить данные о задаче: ' + (err.message || 'Неизвестная ошибка');
        elementSelection.value = false;
        loading.value = false;
      }
    }
    
    // Активация выбора элемента на странице (БЕЗ переключения вкладки)
    async function activateElementSelection() {
      console.log('[NewTask] 🎯 activateElementSelection called');
      try {
        // Получаем активную вкладку
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        console.log('[NewTask] 📋 Active tabs found:', tabs.length);

        if (!tabs.length) {
          throw new Error('Не удалось получить активную вкладку');
        }

        const tab = tabs[0];
        activeTabId.value = tab.id;
        console.log('[NewTask] 🔗 Active tab ID:', tab.id, 'URL:', tab.url);

        // Отправляем сообщение в background script для активации выбора элемента
        loadingMessage.value = 'Активация выбора элемента...';
        const response = await browser.runtime.sendMessage({
          action: 'activateElementSelection',
          tabId: tab.id
        });

        console.log('[NewTask] 📤 Element selection activation response:', response);

        // Показываем уведомление о выборе элемента
        elementSelection.value = true;
        loading.value = false;

        console.log('[NewTask] ✅ Element selection activated, popup stays open');
      } catch (err) {
        console.error('[NewTask] ❌ Error activating element selection:', err);
        error.value = 'Не удалось активировать выбор элемента: ' + (err.message || 'Неизвестная ошибка');
        elementSelection.value = false;
        loading.value = false;
      }
    }
    
    // Переключение на активную вкладку (вручную по кнопке)
    async function switchToManualTab() {
      console.log('[NewTask] 🔄 Switching to manual tab:', activeTabId.value);
      try {
        if (activeTabId.value) {
          await browser.tabs.update(activeTabId.value, { active: true });
          const tab = await browser.tabs.get(activeTabId.value);
          if (tab.windowId) {
            await browser.windows.update(tab.windowId, { focused: true });
          }
          console.log('[NewTask] ✅ Switched to tab successfully');
        }
      } catch (err) {
        console.error('[NewTask] ❌ Error switching to tab:', err);
      }
    }
    
    // Отмена выбора элемента
    async function cancelSelection() {
      console.log('[NewTask] ❌ Cancelling element selection');
      try {
        if (activeTabId.value) {
          await browser.runtime.sendMessage({
            action: 'cancelElementSelection',
            tabId: activeTabId.value
          });
        }
      } catch (err) {
        console.error('[NewTask] ❌ Error cancelling element selection:', err);
      }
      
      stopPolling();
      goBack();
    }
    
    // Сохранение задачи
    async function saveTask(editedTask) {
      console.log('[NewTask] 💾 Saving task:', editedTask);
      try {
        loading.value = true;
        loadingMessage.value = 'Сохранение задачи...';
        
        const result = await browser.storage.local.get('tasks');
        let tasks = [];
        
        if (result.tasks) {
          if (Array.isArray(result.tasks)) {
            tasks = [...result.tasks];
          } else if (typeof result.tasks === 'object') {
            console.log('[NewTask] Converting tasks object to array:', result.tasks);
            tasks = Object.values(result.tasks);
          }
        }
        
        tasks.push(editedTask);
        await browser.storage.local.set({ tasks: tasks });
        
        console.log('[NewTask] ✅ Task saved successfully:', editedTask.id);
        
        stopPolling();
        goBack();
        
      } catch (err) {
        console.error('[NewTask] ❌ Error saving task:', err);
        error.value = 'Не удалось сохранить задачу: ' + (err.message || 'Неизвестная ошибка');
        loading.value = false;
      }
    }
    
    // Возврат на главную страницу
    function goBack() {
      console.log('[NewTask] 🔙 Going back to main page');
      stopPolling();
      
      if (router) {
        router.push('/');
      } else {
        console.warn('[NewTask] Router not available, closing popup');
        window.close();
      }
    }
    
    // Агрессивная проверка storage (каждые 300ms)
    function startAggressivePolling() {
      console.log('[NewTask] 🔄 Starting AGGRESSIVE polling every 300ms');
      loadingMessage.value = 'Ожидание выбора элемента...';
      pollingAttempts = 0;
      
      storageCheckInterval = setInterval(async () => {
        pollingAttempts++;
        console.log(`[NewTask] 🔍 Polling attempt #${pollingAttempts}`);
        
        try {
          const result = await browser.storage.local.get('newTaskData');
          
          if (result.newTaskData) {
            console.log('[NewTask] 🎉 FOUND newTaskData via aggressive polling:', result.newTaskData);
            
            // Немедленно обновляем UI
            task.value = result.newTaskData;
            elementSelection.value = false;
            loading.value = false;
            
            // Удаляем данные из storage
            await browser.storage.local.remove('newTaskData');
            console.log('[NewTask] 🗑️ newTaskData removed from storage');
            
            // Останавливаем polling
            stopPolling();
            
            console.log('[NewTask] 🎯 Task editor should now be visible!');
            return;
          }
          
          // Обновляем сообщение каждые 10 попыток
          if (pollingAttempts % 10 === 0) {
            loadingMessage.value = `Ожидание выбора элемента... (${pollingAttempts}/100)`;
            console.log(`[NewTask] 💭 Still waiting after ${pollingAttempts} attempts`);
          }
          
          // Останавливаем после 100 попыток (30 секунд)
          if (pollingAttempts >= 100) {
            console.log('[NewTask] ⏰ Stopping polling due to timeout');
            stopPolling();
            error.value = 'Превышено время ожидания выбора элемента. Попробуйте еще раз.';
            loading.value = false;
            elementSelection.value = false;
          }
          
        } catch (err) {
          console.error('[NewTask] ❌ Error in aggressive polling:', err);
        }
      }, 300); // Каждые 300ms для максимально быстрого ответа
    }
    
    function stopPolling() {
      if (storageCheckInterval) {
        clearInterval(storageCheckInterval);
        storageCheckInterval = null;
        console.log('[NewTask] ⏹️ Polling stopped');
      }
    }
    
    // Обработчик сообщений от background script (запасной вариант)
    function setupMessageListener() {
      console.log('[NewTask] 📞 Setting up message listener');
      messageListener = (message, sender, sendResponse) => {
        console.log('[NewTask] 📨 Received message:', message);
        
        if (message.action === 'ping') {
          console.log('[NewTask] 🏓 Ping received');
          sendResponse({ status: 'pong' });
          return true;
        }
        
        if (message.action === 'elementCaptured') {
          console.log('[NewTask] 🎯 Element captured via direct message!');
          task.value = message.task;
          elementSelection.value = false;
          loading.value = false;
          stopPolling();
          sendResponse({ received: true });
        }
        
        // Другие обработчики...
      };
      
      browser.runtime.onMessage.addListener(messageListener);
    }
    
    // Слушатель изменений storage (дополнительный механизм)
    function setupStorageListener() {
      console.log('[NewTask] 📂 Setting up storage listener');
      browser.storage.onChanged.addListener((changes, namespace) => {
        console.log('[NewTask] 📂 Storage changed:', Object.keys(changes), 'namespace:', namespace);
        
        if (namespace === 'local' && changes.newTaskData && changes.newTaskData.newValue) {
          console.log('[NewTask] 🎉 newTaskData detected via storage listener!');
          
          task.value = changes.newTaskData.newValue;
          elementSelection.value = false;
          loading.value = false;
          stopPolling();
          
          // Удаляем данные
          browser.storage.local.remove('newTaskData');
          console.log('[NewTask] 🎯 Task editor activated via storage listener!');
        }
      });
    }
    
    // Загрузка данных при монтировании компонента
    onMounted(() => {
      console.log('[NewTask] 🎬 Component mounted - setting up everything');
      
      // Настраиваем все обработчики
      setupMessageListener();
      setupStorageListener();
      
      // Начинаем основную логику
      loadTaskData();
    });
    
    // Очистка при размонтировании компонента
    onUnmounted(() => {
      console.log('[NewTask] 🎬 Component unmounting - cleaning up');
      
      stopPolling();
      
      if (messageListener) {
        browser.runtime.onMessage.removeListener(messageListener);
      }
      
      if (activeTabId.value && elementSelection.value) {
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
      loadingMessage,
      error,
      elementSelection,
      debug,
      saveTask,
      goBack,
      cancelSelection,
      switchToManualTab
    };
  }
});
</script>
