import { FPS_PRESETS, type FpsMode, type FpsPreset, type OutputFpsMode } from '@shared/types'

interface Props {
  label: string
  mode: FpsMode | OutputFpsMode
  preset: FpsPreset
  custom: number
  onModeChange: (mode: FpsMode | OutputFpsMode) => void
  onPresetChange: (preset: FpsPreset) => void
  onCustomChange: (value: number) => void
  allowAuto?: boolean
  allowMatch?: boolean
  detectedFps?: number
  disabled?: boolean
}

export default function FramerateSelect({
  label,
  mode,
  preset,
  custom,
  onModeChange,
  onPresetChange,
  onCustomChange,
  allowAuto,
  allowMatch,
  detectedFps,
  disabled
}: Props): JSX.Element {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="chip-group">
        {allowAuto && (
          <button
            type="button"
            className={`chip ${mode === 'auto' ? 'active' : ''}`}
            disabled={disabled}
            onClick={() => onModeChange('auto')}
          >
            Auto (from file)
          </button>
        )}
        {allowMatch && (
          <button
            type="button"
            className={`chip ${mode === 'match' ? 'active' : ''}`}
            disabled={disabled}
            onClick={() => onModeChange('match')}
          >
            Match input
          </button>
        )}
        {FPS_PRESETS.map((fps) => (
          <button
            key={fps}
            type="button"
            className={`chip ${mode === 'preset' && preset === fps ? 'active' : ''}`}
            disabled={disabled}
            onClick={() => {
              onModeChange(allowMatch ? 'preset' : 'preset')
              onPresetChange(fps)
            }}
          >
            {fps}
          </button>
        ))}
        <button
          type="button"
          className={`chip ${mode === 'custom' ? 'active' : ''}`}
          disabled={disabled}
          onClick={() => onModeChange('custom')}
        >
          Custom
        </button>
      </div>
      {mode === 'auto' && detectedFps != null && (
        <p className="hint">Detected: {detectedFps} fps</p>
      )}
      {mode === 'custom' && (
        <input
          type="number"
          min={1}
          max={240}
          step={0.001}
          value={custom}
          disabled={disabled}
          onChange={(e) => onCustomChange(parseFloat(e.target.value) || 30)}
          style={{ marginTop: 8, maxWidth: 120 }}
        />
      )}
    </div>
  )
}
