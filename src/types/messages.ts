// Типы для сообщений между компонентами расширения
import { WebCheckTask } from './task'

// Определяем тип, который заменяет JsonValue из webext-bridge
export type JsonValue = string | number | boolean | null | undefined | { [key: string]: JsonValue } | JsonValue[]

// Описываем типы сообщений для webext-bridge
export interface MessagePayloads {
  // Сообщение для активации селектора элементов
  'activate-selector': JsonValue
  
  // Сообщение об отмене выбора элемента
  'element-selection-cancelled': JsonValue
  
  // Сообщение о выбранном элементе
  'element-selected': {
    selector: string
    html: string
    title: string
    url: string
    faviconUrl: string
    position: {
      top: number
      left: number
      width: number
      height: number
    }
  }
  
  // Сообщение для проверки изменений элемента
  'check-for-changes': {
    taskId: string
    tabId: number
  }
  
  // Сообщение для показа уведомления
  'show-notification': {
    title: string
    message: string
    taskId: string
  }
  
  // Сообщение для проверки элемента
  'check-element': {
    taskId: string
    selector: string
  }
}

// Вспомогательный тип для ответов на сообщения
export interface MessageResponses {
  'check-element': {
    taskId: string
    html?: string
    error?: string
  }
}
