<template>
  <div class="task-editor p-4 bg-white rounded-lg shadow">
    <!-- Убираем заголовок для избежания дублирования -->
    <h2 
      v-if="isEdit" 
      class="text-xl font-bold mb-4"
    >
      Редактирование задачи
    </h2>
    
    <!-- Форма редактирования -->
    <form @submit.prevent="saveTask">
      <!-- Название задачи (перемещено вверх) -->
      <div class="mb-3">
        <label class="block text-sm font-medium text-gray-700 mb-1">Название задачи</label>
        <input 
          ref="titleInput"
          v-model="editedTask.title" 
          type="text" 
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#3e66fb] focus:border-[#3e66fb]"
          required
        >
      </div>
      
      <!-- Миниатюра элемента (перемещена ниже) -->
      <div class="mb-3">
        <p class="text-sm text-gray-600 mb-1">
          Выбранный элемент:
        </p>
        <div class="thumbnail-container border rounded-lg overflow-hidden bg-gray-50">
          <iframe 
            v-if="task.thumbnailUrl" 
            :src="task.thumbnailUrl" 
            frameborder="0" 
            class="w-full h-24 object-contain"
          />
          <div 
            v-else 
            class="bg-gray-100 w-full h-24 flex items-center justify-center text-gray-400"
          >
            Изображение недоступно
          </div>
        </div>
      </div>
      
      <!-- Источник (сайт) -->
      <div class="mb-3">
        <label class="block text-sm font-medium text-gray-700 mb-1">Источник</label>
        <div class="flex items-center border border-gray-300 rounded-md px-3 py-2">
          <img 
            :src="task.faviconUrl || '/icons/icon-16.png'" 
            alt="Site icon" 
            class="w-5 h-5 mr-2"
            @error="onFaviconError"
          >
          <span class="text-gray-800 truncate">{{ displayUrl }}</span>
        </div>
      </div>
      
      <!-- Частота проверок -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">Частота проверок</label>
        <select 
          v-model="editedTask.interval" 
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#3e66fb] focus:border-[#3e66fb]"
        >
          <option value="10s">
            Каждые 10 секунд (отладка)
          </option>
          <option value="15m">
            Каждые 15 минут
          </option>
          <option value="1h">
            Каждый час
          </option>
          <option value="3h">
            Каждые 3 часа
          </option>
          <option value="1d">
            Раз в день
          </option>
        </select>
      </div>
      
      <!-- Информация о селекторе (скрытая, для отладки) -->
      <div 
        v-if="debug" 
        class="mb-3 p-3 bg-gray-100 rounded text-sm"
      >
        <p class="font-medium">
          Селектор для отслеживания:
        </p>
        <code class="block mt-1 text-xs bg-gray-200 p-2 rounded">{{ task.selector }}</code>
      </div>
      
      <!-- Кнопки действий -->
      <div class="flex justify-end space-x-3">
        <button 
          type="button" 
          class="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition"
          @click="cancelEdit"
        >
          Отмена
        </button>
        <button 
          type="submit" 
          class="px-4 py-2 text-white bg-[#3e66fb] rounded-md hover:bg-blue-700 transition"
        >
          Сохранить
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { defineComponent, ref, computed, onMounted } from 'vue'
import { CHECK_INTERVALS } from '~/utils/constants'

export default defineComponent({
  name: 'TaskEditor',
  
  props: {
    task: {
      type: Object,
      required: true
    },
    isEdit: {
      type: Boolean,
      default: false
    },
    debug: {
      type: Boolean,
      default: false
    }
  },
  
  emits: ['save', 'cancel'],
  
  setup(props, { emit }) {
    // Создаем копию задачи для редактирования
    const editedTask = ref({...props.task});
    
    // Создаем ref для доступа к полю ввода названия
    const titleInput = ref(null);
    
    // Вычисляемое свойство для отображения URL
    const displayUrl = computed(() => {
      try {
        const url = new URL(props.task.url);
        return url.hostname;
      } catch {
        return props.task.url;
      }
    });
    
    // Обработчик ошибки загрузки favicon
    function onFaviconError(event) {
      event.target.src = '/icons/icon-16.png';
    }
    
    // Сохранение задачи
    function saveTask() {
      emit('save', editedTask.value);
    }
    
    // Отмена редактирования
    function cancelEdit() {
      emit('cancel');
    }
    
    // При монтировании компонента
    onMounted(() => {
      console.log('[TaskEditor] Task loaded:', props.task);
      
      // Устанавливаем фокус на поле ввода названия и выделяем текст
      // Небольшая задержка для уверенности, что DOM полностью загружен
      setTimeout(() => {
        if (titleInput.value) {
          titleInput.value.focus();
          titleInput.value.select(); // Выделяем весь текст
        }
      }, 100);
    });
    
    return {
      editedTask,
      titleInput,
      displayUrl,
      onFaviconError,
      saveTask,
      cancelEdit,
      CHECK_INTERVALS
    };
  }
});
</script>
