/**
 * Заглушка для google_drive_search
 * TODO: Интегрировать реальный API когда будет доступен
 */

interface DriveSearchResult {
  success: boolean
  error?: string
  results: unknown[]
}

export async function google_drive_search(): Promise<DriveSearchResult> {
  console.warn('[DRIVE SEARCH] Google Drive search is not implemented yet')
  return {
    success: false,
    error: 'Google Drive search is not available in this version',
    results: [],
  }
}
