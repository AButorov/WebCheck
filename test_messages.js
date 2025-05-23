// Тестовый скрипт для проверки обработки сообщений
// Выполните этот код в консоли Service Worker

console.log('=== Тестирование обработки сообщений ===');

// Тест 1: get-monitoring-stats
console.log('Test 1: get-monitoring-stats');
chrome.runtime.sendMessage({type: 'get-monitoring-stats'})
  .then(response => {
    console.log('✅ Monitoring stats response:', response);
  })
  .catch(error => {
    console.error('❌ Monitoring stats error:', error);
  });

// Тест 2: get-performance-stats
setTimeout(() => {
  console.log('\nTest 2: get-performance-stats');
  chrome.runtime.sendMessage({type: 'get-performance-stats'})
    .then(response => {
      console.log('✅ Performance stats response:', response);
    })
    .catch(error => {
      console.error('❌ Performance stats error:', error);
    });
}, 1000);

// Тест 3: Неизвестный тип
setTimeout(() => {
  console.log('\nTest 3: Unknown message type');
  chrome.runtime.sendMessage({type: 'unknown-type'})
    .then(response => {
      console.log('Response for unknown type:', response);
    })
    .catch(error => {
      console.log('Expected: No handler for unknown type');
    });
}, 2000);

console.log('\nЕсли вы видите ответы с данными (не undefined), значит исправления работают!');
