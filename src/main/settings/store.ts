import Store from 'electron-store'
import { normalizeAppSettings } from '@shared/settingsHelpers'
import { DEFAULT_SETTINGS, type AppSettings } from '@shared/types'

const store = new Store<AppSettings>({
  name: 'media-encoder-settings',
  defaults: DEFAULT_SETTINGS
})

export function getSettings(): AppSettings {
  return normalizeAppSettings({
    outputTemplate: store.get('outputTemplate'),
    defaultOutputFormat: store.get('defaultOutputFormat'),
    defaultProResProfile: store.get('defaultProResProfile'),
    defaultCompressionLevel: store.get('defaultCompressionLevel'),
    defaultCrf: store.get('defaultCrf'),
    defaultOutputFpsPreset: store.get('defaultOutputFpsPreset'),
    windowBounds: store.get('windowBounds'),
    queuePanePercent: store.get('queuePanePercent'),
    encodeDefaults: store.get('encodeDefaults')
  })
}

export function saveWindowBounds(bounds: AppSettings['windowBounds']): void {
  if (bounds) store.set('windowBounds', bounds)
}

export function setSettings(partial: Partial<AppSettings>): AppSettings {
  for (const [key, value] of Object.entries(partial)) {
    if (value !== undefined) {
      store.set(key as keyof AppSettings, value)
    }
  }
  return getSettings()
}
