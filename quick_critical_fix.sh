#!/bin/zsh

echo "🚀 Быстрое применение критичных исправлений WebCheck"
echo "==================================================="
echo ""

# Проверяем, что мы в правильной директории
if [ ! -f "package.json" ]; then
    echo "❌ Ошибка: Запустите скрипт из корневой директории проекта"
    exit 1
fi

echo "✅ Применяем самое важное исправление - замену offscreenManager"
echo ""

# 1. Делаем резервную копию старого offscreenManager
if [ -f "src/background/offscreenManager.ts" ]; then
    cp src/background/offscreenManager.ts src/background/offscreenManager.ts.original
    echo "✅ Создана резервная копия offscreenManager.ts.original"
fi

# 2. Копируем новый offscreenManager
if [ -f "src/background/offscreenManagerFixed.ts" ]; then
    cp src/background/offscreenManagerFixed.ts src/background/offscreenManager.ts
    echo "✅ Заменён offscreenManager на исправленную версию (Singleton)"
else
    echo "⚠️  Сначала запустите apply_architecture_fixes.sh"
    exit 1
fi

# 3. Создаём минимальный патч для background/index.ts
echo ""
echo "📝 Применяем минимальный патч для асинхронных сообщений..."

# Добавляем простой обработчик для тестирования
cat >> src/background/index.ts << 'EOF'

// ВРЕМЕННЫЙ ОБРАБОТЧИК ДЛЯ ТЕСТИРОВАНИЯ
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'get-monitoring-stats') {
    getMonitoringStats()
      .then(stats => sendResponse({ success: true, stats }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // КРИТИЧНО для асинхронного ответа
  }
  
  if (request.type === 'get-performance-stats') {
    getPerformanceStats()
      .then(stats => sendResponse({ success: true, stats }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // КРИТИЧНО для асинхронного ответа
  }
  
  return false;
});
EOF

echo "✅ Добавлен временный обработчик для тестирования"

echo ""
echo "📋 Теперь:"
echo "  1. Пересоберите проект: ./build.sh"
echo "  2. Перезагрузите расширение в Chrome"
echo "  3. Протестируйте в консоли Service Worker:"
echo ""
echo "chrome.runtime.sendMessage({type: 'get-monitoring-stats'}).then(console.log)"
echo ""
echo "⚠️  Это временное решение! Для полного исправления используйте:"
echo "  ./apply_architecture_fixes.sh"
