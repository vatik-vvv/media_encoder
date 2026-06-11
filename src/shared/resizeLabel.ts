import type { EncodeSettings } from './types'

export function formatResizeLabel(item: Pick<EncodeSettings, 'resizeMode' | 'resizePercent' | 'resizeWidth' | 'resizeHeight'>): string {
  switch (item.resizeMode) {
    case 'original':
      return '100%'
    case 'percent':
      return `${item.resizePercent ?? 100}%`
    case 'maxWidth':
      return item.resizeWidth ? `W≤${item.resizeWidth}` : 'Max W'
    case 'maxHeight':
      return item.resizeHeight ? `H≤${item.resizeHeight}` : 'Max H'
    case 'exact':
      return item.resizeWidth && item.resizeHeight
        ? `${item.resizeWidth}×${item.resizeHeight}`
        : 'Exact'
    default:
      return '—'
  }
}
