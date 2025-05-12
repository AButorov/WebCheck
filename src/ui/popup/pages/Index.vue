<style>
.index-page {
  padding: 16px;
  width: 100%;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 16px;
}

.header h1 {
  font-size: 1.25rem;
  font-weight: bold;
}

.add-button {
  background-color: #3b82f6;
  color: white;
  border-radius: 9999px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.add-button:hover {
  background-color: #2563eb;
}

.loading {
  text-align: center;
  padding: 32px 0;
}

.spinner {
  display: inline-block;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border-top: 2px solid #3b82f6;
  border-bottom: 2px solid #3b82f6;
  border-left: 2px solid transparent;
  border-right: 2px solid transparent;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading p {
  margin-top: 8px;
  color: #6b7280;
}

.error {
  text-align: center;
  padding: 32px 0;
}

.error-box {
  background-color: #fef2f2;
  border: 1px solid #fee2e2;
  color: #b91c1c;
  border-radius: 0.5rem;
  padding: 16px;
}

.retry-button {
  margin-top: 8px;
  color: #3b82f6;
}

.retry-button:hover {
  text-decoration: underline;
}

.empty-list {
  text-align: center;
  padding: 32px 0;
  color: #6b7280;
}

.footer {
  padding: 16px;
  border-top: 1px solid #e5e7eb;
  margin-top: 16px;
}

.footer p {
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
}
</style><template>
  <div class="index-page">
    <!-- Шапка приложения -->
    <header class="header">
      <h1>{{ t('popup.header.title') }}</h1>
      <button 
        class="add-button"
        :title="t('popup.header.addTask')"
        @click="handleAddTask"
      >
        +
      </button>
    </header>
    
    <!-- Индикатор загрузки -->
    <div v-if="tasksStore.loading" class="loading">
      <div class="spinner"></div>
      <p>{{ t('popup.taskList.loading') }}</p>
    </div>
    
    <!-- Сообщение об ошибке -->
    <div v-else-if="tasksStore.error" class="error">
      <div class="error-box">
        <p>{{ tasksStore.error }}</p>
        <button 
          class="retry-button"
          @click="tasksStore.loadTasks()"
        >
          {{ t('popup.taskList.retry') }}
        </button>
      </div>
    </div>
    
    <!-- Пустой список задач -->
    <div v-else-if="tasksStore.tasks.length === 0" class="empty-list">
      {{ t('popup.taskList.noTasks') }}
    </div>
    
    <div v-else class="task-list">
      <!-- Список задач -->
      <TaskCard 
        v-for="task in tasksStore.tasks" 
        :key="task.id" 
        :task="task"
        @update:interval="updateTaskInterval"
        @update:status="updateTaskStatus"
        @view="viewTaskChanges"
        @remove="removeTask"
      />
    </div>
    
    <!-- Футер с информацией о количестве задач -->
    <footer class="footer">
      <p>
        {{ t('popup.taskList.activeCount', { count: tasksStore.activeTaskCount, total: tasksStore.maxTasks }) }}
      </p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useTasksStore } from '~/stores/tasks'
import { sendMessage } from 'webext-bridge/popup'
import { TaskInterval, TaskStatus } from '~/types/task'
import { MessagePayloads } from '~/types/messages'
import TaskCard from '~/components/TaskCard.vue'
import browser from 'webextension-polyfill'

const { t } = useI18n()
const router = useRouter()
const tasksStore = useTasksStore()

onMounted(async () => {
  await tasksStore.loadTasks()
})

async function handleAddTask() {
  // В реальном приложении здесь будет логика для активации селектора элементов
  // и сохранения выбранного элемента.
  // Для MVP мы просто перейдем на страницу создания задачи
  
  // Проверяем лимит задач
  if (tasksStore.taskCount >= tasksStore.maxTasks) {
    alert('Достигнут лимит задач. Пожалуйста, удалите какую-либо задачу перед добавлением новой.')
    return
  }
  
  try {
    // Отправить сообщение в контент-скрипт для активации селектора элементов
    await sendMessage('activate-selector', null, { context: 'content-script', tabId: await getActiveTabId() })
    // Дальнейшая логика будет обрабатываться через события от контент-скрипта
  } catch (error) {
    console.error('Ошибка при активации селектора:', error)
  }
}

async function updateTaskInterval(taskId: string, interval: TaskInterval) {
  await tasksStore.updateTaskInterval(taskId, interval)
}

async function updateTaskStatus(taskId: string, status: TaskStatus) {
  await tasksStore.updateTaskStatus(taskId, status)
}

async function viewTaskChanges(taskId: string) {
  // Переход на страницу просмотра изменений
  router.push(`/view-changes/${taskId}`)
}

async function removeTask(taskId: string) {
  if (confirm('Вы уверены, что хотите удалить эту задачу?')) {
    await tasksStore.removeTask(taskId)
  }
}

// Получить ID активной вкладки
async function getActiveTabId(): Promise<number> {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true })
    if (tabs && tabs.length > 0 && tabs[0].id) {
      return tabs[0].id
    }
    throw new Error('Не удалось получить ID активной вкладки')
  } catch (error) {
    console.error('Ошибка при получении ID активной вкладки:', error)
    return -1 // Фиктивный ID для случая ошибки
  }
}
</script>
