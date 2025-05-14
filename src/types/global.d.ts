// Добавление декларации для window.t
declare global {
  interface Window {
    t: (key: string) => string;
    vueRouter: any;
  }
}

export {};
