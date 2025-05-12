import { WebCheckTask } from '~/types/task'
import { nanoid } from '~/utils/nanoid'
import { JsonValue } from '~/utils/browser-storage'

// Типы для функций хранилища
type GetStorageLocalFunction = <T>(key: string, defaultValue: T) => Promise<T>
type SetStorageLocalFunction = <T>(key: string, value: T) => Promise<void>

// Создаем функцию для генерации тестовых данных
export function generateDemoTasks(): WebCheckTask[] {
  const now = Date.now()
  const hourAgo = now - 60 * 60 * 1000
  const dayAgo = now - 24 * 60 * 60 * 1000
  
  return [
    {
      id: nanoid(),
      title: 'Цена на iPhone 15 Pro',
      url: 'https://www.apple.com/ru/iphone-15-pro/',
      faviconUrl: 'https://www.apple.com/favicon.ico',
      selector: '.price-point',
      createdAt: dayAgo,
      status: 'changed',
      interval: '1h',
      initialHtml: '<div class="price-point">89 990 ₽</div>',
      currentHtml: '<div class="price-point">85 990 ₽</div>',
      lastCheckedAt: hourAgo,
      lastChangedAt: hourAgo,
    },
    {
      id: nanoid(),
      title: 'Курс Bitcoin на Binance',
      url: 'https://www.binance.com/ru/price/bitcoin',
      faviconUrl: 'https://public.bnbstatic.com/static/images/common/favicon.ico',
      selector: '.price-value',
      createdAt: dayAgo,
      status: 'unchanged',
      interval: '15m',
      initialHtml: '<div class="price-value">$60,245.32</div>',
      currentHtml: '<div class="price-value">$60,245.32</div>',
      lastCheckedAt: hourAgo - 15 * 60 * 1000,
      lastChangedAt: null,
    },
    {
      id: nanoid(),
      title: 'Наличие PS5 в DNS',
      url: 'https://www.dns-shop.ru/product/fd5650d1c517ed20/igrovaa-konsol-sony-playstation-5/',
      faviconUrl: 'https://www.dns-shop.ru/favicon.ico',
      selector: '.availability-text',
      createdAt: dayAgo,
      status: 'paused',
      interval: '3h',
      initialHtml: '<div class="availability-text">Нет в наличии</div>',
      currentHtml: '<div class="availability-text">Нет в наличии</div>',
      lastCheckedAt: dayAgo,
      lastChangedAt: null,
    }
  ]
}

// Функция для очистки демо-режима
export async function clearDemoMode(
  getStorageLocal: GetStorageLocalFunction, 
  setStorageLocal: SetStorageLocalFunction
): Promise<void> {
  const isDemoMode = await getStorageLocal('demoMode', false)
  
  if (isDemoMode) {
    await setStorageLocal('demoMode', false)
    await setStorageLocal('tasks', [])
  }
}

// Функция для инициализации демо-режима
export async function initDemoMode(
  getStorageLocal: GetStorageLocalFunction, 
  setStorageLocal: SetStorageLocalFunction
): Promise<void> {
  const isDemoMode = await getStorageLocal('demoMode', false)
  const tasks = await getStorageLocal('tasks', [] as WebCheckTask[])
  
  // Если еще нет задач и не включен демо-режим
  if (tasks.length === 0 && !isDemoMode) {
    await setStorageLocal('demoMode', true)
    await setStorageLocal('tasks', generateDemoTasks())
  }
}
