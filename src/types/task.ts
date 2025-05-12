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
}
