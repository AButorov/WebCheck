export type TaskInterval = '15m' | '1h' | '3h' | '1d'

export type TaskStatus = 'changed' | 'unchanged' | 'paused'

export interface WebCheckTask {
  id: string;
  title: string;
  url: string;
  faviconUrl: string;
  selector: string;
  createdAt: number;
  status: TaskStatus;
  interval: TaskInterval;
  initialHtml: string;
  currentHtml: string;
  lastCheckedAt: number;
  lastChangedAt: number | null;
  thumbnailUrl?: string; // URL скриншота элемента для предпросмотра
  thumbnailHtml?: string; // HTML-версия миниатюры для случаев, когда скриншот недоступен
}

export interface ElementInfo {
  selector: string;
  rect: DOMRect;
  html: string;
  pageTitle: string;
  pageUrl: string;
  faviconUrl: string;
  thumbnailUrl?: string; // URL миниатюры, если создана в content script
  thumbnailHtml?: string; // HTML-версия миниатюры для более надежного отображения
}
