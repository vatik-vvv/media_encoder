import { applyFormatToOutputPath, ensureOutputExtension } from '@shared/outputPath'
import type { EncodeSettings, QueueItem } from '@shared/types'
import type { SourceAnalysis } from '@shared/types'
import FramerateSelect from './FramerateSelect'
import CompressionControl from './CompressionControl'
import FormatControl from './FormatControl'
import TrimControl from './TrimControl'
import ResizeControl from './ResizeControl'

interface Props {
  item: EncodeSettings & {
    sourceType: QueueItem['sourceType']
    audioPath?: string
    outputPathOverride?: string
    resizePercent?: number
  }
  analysis?: SourceAnalysis
  onChange: (patch: Partial<QueueItem>) => void
  showOutputOverride?: boolean
}

export default function EncodeSettingsForm({
  item,
  analysis,
  onChange,
  showOutputOverride = true
}: Props): JSX.Element {
  const isSequence = item.sourceType === 'sequence'
  const sourceMayHaveAlpha = isSequence || analysis?.sourceExt === 'png' || analysis?.sourceExt === 'mov'

  const handleChange = (patch: Partial<QueueItem>): void => {
    if (patch.outputFormat && patch.outputFormat !== item.outputFormat) {
      const next: Partial<QueueItem> = { ...patch }
      if (item.outputFileName) {
        next.outputFileName = ensureOutputExtension(item.outputFileName, patch.outputFormat)
      }
      if (item.outputPathOverride) {
        next.outputPathOverride = applyFormatToOutputPath(item.outputPathOverride, patch.outputFormat)
      }
      onChange(next)
      return
    }
    onChange(patch)
  }

  return (
    <div className="encode-settings-form">
      <FormatControl
        outputFormat={item.outputFormat}
        proResProfile={item.proResProfile}
        hapVariant={item.hapVariant}
        sourceMayHaveAlpha={sourceMayHaveAlpha}
        onChange={handleChange}
      />

      <FramerateSelect
        label="Input FPS"
        mode={item.inputFpsMode}
        preset={item.inputFpsPreset}
        custom={item.inputFpsCustom}
        allowAuto={!isSequence}
        onModeChange={(m) => handleChange({ inputFpsMode: m as EncodeSettings['inputFpsMode'] })}
        onPresetChange={(p) => handleChange({ inputFpsPreset: p, inputFpsMode: 'preset' })}
        onCustomChange={(v) => handleChange({ inputFpsCustom: v })}
        detectedFps={analysis?.detectedInputFps}
      />

      <TrimControl settings={item} analysis={analysis} onChange={onChange} />

      <FramerateSelect
        label="Output FPS"
        mode={item.outputFpsMode}
        preset={item.outputFpsPreset}
        custom={item.outputFpsCustom}
        allowMatch
        onModeChange={(m) => onChange({ outputFpsMode: m as EncodeSettings['outputFpsMode'] })}
        onPresetChange={(p) => onChange({ outputFpsPreset: p, outputFpsMode: 'preset' })}
        onCustomChange={(v) => onChange({ outputFpsCustom: v })}
      />

      <div className="field">
        <label>External audio</label>
        <div className="row">
          <input type="text" readOnly value={item.audioPath ?? ''} placeholder="None" />
          <button
            type="button"
            className="secondary"
            onClick={async () => {
              const p = await window.mencoder.openAudioFile()
              if (p) onChange({ audioPath: p })
            }}
          >
            Browse
          </button>
          {item.audioPath && (
            <button type="button" className="secondary" onClick={() => onChange({ audioPath: undefined })}>
              Clear
            </button>
          )}
        </div>
        {item.audioPath && (
          <label className="checkbox-label" style={{ marginTop: 8 }}>
            <input
              type="checkbox"
              checked={item.trimAudioToVideo ?? true}
              onChange={(e) => onChange({ trimAudioToVideo: e.target.checked })}
            />
            Trim audio to video stream
          </label>
        )}
        {item.audioPath && (
          <p className="hint">
            If the audio file is longer than the video, only the audio is shortened; the video length
            is unchanged.
          </p>
        )}
      </div>

      <ResizeControl
        resizeMode={item.resizeMode}
        resizePercent={item.resizePercent ?? 100}
        onChange={onChange}
      />

      {item.outputFormat === 'mp4_h264' && (
        <CompressionControl
          level={item.compressionLevel}
          crf={item.crf}
          videoRateControl={item.videoRateControl ?? 'crf'}
          videoBitrateMbps={item.videoBitrateMbps ?? 12}
          onChange={onChange}
        />
      )}

      {showOutputOverride && (
        <div className="field">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={item.outputPathOverride != null}
              onChange={async (e) => {
                if (!e.target.checked) onChange({ outputPathOverride: undefined })
                else {
                  const p = await window.mencoder.saveOutputFile(item.outputFormat)
                  if (p) onChange({ outputPathOverride: p })
                }
              }}
            />
            Custom output path
          </label>
          {item.outputPathOverride != null && (
            <div className="row" style={{ marginTop: 8 }}>
              <input type="text" value={item.outputPathOverride} readOnly />
              <button
                type="button"
                className="secondary"
                onClick={async () => {
                  const p = await window.mencoder.saveOutputFile(item.outputFormat)
                  if (p) onChange({ outputPathOverride: p })
                }}
              >
                Browse
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
