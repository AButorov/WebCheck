/**
 * Модуль для проверки элементов на веб-страницах
 * 
 * Этот модуль отвечает за:
 * 1. Открытие целевой страницы в скрытой вкладке
 * 2. Инжекцию скриптов для извлечения целевого элемента
 * 3. Получение HTML-содержимого элемента
 * 4. Обработку ошибок при проверке
 */

import browser from 'webextension-polyfill'
import { CHECK_DELAY } from '~/utils/constants'

// Тип для результата проверки элемента
interface CheckResult {
  html?: string
  error?: string
}

/**
 * Проверяет состояние элемента на веб-странице с поддержкой повторных попыток
 * 
 * @param url URL страницы для проверки
 * @param selector CSS селектор элемента
 * @param maxRetries Максимальное количество попыток проверки (по умолчанию 3)
 * @returns Объект с HTML содержимым или ошибкой
 */
export async function checkElement(url: string, selector: string, maxRetries = 3): Promise<CheckResult> {
  console.log(`[ELEMENT CHECKER] Checking element at ${url} with selector: ${selector}`)
  
  let lastError: string | undefined
  
  // Повторяем попытки несколько раз
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Создаем скрытую вкладку
    let tab: browser.Tabs.Tab | null = null
    
    try {
      // Создаем новую вкладку скрыто
      tab = await browser.tabs.create({
        url,
        active: false,
        pinned: false
      })
      
      console.log(`[ELEMENT CHECKER] Created tab ${tab.id} for checking`)
      
      // Ждем загрузки страницы
      await waitForTabLoad(tab.id!)
      
      // Увеличиваем задержку с каждой попыткой
      const delayTime = 1000 * attempt
      console.log(`[ELEMENT CHECKER] Waiting ${delayTime}ms for page to fully render (attempt ${attempt}/${maxRetries})`)
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
    
    // Если это была не последняя попытка, делаем паузу перед следующей
    if (attempt < maxRetries) {
      await delay(1000)
    }
  }
  
  // Все попытки исчерпаны, возвращаем последнюю ошибку
  return { error: lastError || 'Failed to check element after multiple attempts' }
}

/**
 * Ожидание загрузки вкладки
 * 
 * @param tabId Идентификатор вкладки
 * @returns Promise, который разрешается, когда вкладка загружена
 */
function waitForTabLoad(tabId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    // Таймаут для защиты от бесконечного ожидания
    const timeout = setTimeout(() => {
      browser.tabs.onUpdated.removeListener(onUpdated)
      reject(new Error('Timeout waiting for tab to load'))
    }, 30000) // 30 секунд таймаут
    
    // Функция для отслеживания обновлений вкладки
    function onUpdated(changedTabId: number, changeInfo: browser.Tabs.OnUpdatedChangeInfoType) {
      if (changedTabId === tabId && changeInfo.status === 'complete') {
        clearTimeout(timeout)
        browser.tabs.onUpdated.removeListener(onUpdated)
        resolve()
      }
    }
    
    // Подписываемся на обновления вкладки
    browser.tabs.onUpdated.addListener(onUpdated)
  })
}

/**
 * Извлечение HTML содержимого элемента с поддержкой альтернативных селекторов
 * 
 * @param tabId Идентификатор вкладки
 * @param selector CSS селектор элемента
 * @returns Объект с HTML содержимым или ошибкой
 */
async function extractElementHtml(tabId: number, selector: string): Promise<CheckResult> {
  try {
    // Инжектируем скрипт для извлечения HTML с поддержкой нескольких стратегий селекторов
    const results = await browser.scripting.executeScript({
      target: { tabId },
      func: (selectorArg) => {
        try {
          // Пробуем найти элемент по основному селектору
          let element = document.querySelector(selectorArg)
          
          // Если не найден, пробуем альтернативные варианты
          if (!element) {
            // Попробуем найти по частичному соответствию текста/классов
            if (selectorArg.includes('.')) {
              // Селектор по классу, пробуем найти элемент с этим классом
              const className = selectorArg.split('.').pop()?.trim()
              if (className) {
                const alternatives = document.getElementsByClassName(className)
                if (alternatives.length > 0) {
                  element = alternatives[0]
                }
              }
            } else if (selectorArg.includes('#')) {
              // Селектор по id, пробуем найти элементы с похожим id
              const idName = selectorArg.split('#').pop()?.trim()
              if (idName) {
                const elements = document.querySelectorAll(`[id*='${idName}']`)
                if (elements.length > 0) {
                  element = elements[0]
                }
              }
            }
            
            // Если все еще не нашли и селектор выглядит как имя тега с классом или атрибутом
            if (!element && selectorArg.match(/^[a-z]+(\.|\[)/i)) {
              const tagName = selectorArg.match(/^[a-z]+/i)?.[0]
              if (tagName) {
                // Найти все элементы с этим тегом и посмотреть, есть ли похожие
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
    
    // Проверяем результат
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
 * 
 * @param ms Время задержки в миллисекундах
 * @returns Promise, который разрешается через указанное время
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
