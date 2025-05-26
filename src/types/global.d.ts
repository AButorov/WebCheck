// Глобальные типы для проекта

// Декларация для Vue Single File Components
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

// Добавление декларации для window.t
declare global {
  interface Window {
    t: (key: string) => string
    vueRouter: unknown
  }
}

export {}
