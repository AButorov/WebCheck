/**
 * Модуль для проверки элементов на веб-страницах
 * 
 * Этот модуль отвечает за:
 * 1. Проверку элементов через offscreen-документы
 * 2. Обработку ошибок при проверке
 * 3. Обеспечение надежности с повторными попытками
 */

import browser from 'webextension-polyfill'
import { CHECK_DELAY } from '~/utils/constants'
import { sendMessageToOffscreen, ensureOffscreenDocument } from '../offscreenManager'
import { withReliability, registerActivity } from '../reliabilityManager'
import { nanoid } from '~/utils/nanoid'

// Тип для результата проверки элемента
interface CheckResult {
  html?: string
  error?: string
}

// Конфигурация для проверки элементов
const CHECK_CONFIG = {
  DEFAULT_TIMEOUT: 30000, // 30 секунд на одну проверку
  RETRY_DELAY: 2000, // 2 секунды между попытками
  DEFAULT_MAX_RETRIES: 3
}

/**
 * Проверяет состояние элемента на веб-странице через offscreen API
 * 
 * @param url URL страницы для проверки
 * @param selector CSS селектор элемента
 * @param maxRetries Максимальное количество попыток проверки
 * @returns Объект с HTML содержимым или ошибкой
 */
export async function checkElement(url: string, selector: string, maxRetries = CHECK_CONFIG.DEFAULT_MAX_RETRIES): Promise<CheckResult> {
  console.log(`[ELEMENT CHECKER] Checking element at ${url} with selector: ${selector} (via offscreen)`)  
  
  let lastError: string | undefined
  
  // Повторяем попытки несколько раз
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[ELEMENT CHECKER] Attempt ${attempt}/${maxRetries} for ${url}`)  
      
      // Проверяем элемент через offscreen
      const result = await checkElementViaOffscreen(url, selector)
      
      // Если элемент найден успешно, возвращаем результат
      if (result.html) {
        console.log(`[ELEMENT CHECKER] Successfully found element on attempt ${attempt}`)  
        return result
      }
      
      // Запоминаем ошибку
      lastError = result.error
      console.log(`[ELEMENT CHECKER] Attempt ${attempt}/${maxRetries} failed: ${lastError}`)  
      
    } catch (error) {
      console.error(`[ELEMENT CHECKER] Error in attempt ${attempt}/${maxRetries}:`, error)
      lastError = error instanceof Error ? error.message : String(error)
    }
    
    // Если это была не последняя попытка, делаем паузу
    if (attempt < maxRetries) {
      console.log(`[ELEMENT CHECKER] Waiting ${CHECK_CONFIG.RETRY_DELAY}ms before retry`)  
      await delay(CHECK_CONFIG.RETRY_DELAY)
    }
  }
  
  // Все попытки исчерпаны
  console.error(`[ELEMENT CHECKER] All ${maxRetries} attempts failed for ${url}`)  
  return { error: lastError || 'Failed to check element after multiple attempts' }
}

/**
 * Проверка элемента через offscreen-документ с менеджером надёжности
 */
async function checkElementViaOffscreen(url: string, selector: string): Promise<CheckResult> {
  try {
    // Регистрируем активность
    registerActivity()
    
    // Используем менеджер надёжности для выполнения операции
    const result = await withReliability(async () => {
      // Убеждаемся, что offscreen-документ существует
      await ensureOffscreenDocument()
      
      // Создаем уникальный ID для запроса
      const requestId = nanoid()
      
      console.log(`[ELEMENT CHECKER] Sending request ${requestId} to offscreen for ${url}`)  
      
      // Отправляем сообщение в offscreen-документ
      const response = await sendMessageToOffscreen({
        type: 'PROCESS_URL',
        url,
        selector,
        requestId
      })
      
      console.log(`[ELEMENT CHECKER] Received response for request ${requestId}:`, response)
      
      // Проверяем ответ
      if (response?.error) {
        throw new Error(response.error)
      }
      
      if (response?.success && response?.content) {
        return response.content
      }
      
      throw new Error('Invalid response from offscreen document')
    }, 1) // Одна попытка восстановления
    
    return { html: result }
    
  } catch (error) {
    console.error('[ELEMENT CHECKER] Error in checkElementViaOffscreen:', error)
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Легаси функция: проверка элементов через создание вкладок (для совместимости)
 * Используется как fallback, если offscreen API недоступен
 */
export async function checkElementViaTabs(url: string, selector: string, maxRetries = 3): Promise<CheckResult> {
  console.log(`[ELEMENT CHECKER] Checking element at ${url} with selector: ${selector} (via tabs)`)  
  
  let lastError: string | undefined
  
  // Повторяем попытки несколько раз
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let tab: browser.Tabs.Tab | null = null
    
    try {
      // Создаем новую вкладку скрыто
      tab = await browser.tabs.create({
        url,
        active: false,
        pinned: false
      })
      
      console.log(`[ELEMENT CHECKER] Created tab ${tab.id} for checking (attempt ${attempt}/${maxRetries})`)  
      
      // Ждем загрузки страницы
      await waitForTabLoad(tab.id!)
      
      // Увеличиваем задержку с каждой попыткой
      const delayTime = 1000 * attempt
      console.log(`[ELEMENT CHECKER] Waiting ${delayTime}ms for page to fully render`)  
      await delay(delayTime)
      
      // Извлекаем HTML содержимое элемента
      const result = await extractElementHtml(tab.id!, selector)
      
      // Если элемент найден успешно, возвращаем результат
      if (result.html) {
        return result
      }
      
      // Запоминаем ошибку для возможного возврата после всех попыток
      lastError = result.error
      console.log(`[ELEMENT CHECKER] Attempt ${attempt}/${maxRetries} failed: ${lastError}`)  
      
    } catch (error) {
      console.error(`[ELEMENT CHECKER] Error in attempt ${attempt}/${maxRetries}:`, error)
      lastError = error instanceof Error ? error.message : String(error)
    } finally {
      // Закрываем вкладку, если она была создана
      if (tab && tab.id) {
        try {
          await browser.tabs.remove(tab.id)
          console.log(`[ELEMENT CHECKER] Closed tab ${tab.id}`)  
        } catch (error) {
          console.error(`[ELEMENT CHECKER] Error closing tab ${tab.id}:`, error)
        }
      }
    }
    
    // Если это была не последняя попытка, делаем паузу
    if (attempt < maxRetries) {
      await delay(1000)
    }
  }
  
  // Все попытки исчерпаны, возвращаем последнюю ошибку
  return { error: lastError || 'Failed to check element after multiple attempts' }
}

/**
 * Ожидание загрузки вкладки
 */
function waitForTabLoad(tabId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      browser.tabs.onUpdated.removeListener(onUpdated)
      reject(new Error('Timeout waiting for tab to load'))
    }, CHECK_CONFIG.DEFAULT_TIMEOUT)
    
    function onUpdated(changedTabId: number, changeInfo: browser.Tabs.OnUpdatedChangeInfoType) {
      if (changedTabId === tabId && changeInfo.status === 'complete') {
        clearTimeout(timeout)
        browser.tabs.onUpdated.removeListener(onUpdated)
        resolve()
      }
    }
    
    browser.tabs.onUpdated.addListener(onUpdated)
  })
}

/**
 * Извлечение HTML содержимого элемента с поддержкой альтернативных селекторов
 */
async function extractElementHtml(tabId: number, selector: string): Promise<CheckResult> {
  try {
    const results = await browser.scripting.executeScript({
      target: { tabId },
      func: (selectorArg) => {
        try {
          let element = document.querySelector(selectorArg)
          
          if (!element) {
            // Пробуем альтернативные варианты...
            if (selectorArg.includes('.')) {
              const className = selectorArg.split('.').pop()?.trim()
              if (className) {
                const alternatives = document.getElementsByClassName(className)
                if (alternatives.length > 0) {
                  element = alternatives[0]
                }
              }
            } else if (selectorArg.includes('#')) {
              const idName = selectorArg.split('#').pop()?.trim()
              if (idName) {
                const elements = document.querySelectorAll(`[id*='${idName}']`)
                if (elements.length > 0) {
                  element = elements[0]
                }
              }
            }
            
            if (!element && selectorArg.match(/^[a-z]+(\.|\[)/i)) {
              const tagName = selectorArg.match(/^[a-z]+/i)?.[0]
              if (tagName) {
                const elements = document.getElementsByTagName(tagName)
                if (elements.length > 0) {
                  element = elements[0]
                }
              }
            }
          }
          
          if (!element) {
            return { error: `Element not found with selector: ${selectorArg}` }
          }
          
          return { html: element.outerHTML }
        } catch (error) {
          return { error: String(error) }
        }
      },
      args: [selector]
    })
    
    if (!results || results.length === 0) {
      return { error: 'No result from script execution' }
    }
    
    const result = results[0].result as { html?: string, error?: string }
    
    if (result.error) {
      return { error: result.error }
    }
    
    if (!result.html) {
      return { error: 'No HTML returned' }
    }
    
    return { html: result.html }
  } catch (error) {
    console.error('[ELEMENT CHECKER] Error executing script:', error)
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Вспомогательная функция для задержки
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
