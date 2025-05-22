/**
 * Менеджер offscreen-документов для WebCheck
 * 
 * Этот модуль отвечает за:
 * 1. Проверку существования offscreen-документов
 * 2. Создание offscreen-документов при необходимости
 * 3. Управление жизненным циклом offscreen-документов
 * 4. Предотвращение создания дублированных документов
 */

import browser from 'webextension-polyfill'

// Конфигурация offscreen-документов
const OFFSCREEN_CONFIG = {
  DOCUMENT_PATH: 'offscreen/offscreen.html',
  REASON: 'DOM_SCRAPING' as chrome.offscreen.Reason,
  JUSTIFICATION: 'Проверка изменений на веб-страницах путём извлечения данных из DOM'
}

// Промис для предотвращения одновременного создания документов
let creatingPromise: Promise<void> | null = null

// Кэш для отслеживания состояния документа
let documentExists = false
let lastDocumentCheck = 0
const CACHE_DURATION = 5000 // 5 секунд кэша

/**
 * Проверка существования offscreen-документа
 */
export async function hasOffscreenDocument(path?: string): Promise<boolean> {
  const targetPath = path || OFFSCREEN_CONFIG.DOCUMENT_PATH
  
  try {
    // Используем кэш для частых проверок
    const now = Date.now()
    if (documentExists && (now - lastDocumentCheck) < CACHE_DURATION) {
      return true
    }
    
    // Получаем все контексты расширения
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT']
    })
    
    // Проверяем, есть ли контекст с нужным документом
    const hasDocument = contexts.some(context => 
      context.documentUrl?.endsWith(targetPath)
    )
    
    // Обновляем кэш
    documentExists = hasDocument
    lastDocumentCheck = now
    
    console.log(`[OffscreenManager] Document ${targetPath} exists:`, hasDocument)
    return hasDocument
    
  } catch (error) {
    console.error('[OffscreenManager] Error checking offscreen document:', error)
    // Сбрасываем кэш при ошибке
    documentExists = false
    return false
  }
}

/**
 * Обеспечение существования offscreen-документа
 * Создает документ, если он не существует
 */
export async function ensureOffscreenDocument(path?: string): Promise<void> {
  const targetPath = path || OFFSCREEN_CONFIG.DOCUMENT_PATH
  
  console.log(`[OffscreenManager] Ensuring offscreen document: ${targetPath}`)
  
  try {
    // Проверяем, есть ли уже документ
    if (await hasOffscreenDocument(targetPath)) {
      console.log('[OffscreenManager] Offscreen document already exists')
      return
    }
    
    // Если уже создается документ, ждем завершения
    if (creatingPromise) {
      console.log('[OffscreenManager] Document creation already in progress, waiting...')
      await creatingPromise
      return
    }
    
    // Создаем новый документ
    console.log('[OffscreenManager] Creating new offscreen document')
    creatingPromise = createOffscreenDocument(targetPath)
    
    await creatingPromise
    
    // Сбрасываем промис после создания
    creatingPromise = null
    
    // Обновляем кэш
    documentExists = true
    lastDocumentCheck = Date.now()
    
    console.log('[OffscreenManager] Offscreen document created successfully')
    
  } catch (error) {
    console.error('[OffscreenManager] Error ensuring offscreen document:', error)
    
    // Сбрасываем состояние при ошибке
    creatingPromise = null
    documentExists = false
    
    // Перебрасываем ошибку для обработки на верхнем уровне
    throw new Error(`Failed to ensure offscreen document: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Создание offscreen-документа
 */
async function createOffscreenDocument(path: string): Promise<void> {
  try {
    await chrome.offscreen.createDocument({
      url: path,
      reasons: [OFFSCREEN_CONFIG.REASON],
      justification: OFFSCREEN_CONFIG.JUSTIFICATION
    })
    
    console.log(`[OffscreenManager] Offscreen document created: ${path}`)
    
  } catch (error) {
    console.error('[OffscreenManager] Failed to create offscreen document:', error)
    throw error
  }
}

/**
 * Закрытие offscreen-документа
 */
export async function closeOffscreenDocument(): Promise<void> {
  try {
    console.log('[OffscreenManager] Closing offscreen document')
    
    await chrome.offscreen.closeDocument()
    
    // Сбрасываем кэш
    documentExists = false
    lastDocumentCheck = 0
    
    console.log('[OffscreenManager] Offscreen document closed')
    
  } catch (error) {
    console.error('[OffscreenManager] Error closing offscreen document:', error)
    
    // Сбрасываем кэш даже при ошибке
    documentExists = false
    lastDocumentCheck = 0
    
    throw error
  }
}

/**
 * Отправка сообщения в offscreen-документ
 */
export async function sendMessageToOffscreen(message: any): Promise<any> {
  try {
    // Убеждаемся, что offscreen-документ существует
    await ensureOffscreenDocument()
    
    // Отправляем сообщение
    const response = await chrome.runtime.sendMessage({
      target: 'offscreen',
      ...message
    })
    
    return response
    
  } catch (error) {
    console.error('[OffscreenManager] Error sending message to offscreen:', error)
    throw error
  }
}

/**
 * Ping offscreen-документа для проверки доступности
 */
export async function pingOffscreenDocument(): Promise<boolean> {
  try {
    const response = await sendMessageToOffscreen({
      type: 'PING'
    })
    
    return response?.status === 'alive'
    
  } catch (error) {
    console.warn('[OffscreenManager] Offscreen document ping failed:', error)
    
    // Сбрасываем кэш при неудачном ping
    documentExists = false
    
    return false
  }
}

/**
 * Получение статистики offscreen-документа
 */
export async function getOffscreenStats(): Promise<{
  exists: boolean
  responsive: boolean
  cacheAge: number
}> {
  const exists = await hasOffscreenDocument()
  const responsive = exists ? await pingOffscreenDocument() : false
  const cacheAge = Date.now() - lastDocumentCheck
  
  return {
    exists,
    responsive,
    cacheAge
  }
}

/**
 * Принудительное обновление кэша состояния документа
 */
export function invalidateCache(): void {
  console.log('[OffscreenManager] Cache invalidated')
  documentExists = false
  lastDocumentCheck = 0
}

/**
 * Обработчик событий браузера для отслеживания состояния offscreen-документов
 */
export function setupOffscreenEventHandlers(): void {
  // Обработчик запуска браузера
  chrome.runtime.onStartup.addListener(() => {
    console.log('[OffscreenManager] Browser startup detected, invalidating cache')
    invalidateCache()
  })
  
  // Обработчик установки/обновления расширения
  chrome.runtime.onInstalled.addListener(() => {
    console.log('[OffscreenManager] Extension installed/updated, invalidating cache')
    invalidateCache()
  })
  
  console.log('[OffscreenManager] Event handlers set up')
}