import type { EncodeSettings } from '@shared/types'
import FramerateSelect from './FramerateSelect'
import CompressionControl from './CompressionControl'
import FormatControl from './FormatControl'
import ResizeControl from './ResizeControl'

interface Props {
  defaults: EncodeSettings
  onChange: (patch: Partial<EncodeSettings>) => void
}

export default function EncodeDefaultsPanel({ defaults, onChange }: Props): JSX.Element {
  return (
    <div className="encode-defaults-panel">
      <h3 className="settings-section-title">Default encode options (new imports)</h3>
      <p className="hint">
        Applied when adding sources unless you change settings per item in the import dialog.
      </p>
      <FormatControl
        outputFormat={defaults.outputFormat}
        proResProfile={defaults.proResProfile}
        hapVariant={defaults.hapVariant}
        onChange={onChange}
      />
      <div className="grid-2">
        <div>
          <FramerateSelect
            label="Input FPS (video: Auto)"
            mode={defaults.inputFpsMode}
            preset={defaults.inputFpsPreset}
            custom={defaults.inputFpsCustom}
            allowAuto
            onModeChange={(m) => onChange({ inputFpsMode: m as EncodeSettings['inputFpsMode'] })}
            onPresetChange={(p) => onChange({ inputFpsPreset: p, inputFpsMode: 'preset' })}
            onCustomChange={(v) => onChange({ inputFpsCustom: v })}
          />
          <FramerateSelect
            label="Output FPS"
            mode={defaults.outputFpsMode}
            preset={defaults.outputFpsPreset}
            custom={defaults.outputFpsCustom}
            allowMatch
            onModeChange={(m) => onChange({ outputFpsMode: m as EncodeSettings['outputFpsMode'] })}
            onPresetChange={(p) => onChange({ outputFpsPreset: p, outputFpsMode: 'preset' })}
            onCustomChange={(v) => onChange({ outputFpsCustom: v })}
          />
        </div>
        <div>
          <ResizeControl
            resizeMode={defaults.resizeMode}
            resizePercent={defaults.resizePercent ?? 100}
            onChange={onChange}
          />
          {defaults.outputFormat === 'mp4_h264' && (
            <CompressionControl
              level={defaults.compressionLevel}
              crf={defaults.crf}
              videoRateControl={defaults.videoRateControl ?? 'crf'}
              videoBitrateMbps={defaults.videoBitrateMbps ?? 12}
              onChange={onChange}
            />
          )}
        </div>
      </div>
    </div>
  )
}
