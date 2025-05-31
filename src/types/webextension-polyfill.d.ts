// Type declarations for webextension-polyfill
declare module 'webextension-polyfill' {
  interface MessageSender {
    tab?: any;
    frameId?: number;
    id?: string;
    url?: string;
    tlsChannelId?: string;
  }
    
  interface RuntimeStatic {
    sendMessage: (message: any) => Promise<any>;
    onMessage: {
      addListener: (callback: any) => void;
      removeListener: (callback: any) => void;
    };
    onInstalled: {
      addListener: (callback: any) => void;
      removeListener: (callback: any) => void;
    };
  }
    
  interface TabsStatic {
    query: (queryInfo: any) => Promise<any[]>;
    sendMessage: (tabId: number, message: any) => Promise<any>;
    executeScript: (details: any) => Promise<any>;
    get: (tabId: number) => Promise<any>;
  }
    
  interface StorageStatic {
    local: {
      get: (keys?: any) => Promise<any>;
      set: (items: any) => Promise<void>;
      remove: (keys: any) => Promise<void>;
      clear: () => Promise<void>;
    };
  }
    
  interface AlarmsStatic {
    create: (name: string, alarmInfo: any) => void;
    clear: (name?: string) => Promise<boolean>;
    onAlarm: {
      addListener: (callback: any) => void;
      removeListener: (callback: any) => void;
    };
  }
    
  interface OffscreenStatic {
    createDocument: (parameters: any) => Promise<void>;
    closeDocument: () => Promise<void>;
    hasDocument: () => Promise<boolean>;
  }
    
  interface ScriptingStatic {
    executeScript: (injection: any) => Promise<any>;
  }

  interface BrowserStatic {
    runtime: RuntimeStatic;
    tabs: TabsStatic;
    storage: StorageStatic;
    alarms: AlarmsStatic;
    offscreen: OffscreenStatic;
    scripting: ScriptingStatic;
  }
  
  const browser: BrowserStatic;
  export = browser;
  export { MessageSender };
}
