export type TaskInterval = '10s' | '15m' | '1h' | '3h' | '1d'

export type TaskStatus = 'changed' | 'unchanged' | 'paused'

/**
 * Интерфейс задачи отслеживания изменений
 */
export interface WebCheckTask {
  /** Уникальный идентификатор задачи */
  id: string;
  /** Название задачи для отображения в интерфейсе */
  title: string;
  /** URL страницы, на которой находится отслеживаемый элемент */
  url: string;
  /** URL иконки сайта для визуальной идентификации */
  faviconUrl: string;
  /** CSS селектор отслеживаемого элемента */
  selector: string;
  /** Время создания задачи (timestamp) */
  createdAt: number;
  /** Текущий статус задачи */
  status: TaskStatus;
  /** Интервал проверки */
  interval: TaskInterval;
  /** Исходный HTML элемента (сохраняется при создании задачи) */
  initialHtml: string;
  /** Текущий HTML элемента (обновляется при каждой проверке) */
  currentHtml: string;
  /** Время последней проверки (timestamp) */
  lastCheckedAt: number;
  /** Время последнего обнаруженного изменения (timestamp или null) */
  lastChangedAt: number | null;
  /** URL скриншота элемента для предпросмотра (опционально) */
  thumbnailUrl?: string;
  /** HTML-версия миниатюры для случаев, когда скриншот недоступен (опционально) */
  thumbnailHtml?: string;
  /** Время следующей запланированной проверки (timestamp) */
  nextCheckAt?: number;
  /** Количество выполненных проверок */
  checkCount?: number;
  /** Количество обнаруженных изменений */
  changeCount?: number;
  /** Флаг ошибки при последней проверке */
  hasError?: boolean;
  /** Текст ошибки при последней проверке */
  errorMessage?: string;
}

/**
 * Информация о выбранном элементе
 */
export interface ElementInfo {
  /** CSS селектор элемента */
  selector: string;
  /** Координаты и размеры элемента на странице */
  rect: DOMRect;
  /** HTML содержимое элемента */
  html: string;
  /** Заголовок страницы */
  pageTitle: string;
  /** URL страницы */
  pageUrl: string;
  /** URL иконки сайта */
  faviconUrl: string;
  /** URL миниатюры элемента (опционально) */
  thumbnailUrl?: string;
  /** HTML-версия миниатюры (опционально) */
  thumbnailHtml?: string;
}
