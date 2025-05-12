// Цветовая схема согласно ТЗ
export const COLORS = {
  // Основной цвет интерфейса
  PRIMARY: '#2d6cdf',
  
  // Цвета для статусов
  CHANGED: {
    MAIN: '#ffb300',
    BG: '#fff8e1',
    BORDER: '#ffecb3'
  },
  UNCHANGED: {
    MAIN: '#4caf50',
    BG: '#f1f8e9',
    BORDER: '#dcedc8'
  },
  PAUSED: {
    MAIN: '#9e9e9e',
    BG: '#f5f5f5',
    BORDER: '#eeeeee'
  },
  
  // Функциональные цвета
  VIEW_CHANGES: '#673ab7',
  DELETE: '#f44336',
  ADD_TASK: '#3e66fb'
}

// Интервалы проверки
export const CHECK_INTERVALS = [
  { value: '15m', label: '15м' },
  { value: '1h', label: '1ч' },
  { value: '3h', label: '3ч' },
  { value: '1d', label: '1д' }
]

// Максимальное количество задач
export const MAX_TASKS = 5
