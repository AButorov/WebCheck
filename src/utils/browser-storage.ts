import browser from 'webextension-polyfill'

console.log('[BROWSER-STORAGE] Initializing browser storage utils...')

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
  console.log(`[BROWSER-STORAGE] Getting "${key}" from storage.local...`)
  try {
    const result = await browser.storage.local.get(key)
    
    if (key in result) {
      console.log(`[BROWSER-STORAGE] Value found for "${key}" in storage.local`)
      return result[key] as T
    }
    
    console.log(`[BROWSER-STORAGE] No value found for "${key}" in storage.local, using default:`, defaultValue)
    return defaultValue
  } catch (error) {
    console.error(`[BROWSER-STORAGE] Error getting "${key}" from storage.local:`, error)
    return defaultValue
  }
}

// Сохранение значения в local storage
export async function setStorageLocal<T = JsonValue>(key: string, value: T): Promise<void> {
  console.log(`[BROWSER-STORAGE] Saving "${key}" to storage.local...`)
  try {
    await browser.storage.local.set({ [key]: value })
    console.log(`[BROWSER-STORAGE] Value saved for "${key}" in storage.local`)
  } catch (error) {
    console.error(`[BROWSER-STORAGE] Error saving "${key}" to storage.local:`, error)
    throw error
  }
}

// Удаление значения из local storage
export async function removeStorageLocal(key: string): Promise<void> {
  console.log(`[BROWSER-STORAGE] Removing "${key}" from storage.local...`)
  try {
    await browser.storage.local.remove(key)
    console.log(`[BROWSER-STORAGE] Value removed for "${key}" from storage.local`)
  } catch (error) {
    console.error(`[BROWSER-STORAGE] Error removing "${key}" from storage.local:`, error)
    throw error
  }
}

// Очистка всего local storage
export async function clearStorageLocal(): Promise<void> {
  console.log(`[BROWSER-STORAGE] Clearing all storage.local...`)
  try {
    await browser.storage.local.clear()
    console.log(`[BROWSER-STORAGE] All storage.local cleared`)
  } catch (error) {
    console.error('[BROWSER-STORAGE] Error clearing storage.local:', error)
    throw error
  }
}

// Инициализация прослушивателя изменений в хранилище
export function initStorageListener(): void {
  console.log(`[BROWSER-STORAGE] Initializing storage change listener...`)
  try {
    browser.storage.onChanged.addListener((changes, areaName) => {
      console.log(`[BROWSER-STORAGE] Storage ${areaName} changed:`, changes)
    })
    console.log(`[BROWSER-STORAGE] Storage change listener initialized`)
  } catch (error) {
    console.error('[BROWSER-STORAGE] Error initializing storage change listener:', error)
  }
}

// Вызываем инициализацию прослушивателя
initStorageListener()
