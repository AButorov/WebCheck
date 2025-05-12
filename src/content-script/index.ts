import browser from 'webextension-polyfill'
import { onMessage, sendMessage } from 'webext-bridge/content-script'
import { MessagePayloads } from '~/types/messages'

// Отслеживаем активацию селектора элементов
onMessage('activate-selector', async () => {
  console.log('Element selector activated')
  
  // Включаем режим выбора элемента
  activateElementSelector()
})

// Функция для активации селектора элементов
function activateElementSelector() {
  // Текущий выбранный элемент
  let selectedElement: Element | null = null
  let hoveredElement: Element | null = null
  
  // Создаем выделение для наведенного элемента
  const highlighter = document.createElement('div')
  highlighter.style.position = 'absolute'
  highlighter.style.border = '2px solid #3e66fb'
  highlighter.style.backgroundColor = 'rgba(62, 102, 251, 0.1)'
  highlighter.style.pointerEvents = 'none'
  highlighter.style.zIndex = '10000'
  highlighter.style.display = 'none'
  document.body.appendChild(highlighter)
  
  // Инструкция для пользователя
  const instructions = document.createElement('div')
  instructions.style.position = 'fixed'
  instructions.style.top = '10px'
  instructions.style.left = '50%'
  instructions.style.transform = 'translateX(-50%)'
  instructions.style.backgroundColor = '#fff'
  instructions.style.border = '1px solid #ddd'
  instructions.style.borderRadius = '4px'
  instructions.style.padding = '10px'
  instructions.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
  instructions.style.zIndex = '10001'
  instructions.style.fontSize = '14px'
  instructions.innerHTML = 'Кликните на элемент для отслеживания. <button id="cancel-selection">Отмена</button>'
  document.body.appendChild(instructions)
  
  // Обработчик отмены выбора
  document.getElementById('cancel-selection')?.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    cleanup()
  })
  
  // Обработчик движения мыши для подсветки элементов
  function handleMouseMove(e: MouseEvent) {
    // Получаем элемент под курсором, пропуская наши созданные элементы
    const target = document.elementFromPoint(e.clientX, e.clientY)
    if (!target || target === highlighter || target === instructions || instructions.contains(target)) {
      highlighter.style.display = 'none'
      hoveredElement = null
      return
    }
    
    hoveredElement = target
    
    // Обновляем позицию и размер подсветки
    const rect = target.getBoundingClientRect()
    highlighter.style.left = `${rect.left + window.scrollX}px`
    highlighter.style.top = `${rect.top + window.scrollY}px`
    highlighter.style.width = `${rect.width}px`
    highlighter.style.height = `${rect.height}px`
    highlighter.style.display = 'block'
  }
  
  // Обработчик клика для выбора элемента
  function handleClick(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    
    if (hoveredElement) {
      selectedElement = hoveredElement
      
      // Получаем необходимую информацию о выбранном элементе
      const html = selectedElement.outerHTML
      const rect = selectedElement.getBoundingClientRect()
      
      // Генерируем CSS-селектор для выбранного элемента
      const selector = generateSelector(selectedElement)
      
      // Отправляем информацию в фоновый скрипт
      sendMessage('element-selected', {
        selector,
        html,
        title: document.title,
        url: window.location.href,
        faviconUrl: getFaviconUrl(),
        position: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        }
      }, { context: 'popup', tabId: -1 }).catch(console.error)
      
      // Очищаем DOM после выбора
      cleanup()
    }
  }
  
  // Очистка DOM-элементов
  function cleanup() {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('click', handleClick)
    highlighter.remove()
    instructions.remove()
    
    // Сообщаем, что выбор был отменен
    sendMessage('element-selection-cancelled', null, { context: 'popup', tabId: -1 }).catch(console.error)
  }
  
  // Получение URL иконки сайта
  function getFaviconUrl(): string {
    const links = document.querySelectorAll('link[rel*="icon"]')
    if (links.length > 0) {
      // Берем последнюю иконку (обычно она имеет наивысший приоритет)
      const link = links[links.length - 1] as HTMLLinkElement
      if (link.href) {
        return link.href
      }
    }
    
    // Стандартный путь к иконке
    return new URL('/favicon.ico', window.location.origin).href
  }
  
  // Генерация CSS-селектора для элемента
  function generateSelector(el: Element): string {
    if (el.id) {
      return `#${el.id}`
    }
    
    // Если нет id, создаем селектор по пути к элементу
    let path = ''
    let current = el
    
    while (current !== document.body && current.parentElement) {
      let selector = current.tagName.toLowerCase()
      
      // Добавляем классы (первые 2 для уникальности)
      if (current.classList.length > 0) {
        const classNames = Array.from(current.classList).slice(0, 2)
        selector += `.${classNames.join('.')}`
      }
      
      path = path ? `${selector} > ${path}` : selector
      current = current.parentElement
    }
    
    return path
  }
  
  // Добавляем обработчики событий
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('click', handleClick)
}

// Проверка изменений для конкретной задачи
onMessage('check-element', async (message) => {
  const { data } = message
  const { taskId, selector } = data as MessagePayloads['check-element']
  
  // Ищем элемент по селектору
  const element = document.querySelector(selector)
  
  if (element) {
    // Получаем текущий HTML элемента
    const currentHtml = element.outerHTML
    
    // Отправляем результат в фоновый скрипт
    return {
      taskId,
      html: currentHtml,
    }
  }
  
  return {
    taskId,
    error: 'Element not found',
  }
})
