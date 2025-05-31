// Типы для Chrome Extension API
declare global {
  namespace chrome {
    namespace runtime {
      interface MessageSender {
        tab?: chrome.tabs.Tab;
        frameId?: number;
        id?: string;
        url?: string;
        tlsChannelId?: string;
      }

      function sendMessage(message: any): Promise<any>;
      function sendMessage(extensionId: string, message: any): Promise<any>;
      
      const onMessage: {
        addListener(callback: (message: any, sender: MessageSender, sendResponse: (response?: any) => void) => boolean | void): void;
      };
      
      const onInstalled: {
        addListener(callback: (details: { reason: string }) => void): void;
      };
      
      const onStartup: {
        addListener(callback: () => void): void;
      };
      
      function getURL(path: string): string;
    }

    namespace tabs {
      interface Tab {
        id?: number;
        url?: string;
        title?: string;
        windowId?: number;
      }

      function get(tabId: number): Promise<Tab>;
      function sendMessage(tabId: number, message: any): Promise<any>;
      function query(queryInfo: { active?: boolean; currentWindow?: boolean }): Promise<Tab[]>;
      function update(tabId: number, updateProperties: { active?: boolean }): Promise<Tab>;
    }

    namespace windows {
      function update(windowId: number, updateInfo: { focused?: boolean }): Promise<any>;
    }

    namespace scripting {
      function executeScript(injection: {
        target: { tabId: number };
        files?: string[];
        func?: () => void;
      }): Promise<any>;
    }

    namespace storage {
      namespace local {
        function get(keys?: string | string[] | { [key: string]: any }): Promise<{ [key: string]: any }>;
        function set(items: { [key: string]: any }): Promise<void>;
        function remove(keys: string | string[]): Promise<void>;
      }
    }

    namespace offscreen {
      enum Reason {
        DOM_SCRAPING = 'DOM_SCRAPING'
      }

      function createDocument(parameters: {
        url: string;
        reasons: Reason[];
        justification: string;
      }): Promise<void>;

      function closeDocument(): Promise<void>;
    }
  }

  // Переменная chrome доступна глобально в Chrome extensions
  const chrome: typeof chrome;
}

export {};
