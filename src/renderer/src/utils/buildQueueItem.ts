import type { AppSettings, EncodeSettings, QueueItem, SourceAnalysis, SourceType } from '@shared/types'
import { resolveInputFps } from '@shared/fps'
import { clampTrimFrames, frameToTimecode, getTrimFrameBounds, initTrimForSource } from '@shared/trim'
import { createDefaultEncodeSettings } from '../defaults'

export function newId(): string {
  return crypto.randomUUID()
}

export function buildQueueItem(
  sourceType: SourceType,
  sourcePath: string,
  analysis: SourceAnalysis,
  defaults: EncodeSettings,
  settings: AppSettings,
  audioPath?: string
): QueueItem {
  const fresh = createDefaultEncodeSettings(sourceType, settings, analysis)
  let item: QueueItem = {
    id: newId(),
    sourceType,
    sourcePath,
    analysis,
    ...fresh,
    ...defaults,
    inputFpsMode: sourceType === 'sequence' ? 'preset' : defaults.inputFpsMode,
    inputFpsPreset: sourceType === 'sequence' ? 30 : defaults.inputFpsPreset,
    audioPath: audioPath ?? defaults.audioPath,
    status: 'pending'
  }

  if (item.trimEnabled && analysis) {
    const fps = resolveInputFps(item, analysis)
    const bounds = getTrimFrameBounds(analysis, fps)
    const { startFrame, endFrame } = clampTrimFrames(
      item.trimStartFrame,
      item.trimEndFrame,
      bounds
    )
    item = {
      ...item,
      trimStartFrame: startFrame,
      trimEndFrame: endFrame,
      trimStartTimecode: frameToTimecode(startFrame, fps, bounds.baseFrame),
      trimEndTimecode: frameToTimecode(endFrame, fps, bounds.baseFrame)
    }
  } else if (!item.trimEnabled) {
    const fps = resolveInputFps(item, analysis)
    const trim = initTrimForSource(analysis, fps)
    item = { ...item, ...trim }
  }

  return item
}
