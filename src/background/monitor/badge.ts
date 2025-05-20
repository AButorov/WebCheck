/**
 * Модуль для управления значком расширения (badge)
 * 
 * Отвечает за:
 * 1. Обновление счетчика на значке расширения
 * 2. Изменение иконки в зависимости от статуса задач
 * 3. Обновление всплывающей подсказки (tooltip)
 */

import browser from 'webextension-polyfill'
import { COLORS } from '~/utils/constants'

/**
 * Обновление бейджа на иконке расширения
 * 
 * @param count Количество задач с изменениями
 */
export function updateBadge(count: number): void {
  // Обновляем счетчик только если есть изменения
  if (count > 0) {
    // Устанавливаем текст счетчика
    browser.action.setBadgeText({ text: count.toString() })
    
    // Устанавливаем цвет фона счетчика (янтарный для измененных задач)
    browser.action.setBadgeBackgroundColor({ color: COLORS.CHANGED.TEXT })
    
    // Устанавливаем цвет текста счетчика (белый)
    browser.action.setBadgeTextColor({ color: '#FFFFFF' })
    
    // Заменяем иконку на вариант для измененных задач
    browser.action.setIcon({
      path: {
        16: 'icons/icon-changed-16.png',
        32: 'icons/icon-changed-32.png',
        48: 'icons/icon-changed-48.png',
        128: 'icons/icon-changed-128.png'
      }
    }).catch(error => {
      console.error('[BADGE] Error setting changed icon:', error)
    })
    
    // Обновляем всплывающую подсказку
    browser.action.setTitle({
      title: `Web Check: ${count} элемент(ов) с изменениями`
    })
  } else {
    // Сбрасываем счетчик
    browser.action.setBadgeText({ text: '' })
    
    // Сбрасываем иконку на стандартную
    browser.action.setIcon({
      path: {
        16: 'icons/icon-16.png',
        32: 'icons/icon-32.png',
        48: 'icons/icon-48.png',
        128: 'icons/icon-128.png'
      }
    }).catch(error => {
      console.error('[BADGE] Error setting default icon:', error)
    })
    
    // Сбрасываем всплывающую подсказку
    browser.action.setTitle({
      title: 'Web Check: Нет изменений'
    })
  }
}
