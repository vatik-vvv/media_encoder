import { normalizeEncodeSettings } from '@shared/encodeSettingsHelpers'
import {
  COMPRESSION_MAP,
  DEFAULT_SETTINGS,
  type CompressionLevel,
  type EncodeSettings,
  type SourceAnalysis,
  type SourceType
} from '@shared/types'
import { defaultInputFpsMode, defaultInputFpsPreset, resolveInputFps } from '@shared/fps'
import { initTrimForSource } from '@shared/trim'

export function createDefaultEncodeSettings(
  sourceType: SourceType = 'video',
  settings = DEFAULT_SETTINGS,
  analysis?: SourceAnalysis
): EncodeSettings {
  const level = settings.defaultCompressionLevel as CompressionLevel
  const base = normalizeEncodeSettings({
    outputFormat: settings.defaultOutputFormat,
    proResProfile: settings.defaultProResProfile,
    hapVariant: settings.encodeDefaults?.hapVariant ?? 'hap',
    inputFpsMode: defaultInputFpsMode(sourceType),
    inputFpsPreset: defaultInputFpsPreset(sourceType),
    inputFpsCustom: 30,
    outputFpsMode: 'match',
    outputFpsPreset: settings.defaultOutputFpsPreset,
    outputFpsCustom: 30,
    trimAudioToVideo: true,
    resizeMode: 'original',
    resizePercent: 100,
    compressionLevel: level,
    crf: settings.defaultCrf ?? COMPRESSION_MAP[level].defaultCrf,
    videoRateControl: settings.encodeDefaults?.videoRateControl,
    videoBitrateMbps: settings.encodeDefaults?.videoBitrateMbps,
    trimEnabled: false,
    trimMode: 'frames',
    trimStartFrame: 1,
    trimEndFrame: 1,
    trimStartTimecode: '00:00:00:00',
    trimEndTimecode: '00:00:00:00'
  })
  if (analysis) {
    const fps = resolveInputFps(base, analysis)
    const trim = initTrimForSource(analysis, fps)
    return { ...base, ...trim }
  }
  return base
}
