// Декларации типов для Vue компонентов
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}

// Глобальные декларации для window
declare global {
  interface Window {
    vueRouter?: import('vue-router').Router
    t?: (key: string) => string
  }
}

export {}
