// Дополнительные декларации типов
import { MessagePayloads, MessageResponses } from './messages'

// Декларация для webext-bridge
declare module 'webext-bridge/background' {
  export function onMessage<K extends keyof MessagePayloads>(
    name: K,
    callback: (
      message: {
        name: K
        data: MessagePayloads[K]
        sender: {
          tabId: number
          frameId: number
        }
      },
      sender: {
        tabId: number
        frameId: number
      }
    ) => Promise<void> | void
  ): void
}

declare module 'webext-bridge/content-script' {
  export function onMessage<K extends keyof MessagePayloads>(
    name: K,
    callback: (
      message: {
        name: K
        data: MessagePayloads[K]
      }
    ) => Promise<MessageResponses[K]> | MessageResponses[K] | void
  ): void

  export function sendMessage<K extends keyof MessagePayloads>(
    name: K,
    data: MessagePayloads[K],
    options?: { 
      context?: 'content-script' | 'popup' | 'options' | 'background' | 'devtools',
      tabId?: number 
    }
  ): Promise<MessageResponses[K]>
}

declare module 'webext-bridge/popup' {
  export function sendMessage<K extends keyof MessagePayloads>(
    name: K,
    data: MessagePayloads[K],
    options?: { 
      context?: 'content-script' | 'popup' | 'options' | 'background' | 'devtools',
      tabId?: number 
    }
  ): Promise<MessageResponses[K]>
}

// Декларация для локального модуля CSP-safe
declare module './csp-safe.js' {
  import { App } from 'vue'
  import { Router } from 'vue-router'
  
  export function configureSafeApp(
    App: any, 
    router: Router, 
    messages: Record<string, any>
  ): App
}
