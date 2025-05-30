/**
 * Тестовый скрипт для диагностики системы коммуникации
 * Проверяет работу исправлений "Could not establish connection"
 */

import browser from 'webextension-polyfill'

// Интерфейсы для ответов от background script
interface BackgroundResponse {
  success?: boolean
  stats?: unknown
  data?: unknown
  error?: string
}

function isBackgroundResponse(response: unknown): response is BackgroundResponse {
  return typeof response === 'object' && response !== null
}

console.log('[WebCheck:DiagnosticTest] Starting communication diagnostic tests...')

// Интерфейс для результатов тестов
interface TestResult {
  name: string
  success: boolean
  message?: string
  data?: unknown
  duration?: number
}

// Дополнительные интерфейсы для типизации
interface SafeMessageData {
  success?: boolean
  [key: string]: unknown
}

interface TabReadyData {
  isReady?: boolean
  [key: string]: unknown
}

function isSafeMessageData(data: unknown): data is SafeMessageData {
  return typeof data === 'object' && data !== null
}

function isTabReadyData(data: unknown): data is TabReadyData {
  return typeof data === 'object' && data !== null
}

// Класс для проведения диагностических тестов
class CommunicationDiagnostic {
  private results: TestResult[] = []

  /**
   * Запуск всех тестов
   */
  async runAllTests(): Promise<TestResult[]> {
    console.log('[DIAGNOSTIC] Running all communication tests...')

    const tests = [
      () => this.testBackgroundScriptReady(),
      () => this.testUniversalMessageHandler(),
      () => this.testReliabilityManager(),
      () => this.testSafeMessaging(),
      () => this.testContentScriptInjection(),
      () => this.testElementSelectionFlow(),
      () => this.testErrorRecovery(),
    ]

    for (const test of tests) {
      try {
        await test()
      } catch (error) {
        console.error('[DIAGNOSTIC] Test failed with exception:', error)
      }

      // Пауза между тестами
      await this.delay(500)
    }

    this.printSummary()
    return this.results
  }

  /**
   * Тест готовности background script
   */
  private async testBackgroundScriptReady(): Promise<void> {
    const startTime = Date.now()

    try {
      const response = await this.sendMessageToBackground({
        type: 'get-monitoring-stats',
      })

      const duration = Date.now() - startTime

      if (response?.success) {
        this.addResult(
          'Background Script Ready',
          true,
          'Background script responds normally',
          response.stats,
          duration
        )
      } else {
        this.addResult(
          'Background Script Ready',
          false,
          'Background script not responding properly',
          response
        )
      }
    } catch (error) {
      const duration = Date.now() - startTime
      this.addResult('Background Script Ready', false, `Error: ${error}`, null, duration)
    }
  }

  /**
   * Тест универсального обработчика сообщений
   */
  private async testUniversalMessageHandler(): Promise<void> {
    const startTime = Date.now()

    try {
      const response = await this.sendMessageToBackground({
        type: 'get-reliability-stats',
      })

      const duration = Date.now() - startTime

      if (response?.success) {
        this.addResult(
          'Universal Message Handler',
          true,
          'Handler processes messages correctly',
          response.stats,
          duration
        )
      } else {
        this.addResult('Universal Message Handler', false, 'Handler not working properly', response)
      }
    } catch (error) {
      const duration = Date.now() - startTime
      this.addResult('Universal Message Handler', false, `Error: ${error}`, null, duration)
    }
  }

  /**
   * Тест менеджера надежности
   */
  private async testReliabilityManager(): Promise<void> {
    const startTime = Date.now()

    try {
      // Получаем статистику надежности
      const response = await this.sendMessageToBackground({
        type: 'get-reliability-stats',
      })

      const duration = Date.now() - startTime

      if (response?.success && response.stats) {
        const stats = response.stats as Record<string, unknown>
        this.addResult(
          'Reliability Manager',
          true,
          `Monitoring ${stats.totalTabs} tabs, ${stats.readyTabs} ready, ${stats.problemTabs} with issues`,
          stats,
          duration
        )
      } else {
        this.addResult('Reliability Manager', false, 'Manager not providing stats', response)
      }
    } catch (error) {
      const duration = Date.now() - startTime
      this.addResult('Reliability Manager', false, `Error: ${error}`, null, duration)
    }
  }

  /**
   * Тест системы безопасных сообщений
   */
  private async testSafeMessaging(): Promise<void> {
    const startTime = Date.now()

    try {
      // Получаем активную вкладку
      const tabs = await browser.tabs.query({ active: true, currentWindow: true })

      if (tabs.length === 0) {
        this.addResult('Safe Messaging', false, 'No active tab found for testing')
        return
      }

      const tabId = tabs[0].id!

      // Тестируем безопасную отправку сообщения
      const response = await this.sendMessageToBackground({
        type: 'safe-send-message',
        tabId: tabId,
        message: { action: 'ping' },
        options: { retryCount: 2, timeout: 3000 },
      })

      const duration = Date.now() - startTime

      if (response?.success && isSafeMessageData(response.data) && response.data.success) {
        this.addResult(
          'Safe Messaging',
          true,
          `Successfully pinged tab ${tabId}`,
          response.data,
          duration
        )
      } else {
        this.addResult('Safe Messaging', false, `Failed to ping tab ${tabId}`, response, duration)
      }
    } catch (error) {
      const duration = Date.now() - startTime
      this.addResult('Safe Messaging', false, `Error: ${error}`, null, duration)
    }
  }

  /**
   * Тест инжекции content script
   */
  private async testContentScriptInjection(): Promise<void> {
    const startTime = Date.now()

    try {
      // Получаем активную вкладку
      const tabs = await browser.tabs.query({ active: true, currentWindow: true })

      if (tabs.length === 0) {
        this.addResult('Content Script Injection', false, 'No active tab found for testing')
        return
      }

      const tabId = tabs[0].id!
      const tabUrl = tabs[0].url!

      // Проверяем, что это не системная страница
      if (this.isSystemUrl(tabUrl)) {
        this.addResult('Content Script Injection', false, `Cannot test on system page: ${tabUrl}`)
        return
      }

      // Проверяем готовность таба
      const response = await this.sendMessageToBackground({
        type: 'ensure-tab-ready',
        tabId: tabId,
      })

      const duration = Date.now() - startTime

      if (response?.success && isTabReadyData(response.data) && response.data.isReady) {
        this.addResult(
          'Content Script Injection',
          true,
          `Tab ${tabId} is ready`,
          response.data,
          duration
        )
      } else {
        this.addResult(
          'Content Script Injection',
          false,
          `Tab ${tabId} is not ready`,
          response,
          duration
        )
      }
    } catch (error) {
      const duration = Date.now() - startTime
      this.addResult('Content Script Injection', false, `Error: ${error}`, null, duration)
    }
  }

  /**
   * Тест потока выбора элементов
   */
  private async testElementSelectionFlow(): Promise<void> {
    const startTime = Date.now()

    try {
      // Получаем активную вкладку
      const tabs = await browser.tabs.query({ active: true, currentWindow: true })

      if (tabs.length === 0) {
        this.addResult('Element Selection Flow', false, 'No active tab found for testing')
        return
      }

      const tabId = tabs[0].id!
      const tabUrl = tabs[0].url!

      // Проверяем, что это не системная страница
      if (this.isSystemUrl(tabUrl)) {
        this.addResult('Element Selection Flow', false, `Cannot test on system page: ${tabUrl}`)
        return
      }

      // Тестируем активацию выбора элементов (НЕ активируем реально, только проверяем готовность)
      const response = await this.sendMessageToBackground({
        type: 'safe-send-message',
        tabId: tabId,
        message: { action: 'ping' },
        options: { retryCount: 1, timeout: 2000 },
      })

      const duration = Date.now() - startTime

      if (response?.success) {
        this.addResult(
          'Element Selection Flow',
          true,
          `Element selection ready for tab ${tabId}`,
          response.data,
          duration
        )
      } else {
        this.addResult(
          'Element Selection Flow',
          false,
          `Element selection not ready for tab ${tabId}`,
          response,
          duration
        )
      }
    } catch (error) {
      const duration = Date.now() - startTime
      this.addResult('Element Selection Flow', false, `Error: ${error}`, null, duration)
    }
  }

  /**
   * Тест восстановления после ошибок
   */
  private async testErrorRecovery(): Promise<void> {
    const startTime = Date.now()

    try {
      // Тестируем принудительную переинжекцию
      const response = await this.sendMessageToBackground({
        type: 'force-reinject-all',
      })

      // Ждем завершения инжекции
      await this.delay(2000)

      const duration = Date.now() - startTime

      if (response?.success) {
        this.addResult(
          'Error Recovery',
          true,
          'Force reinject completed successfully',
          response.data,
          duration
        )
      } else {
        this.addResult('Error Recovery', false, 'Force reinject failed', response, duration)
      }
    } catch (error) {
      const duration = Date.now() - startTime
      this.addResult('Error Recovery', false, `Error: ${error}`, null, duration)
    }
  }

  /**
   * Отправка сообщения в background script
   */
  private sendMessageToBackground(message: unknown): Promise<BackgroundResponse> {
    return new Promise((resolve, reject) => {
      browser.runtime
        .sendMessage(message)
        .then((response: unknown) => {
          if (isBackgroundResponse(response)) {
            resolve(response)
          } else {
            resolve({})
          }
        })
        .catch((error) => {
          reject(error)
        })
    })
  }

  /**
   * Добавление результата теста
   */
  private addResult(
    name: string,
    success: boolean,
    message?: string,
    data?: unknown,
    duration?: number
  ): void {
    const result: TestResult = { name, success, message, data, duration }
    this.results.push(result)

    const status = success ? '✅' : '❌'
    const durationStr = duration ? ` (${duration}ms)` : ''
    console.log(`[DIAGNOSTIC] ${status} ${name}${durationStr}: ${message || 'No message'}`)

    if (data && success) {
      console.log(`[DIAGNOSTIC]   Data:`, data)
    }
  }

  /**
   * Печать итогового отчета
   */
  private printSummary(): void {
    const totalTests = this.results.length
    const passedTests = this.results.filter((r) => r.success).length
    const failedTests = totalTests - passedTests

    console.log('\n[DIAGNOSTIC] === TEST SUMMARY ===')
    console.log(`[DIAGNOSTIC] Total tests: ${totalTests}`)
    console.log(`[DIAGNOSTIC] Passed: ${passedTests} ✅`)
    console.log(`[DIAGNOSTIC] Failed: ${failedTests} ❌`)
    console.log(`[DIAGNOSTIC] Success rate: ${Math.round((passedTests / totalTests) * 100)}%`)

    if (failedTests > 0) {
      console.log('\n[DIAGNOSTIC] Failed tests:')
      this.results
        .filter((r) => !r.success)
        .forEach((r) => console.log(`[DIAGNOSTIC] ❌ ${r.name}: ${r.message}`))
    }

    console.log('\n[DIAGNOSTIC] Diagnostic complete!')
  }

  /**
   * Проверка системных URL
   */
  private isSystemUrl(url: string): boolean {
    return [
      'chrome://',
      'chrome-extension://',
      'moz-extension://',
      'edge://',
      'about:',
      'data:',
      'file:',
    ].some((prefix) => url.startsWith(prefix))
  }

  /**
   * Задержка
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// Запуск диагностики при загрузке
if (typeof window !== 'undefined' && window.chrome && window.chrome.runtime) {
  // Запускаем тесты через небольшую задержку
  setTimeout(async () => {
    const diagnostic = new CommunicationDiagnostic()
    const results = await diagnostic.runAllTests()

    // Сохраняем результаты в глобальной переменной для доступа из DevTools
    ;(window as Window & { webCheckDiagnosticResults?: TestResult[] }).webCheckDiagnosticResults =
      results

    console.log('[DIAGNOSTIC] Results saved to window.webCheckDiagnosticResults')
  }, 1000)
}

// Экспорт для использования в других контекстах
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CommunicationDiagnostic }
}
