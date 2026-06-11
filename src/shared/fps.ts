import type {
  EncodeSettings,
  FpsMode,
  FpsPreset,
  OutputFpsMode,
  SourceAnalysis
} from './types'

export function resolveInputFps(
  settings: Pick<EncodeSettings, 'inputFpsMode' | 'inputFpsPreset' | 'inputFpsCustom'>,
  analysis?: SourceAnalysis
): number {
  if (settings.inputFpsMode === 'auto') {
    return analysis?.detectedInputFps ?? 30
  }
  if (settings.inputFpsMode === 'preset') {
    return settings.inputFpsPreset
  }
  return settings.inputFpsCustom || 30
}

export function resolveOutputFps(
  settings: Pick<
    EncodeSettings,
    'outputFpsMode' | 'outputFpsPreset' | 'outputFpsCustom' | 'inputFpsMode' | 'inputFpsPreset' | 'inputFpsCustom'
  >,
  analysis?: SourceAnalysis
): number {
  if (settings.outputFpsMode === 'match') {
    return resolveInputFps(settings, analysis)
  }
  if (settings.outputFpsMode === 'preset') {
    return settings.outputFpsPreset
  }
  return settings.outputFpsCustom || 30
}

export function defaultInputFpsMode(sourceType: 'video' | 'sequence'): FpsMode {
  return sourceType === 'video' ? 'auto' : 'preset'
}

export function defaultInputFpsPreset(sourceType: 'video' | 'sequence'): FpsPreset {
  return sourceType === 'sequence' ? 30 : 30
}
