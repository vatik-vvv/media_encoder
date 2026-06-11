import { COMPRESSION_MAP, DEFAULT_SETTINGS, type AppSettings, type EncodeSettings } from './types'
import { normalizeEncodeSettings, normalizeProResProfile } from './encodeSettingsHelpers'

export function buildDefaultEncodeSettings(settings = DEFAULT_SETTINGS): EncodeSettings {
  const level = settings.defaultCompressionLevel
  const comp = COMPRESSION_MAP[level]
  return normalizeEncodeSettings({
    outputFormat: settings.defaultOutputFormat,
    proResProfile: settings.defaultProResProfile,
    hapVariant: settings.encodeDefaults?.hapVariant ?? 'hap',
    inputFpsMode: 'auto',
    inputFpsPreset: 30,
    inputFpsCustom: 30,
    outputFpsMode: 'match',
    outputFpsPreset: settings.defaultOutputFpsPreset,
    outputFpsCustom: 30,
    trimAudioToVideo: true,
    resizeMode: 'original',
    resizePercent: 100,
    compressionLevel: level,
    crf: settings.defaultCrf,
    videoRateControl: settings.encodeDefaults?.videoRateControl,
    videoBitrateMbps: settings.encodeDefaults?.videoBitrateMbps,
    trimEnabled: false,
    trimMode: 'frames',
    trimStartFrame: 1,
    trimEndFrame: 1,
    trimStartTimecode: '00:00:00:00',
    trimEndTimecode: '00:00:00:00'
  })
}

export function normalizeAppSettings(partial?: Partial<AppSettings>): AppSettings {
  const base = { ...DEFAULT_SETTINGS, ...partial }
  return {
    outputTemplate: base.outputTemplate,
    defaultOutputFormat: base.defaultOutputFormat ?? 'mp4_h264',
    defaultProResProfile: normalizeProResProfile(base.defaultProResProfile),
    defaultCompressionLevel: base.defaultCompressionLevel,
    defaultCrf: base.defaultCrf,
    defaultOutputFpsPreset: base.defaultOutputFpsPreset,
    windowBounds: base.windowBounds,
    queuePanePercent: base.queuePanePercent ?? 68,
    encodeDefaults: normalizeEncodeSettings(
      base.encodeDefaults ?? buildDefaultEncodeSettings(base)
    )
  }
}
