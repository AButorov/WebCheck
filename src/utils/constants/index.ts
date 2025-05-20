/**
 * Файл с константами для проекта Web Check
 * Содержит цвета, интервалы и другие общие настройки
 */

// Цвета для разных статусов задач
export const COLORS = {
  // Основной цвет интерфейса
  PRIMARY: '#2d6cdf',
  
  // Статусы задач
  CHANGED: {
    TEXT: '#ffb300',  // янтарный
    BACKGROUND: '#fff8e1',
    BORDER: '#ffecb3',
    PROGRESS: '#ffb300'
  },
  UNCHANGED: {
    TEXT: '#4caf50',  // зеленый
    BACKGROUND: '#f1f8e9',
    BORDER: '#dcedc8',
    PROGRESS: '#4caf50'
  },
  PAUSED: {
    TEXT: '#9e9e9e',  // серый
    BACKGROUND: '#f5f5f5',
    BORDER: '#eeeeee',
    PROGRESS: '#9e9e9e'
  },
  
  // Функциональные цвета для кнопок
  BUTTONS: {
    VIEW: '#673ab7',   // фиолетовый
    DELETE: '#f44336', // красный
    ADD: '#3e66fb',    // яркий синий
    EDIT: '#2196f3',   // синий
    PAUSE: '#ff9800',  // оранжевый
    RESUME: '#4caf50'  // зеленый
  }
};

// Интервалы проверки
export const CHECK_INTERVALS = {
  TEN_SECONDS: {
    value: '10s',
    label: '10с',
    milliseconds: 10 * 1000
  },
  FIFTEEN_MINUTES: {
    value: '15m',
    label: '15м',
    milliseconds: 15 * 60 * 1000
  },
  ONE_HOUR: {
    value: '1h',
    label: '1ч',
    milliseconds: 60 * 60 * 1000
  },
  THREE_HOURS: {
    value: '3h',
    label: '3ч',
    milliseconds: 3 * 60 * 60 * 1000
  },
  ONE_DAY: {
    value: '1d',
    label: '1д',
    milliseconds: 24 * 60 * 60 * 1000
  }
};

// Максимальное количество активных задач
export const MAX_TASKS = 5;

// Размеры интерфейса
export const UI_SIZES = {
  POPUP_WIDTH: 400,
  POPUP_HEIGHT: 500,
  TASK_CARD_HEIGHT: 110,
  ICON_SIZE: {
    SMALL: 16,
    MEDIUM: 24,
    LARGE: 32
  }
};

// Время жизни уведомлений (в миллисекундах)
export const NOTIFICATION_TIMEOUT = 5000;

// Задержка между проверками (в миллисекундах)
export const CHECK_DELAY = 500;

// Локализация
export const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ru', name: 'Русский' }
];

// Настройки по умолчанию
export const DEFAULT_SETTINGS = {
  language: 'ru',
  notifications: true,
  badgeCounter: true,
  autoResume: true,
  darkMode: false,
  defaultInterval: '1h',
  maxTasks: 5
};

// Типы уведомлений
export const NOTIFICATION_TYPES = {
  CHANGE_DETECTED: 'change_detected',
  ERROR: 'error',
  INFO: 'info'
};
