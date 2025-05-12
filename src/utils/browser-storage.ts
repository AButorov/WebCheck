import browser from 'webextension-polyfill'

// Тип для значений, которые можно хранить в storage API
export type JsonValue = 
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

// Получение значения из local storage
export async function getStorageLocal<T = JsonValue>(key: string, defaultValue: T): Promise<T> {
  try {
    const result = await browser.storage.local.get(key)
    
    if (key in result) {
      return result[key] as T
    }
    
    return defaultValue
  } catch (error) {
    console.error(`Ошибка при получении "${key}" из storage.local:`, error)
    return defaultValue
  }
}

// Сохранение значения в local storage
export async function setStorageLocal<T = JsonValue>(key: string, value: T): Promise<void> {
  try {
    await browser.storage.local.set({ [key]: value })
  } catch (error) {
    console.error(`Ошибка при сохранении "${key}" в storage.local:`, error)
    throw error
  }
}

// Удаление значения из local storage
export async function removeStorageLocal(key: string): Promise<void> {
  try {
    await browser.storage.local.remove(key)
  } catch (error) {
    console.error(`Ошибка при удалении "${key}" из storage.local:`, error)
    throw error
  }
}

// Очистка всего local storage
export async function clearStorageLocal(): Promise<void> {
  try {
    await browser.storage.local.clear()
  } catch (error) {
    console.error('Ошибка при очистке storage.local:', error)
    throw error
  }
}
