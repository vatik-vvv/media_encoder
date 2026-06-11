import { useEffect, useState } from 'react'
import type { EncodeSettings, SourceAnalysis } from '@shared/types'
import { resolveInputFps } from '@shared/fps'
import {
  clampTrimFrames,
  frameToTimecode,
  getTrimFrameBounds,
  timecodeToFrame,
  type TrimInputMode
} from '@shared/trim'

interface Props {
  settings: Pick<
    EncodeSettings,
    | 'trimEnabled'
    | 'trimMode'
    | 'trimStartFrame'
    | 'trimEndFrame'
    | 'trimStartTimecode'
    | 'trimEndTimecode'
    | 'inputFpsMode'
    | 'inputFpsPreset'
    | 'inputFpsCustom'
  >
  analysis?: SourceAnalysis
  onChange: (patch: Partial<EncodeSettings>) => void
  disabled?: boolean
}

export default function TrimControl({
  settings,
  analysis,
  onChange,
  disabled
}: Props): JSX.Element {
  const fps = resolveInputFps(settings, analysis)
  const bounds = getTrimFrameBounds(analysis, fps)
  const totalTc = frameToTimecode(bounds.max, fps, bounds.baseFrame)
  const isSequence = analysis?.sourceType === 'sequence'

  const [startFrameDraft, setStartFrameDraft] = useState<string | null>(null)
  const [endFrameDraft, setEndFrameDraft] = useState<string | null>(null)
  const [startTcDraft, setStartTcDraft] = useState<string | null>(null)
  const [endTcDraft, setEndTcDraft] = useState<string | null>(null)

  useEffect(() => {
    setStartFrameDraft(null)
    setEndFrameDraft(null)
    setStartTcDraft(null)
    setEndTcDraft(null)
  }, [settings.trimStartFrame, settings.trimEndFrame, settings.trimStartTimecode, settings.trimEndTimecode])

  const commitFrames = (start: number, end: number): void => {
    const { startFrame, endFrame } = clampTrimFrames(start, end, bounds)
    onChange({
      trimStartFrame: startFrame,
      trimEndFrame: endFrame,
      trimStartTimecode: frameToTimecode(startFrame, fps, bounds.baseFrame),
      trimEndTimecode: frameToTimecode(endFrame, fps, bounds.baseFrame)
    })
  }

  const commitTimecodes = (startTc: string, endTc: string): void => {
    const s = timecodeToFrame(startTc, fps, bounds.baseFrame)
    const e = timecodeToFrame(endTc, fps, bounds.baseFrame)
    commitFrames(s, e)
  }

  return (
    <div className="field trim-control">
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={settings.trimEnabled}
          disabled={disabled}
          onChange={(e) => {
            if (e.target.checked) {
              commitFrames(bounds.min, bounds.max)
              onChange({ trimEnabled: true })
            } else {
              onChange({ trimEnabled: false })
            }
          }}
        />
        Trim input ({bounds.total} frames @ {fps} fps)
      </label>

      {settings.trimEnabled && (
        <>
          <div className="chip-group" style={{ marginTop: 8 }}>
            <button
              type="button"
              className={`chip ${settings.trimMode === 'frames' ? 'active' : ''}`}
              disabled={disabled}
              onClick={() => onChange({ trimMode: 'frames' as TrimInputMode })}
            >
              Frames
            </button>
            <button
              type="button"
              className={`chip ${settings.trimMode === 'timecode' ? 'active' : ''}`}
              disabled={disabled}
              onClick={() => onChange({ trimMode: 'timecode' as TrimInputMode })}
            >
              Timecode
            </button>
          </div>
          <p className="hint">
            Timecode uses source FPS (HH:MM:SS:FF).
            {isSequence
              ? ` Frame numbers match sequence filenames (${bounds.min}–${bounds.max}).`
              : ' Frame 1 = first frame.'}
          </p>

          {settings.trimMode === 'frames' ? (
            <div className="row" style={{ marginTop: 8 }}>
              <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                <label>Start frame</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={startFrameDraft ?? String(settings.trimStartFrame)}
                  disabled={disabled}
                  onChange={(e) => setStartFrameDraft(e.target.value)}
                  onBlur={() => {
                    const raw = startFrameDraft ?? String(settings.trimStartFrame)
                    setStartFrameDraft(null)
                    const n = parseInt(raw, 10)
                    if (!Number.isNaN(n)) commitFrames(n, settings.trimEndFrame)
                  }}
                />
              </div>
              <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                <label>End frame</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={endFrameDraft ?? String(settings.trimEndFrame)}
                  disabled={disabled}
                  onChange={(e) => setEndFrameDraft(e.target.value)}
                  onBlur={() => {
                    const raw = endFrameDraft ?? String(settings.trimEndFrame)
                    setEndFrameDraft(null)
                    const n = parseInt(raw, 10)
                    if (!Number.isNaN(n)) commitFrames(settings.trimStartFrame, n)
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="row" style={{ marginTop: 8 }}>
              <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                <label>Start timecode</label>
                <input
                  type="text"
                  value={startTcDraft ?? settings.trimStartTimecode}
                  placeholder="00:00:00:00"
                  disabled={disabled}
                  onChange={(e) => setStartTcDraft(e.target.value)}
                  onBlur={() => {
                    const raw = startTcDraft ?? settings.trimStartTimecode
                    setStartTcDraft(null)
                    commitTimecodes(raw, settings.trimEndTimecode)
                  }}
                />
              </div>
              <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                <label>End timecode</label>
                <input
                  type="text"
                  value={endTcDraft ?? settings.trimEndTimecode}
                  placeholder={totalTc}
                  disabled={disabled}
                  onChange={(e) => setEndTcDraft(e.target.value)}
                  onBlur={() => {
                    const raw = endTcDraft ?? settings.trimEndTimecode
                    setEndTcDraft(null)
                    commitTimecodes(settings.trimStartTimecode, raw)
                  }}
                />
              </div>
            </div>
          )}

          <p className="hint">
            Range: {settings.trimStartFrame}–{settings.trimEndFrame} (
            {settings.trimEndFrame - settings.trimStartFrame + 1} frames) ·{' '}
            {settings.trimStartTimecode} → {settings.trimEndTimecode}
          </p>
        </>
      )}
    </div>
  )
}
