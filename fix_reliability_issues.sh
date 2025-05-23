#!/bin/zsh

echo "🔧 Исправление проблем с системой надёжности WebCheck"
echo "================================================="

# Проверяем, что мы в правильной директории
if [ ! -f "package.json" ]; then
    echo "❌ Ошибка: Запустите скрипт из корневой директории проекта"
    exit 1
fi

echo "✅ Находимся в корневой директории проекта"

# 1. Исправляем reliabilityManager.ts - улучшаем проверку перед закрытием документа
echo "📝 Обновляем reliabilityManager.ts..."

cat > src/background/reliabilityManager_fix.ts << 'EOF'
/**
 * Принудительное закрытие документа
 */
async function forceCloseDocument(): Promise<void> {
  try {
    // Сначала проверяем, существует ли документ
    const exists = await hasOffscreenDocument()
    
    if (!exists) {
      console.log('[RELIABILITY] Document does not exist, skipping close')
      return
    }
    
    console.log('[RELIABILITY] Force closing offscreen document')
    await closeOffscreenDocument()
  } catch (error) {
    // Игнорируем ошибки при закрытии - возможно, документ уже закрыт
    console.log('[RELIABILITY] Error closing document (may be already closed):', error)
  }
}
EOF

# Заменяем функцию в файле
echo "🔄 Применяем исправление forceCloseDocument..."
sed -i.bak '/async function forceCloseDocument/,/^}$/c\
/**\
 * Принудительное закрытие документа\
 */\
async function forceCloseDocument(): Promise<void> {\
  try {\
    // Сначала проверяем, существует ли документ\
    const exists = await hasOffscreenDocument()\
    \
    if (!exists) {\
      console.log('\''[RELIABILITY] Document does not exist, skipping close'\'')\
      return\
    }\
    \
    console.log('\''[RELIABILITY] Force closing offscreen document'\'')\
    await closeOffscreenDocument()\
  } catch (error) {\
    // Игнорируем ошибки при закрытии - возможно, документ уже закрыт\
    console.log('\''[RELIABILITY] Error closing document (may be already closed):'\'', error)\
  }\
}' src/background/reliabilityManager.ts

# 2. Исправляем performHealthCheck - добавляем сброс кэша перед проверкой
echo "📝 Улучшаем performHealthCheck..."

# Добавляем invalidateCache перед проверкой существования документа
sed -i.bak '/async function performHealthCheck/,/try {/s/try {/try {\
    \/\/ Сбрасываем кэш для точной проверки\
    invalidateCache()\
    /' src/background/reliabilityManager.ts

# Добавляем импорт invalidateCache
sed -i.bak 's/import { ensureOffscreenDocument, hasOffscreenDocument, closeOffscreenDocument, pingOffscreenDocument }/import { ensureOffscreenDocument, hasOffscreenDocument, closeOffscreenDocument, pingOffscreenDocument, invalidateCache }/' src/background/reliabilityManager.ts

# 3. Исправляем отправку сообщений в popup - добавляем проверку на существование popup
echo "📝 Создаём безопасную функцию отправки сообщений в popup..."

cat > src/background/safeMessaging.ts << 'EOF'
/**
 * Безопасная отправка сообщений в popup
 */
export async function sendMessageToPopup(message: any): Promise<void> {
  try {
    // Проверяем, открыт ли popup
    const views = chrome.extension.getViews({ type: 'popup' })
    
    if (views.length === 0) {
      // Popup закрыт, не отправляем сообщение
      console.log('[MESSAGING] Popup is closed, message not sent:', message.type)
      return
    }
    
    // Отправляем сообщение
    await chrome.runtime.sendMessage(message)
  } catch (error) {
    // Игнорируем ошибки отправки, если popup уже закрыт
    if ((error as Error).message?.includes('message port closed')) {
      console.log('[MESSAGING] Popup closed before response received')
    } else {
      console.error('[MESSAGING] Error sending message to popup:', error)
    }
  }
}

/**
 * Проверка, открыт ли popup
 */
export function isPopupOpen(): boolean {
  const views = chrome.extension.getViews({ type: 'popup' })
  return views.length > 0
}
EOF

# 4. Обновляем monitor/index.ts для использования безопасной отправки сообщений
echo "📝 Обновляем monitor/index.ts..."

# Добавляем импорт
sed -i.bak '1s/^/import { sendMessageToPopup } from '\''..\/safeMessaging'\''\n/' src/background/monitor/index.ts

# Заменяем все chrome.runtime.sendMessage на sendMessageToPopup в функциях, отправляющих в popup
sed -i.bak 's/chrome\.runtime\.sendMessage({$/sendMessageToPopup({/g' src/background/monitor/index.ts
sed -i.bak 's/await chrome\.runtime\.sendMessage({$/await sendMessageToPopup({/g' src/background/monitor/index.ts

# 5. Улучшаем обработку ping в offscreen.js
echo "📝 Улучшаем обработку ping в offscreen.js..."

# Проверяем, есть ли обработчик PING
if ! grep -q "case 'PING':" src/offscreen/offscreen.js; then
    echo "🔄 Добавляем обработчик PING..."
    
    # Находим место в switch и добавляем обработчик
    sed -i.bak "/switch (request.type) {/a\\
    case 'PING':\\
      console.log('[OFFSCREEN] Ping received')\\
      sendResponse({ status: 'alive' })\\
      return true\\
" src/offscreen/offscreen.js
fi

# 6. Удаляем резервные копии
echo "🧹 Удаляем временные файлы..."
rm -f src/background/*.bak
rm -f src/offscreen/*.bak

echo ""
echo "✅ Исправления применены!"
echo ""
echo "📝 Что было исправлено:"
echo "  1. forceCloseDocument теперь проверяет существование документа перед закрытием"
echo "  2. performHealthCheck сбрасывает кэш перед проверкой для точности"
echo "  3. Создана безопасная функция отправки сообщений в popup"
echo "  4. monitor/index.ts использует безопасную отправку сообщений"
echo "  5. Добавлен/улучшен обработчик PING в offscreen.js"
echo ""
echo "🔄 Пересоберите проект:"
echo "  ./build.sh"
echo ""
echo "🧪 После сборки протестируйте:"
echo "  1. Откройте chrome://extensions/"
echo "  2. Перезагрузите расширение"
echo "  3. Проверьте консоль Service Worker на наличие ошибок"
