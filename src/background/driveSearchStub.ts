/**
 * Заглушка для google_drive_search
 * TODO: Интегрировать реальный API когда будет доступен
 */
import browser from 'webextension-polyfill'

export async function google_drive_search(params: any): Promise<any> {
  console.warn('[DRIVE SEARCH] Google Drive search is not implemented yet')
  return {
    success: false,
    error: 'Google Drive search is not available in this version',
    results: []
  }
}
