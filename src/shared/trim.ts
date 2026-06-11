import type { EncodeSettings, SourceAnalysis } from './types'
import { resolveInputFps } from './fps'

export type TrimInputMode = 'frames' | 'timecode'

export interface TrimSettings {
  trimEnabled: boolean
  trimMode: TrimInputMode
  trimStartFrame: number
  trimEndFrame: number
  trimStartTimecode: string
  trimEndTimecode: string
}

export interface ResolvedTrim {
  startFrame: number
  endFrame: number
  startSec: number
  endSec: number
  durationSec: number
  frameCount: number
}

export interface TrimFrameBounds {
  min: number
  max: number
  total: number
  /** Reference frame for timecode / seconds (1 for video, sequence start for sequences). */
  baseFrame: number
}

export const DEFAULT_TRIM: TrimSettings = {
  trimEnabled: false,
  trimMode: 'frames',
  trimStartFrame: 1,
  trimEndFrame: 1,
  trimStartTimecode: '00:00:00:00',
  trimEndTimecode: '00:00:00:00'
}

export function getTotalFrames(analysis: SourceAnalysis | undefined, fps: number): number {
  if (!analysis) return 1
  if (analysis.frameCount != null && analysis.frameCount > 0) return analysis.frameCount
  if (analysis.nbFrames != null && analysis.nbFrames > 0) return analysis.nbFrames
  if (analysis.duration != null && analysis.duration > 0) {
    return Math.max(1, Math.round(analysis.duration * fps))
  }
  return 1
}

export function getTrimFrameBounds(
  analysis: SourceAnalysis | undefined,
  fps: number
): TrimFrameBounds {
  if (
    analysis?.sourceType === 'sequence' &&
    analysis.sequenceStartFrame != null &&
    analysis.sequenceEndFrame != null
  ) {
    const min = analysis.sequenceStartFrame
    const max = analysis.sequenceEndFrame
    return { min, max, total: max - min + 1, baseFrame: min }
  }

  const total = getTotalFrames(analysis, fps)
  return { min: 1, max: total, total, baseFrame: 1 }
}

/** Frame index → seconds relative to trim base frame at source FPS */
export function frameToSeconds(frame: number, fps: number, baseFrame = 1): number {
  return Math.max(0, (frame - baseFrame) / fps)
}

/** Seconds → SMPTE-style HH:MM:SS:FF (FF = frame within second, 0..round(fps)-1) */
export function secondsToTimecode(seconds: number, fps: number): string {
  const fpsInt = Math.max(1, Math.round(fps))
  const totalFrames = Math.max(0, Math.round(seconds * fps))
  const ff = totalFrames % fpsInt
  const totalSeconds = Math.floor(totalFrames / fpsInt)
  const ss = totalSeconds % 60
  const mm = Math.floor(totalSeconds / 60) % 60
  const hh = Math.floor(totalSeconds / 3600)
  const pad = (n: number, w = 2) => String(n).padStart(w, '0')
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}:${pad(ff)}`
}

export function frameToTimecode(frame: number, fps: number, baseFrame = 1): string {
  return secondsToTimecode(frameToSeconds(frame, fps, baseFrame), fps)
}

/** Parse HH:MM:SS:FF or HH:MM:SS(.mmm) → seconds */
export function parseTimecode(tc: string, fps: number): number {
  const trimmed = tc.trim()
  if (!trimmed) return 0

  const parts = trimmed.split(':')
  if (parts.length === 4) {
    const [h, m, s, ff] = parts.map((p) => parseInt(p, 10))
    const fpsInt = Math.max(1, Math.round(fps))
    if ([h, m, s, ff].some((n) => Number.isNaN(n))) return 0
    return h * 3600 + m * 60 + s + ff / fpsInt
  }

  if (parts.length === 3) {
    const [h, m, sPart] = parts
    const s = parseFloat(sPart)
    if ([h, m].some((p) => Number.isNaN(parseInt(p, 10))) || Number.isNaN(s)) return 0
    return parseInt(h, 10) * 3600 + parseInt(m, 10) * 60 + s
  }

  const n = parseFloat(trimmed)
  return Number.isNaN(n) ? 0 : n
}

export function secondsToFrame(seconds: number, fps: number, baseFrame = 1): number {
  return Math.max(baseFrame, Math.floor(seconds * fps) + baseFrame)
}

export function timecodeToFrame(tc: string, fps: number, baseFrame = 1): number {
  return secondsToFrame(parseTimecode(tc, fps), fps, baseFrame)
}

export function clampTrimFrames(
  start: number,
  end: number,
  bounds: Pick<TrimFrameBounds, 'min' | 'max'>
): { startFrame: number; endFrame: number } {
  const startFrame = Math.min(Math.max(bounds.min, Math.floor(start)), bounds.max)
  const endFrame = Math.min(Math.max(startFrame, Math.floor(end)), bounds.max)
  return { startFrame, endFrame }
}

export function resolveTrimFromSettings(
  settings: TrimSettings & Pick<EncodeSettings, 'inputFpsMode' | 'inputFpsPreset' | 'inputFpsCustom'>,
  analysis: SourceAnalysis | undefined
): ResolvedTrim | null {
  if (!settings.trimEnabled) return null

  const fps = resolveInputFps(settings, analysis)
  const bounds = getTrimFrameBounds(analysis, fps)

  let startFrame: number
  let endFrame: number

  if (settings.trimMode === 'timecode') {
    startFrame = timecodeToFrame(settings.trimStartTimecode, fps, bounds.baseFrame)
    endFrame = timecodeToFrame(settings.trimEndTimecode, fps, bounds.baseFrame)
  } else {
    startFrame = settings.trimStartFrame
    endFrame = settings.trimEndFrame
  }

  const clamped = clampTrimFrames(startFrame, endFrame, bounds)
  const frameCount = clamped.endFrame - clamped.startFrame + 1
  const startSec = frameToSeconds(clamped.startFrame, fps, bounds.baseFrame)
  const durationSec = Math.max(0.001, frameCount / fps)
  const endSec = startSec + durationSec

  return {
    startFrame: clamped.startFrame,
    endFrame: clamped.endFrame,
    startSec,
    endSec,
    durationSec,
    frameCount
  }
}

export function initTrimForSource(
  analysis: SourceAnalysis | undefined,
  fps: number
): TrimSettings {
  const bounds = getTrimFrameBounds(analysis, fps)
  return {
    trimEnabled: false,
    trimMode: 'frames',
    trimStartFrame: bounds.min,
    trimEndFrame: bounds.max,
    trimStartTimecode: '00:00:00:00',
    trimEndTimecode: frameToTimecode(bounds.max, fps, bounds.baseFrame)
  }
}
