import type { EncodeSettings } from '@shared/types'

interface Props {
  resizeMode: EncodeSettings['resizeMode']
  resizePercent: number
  onChange: (patch: Partial<EncodeSettings>) => void
  disabled?: boolean
}

export default function ResizeControl({
  resizeMode,
  resizePercent,
  onChange,
  disabled
}: Props): JSX.Element {
  const isCustom =
    resizeMode === 'percent' && resizePercent !== 100 && resizePercent !== 50

  const setPercent = (percent: number, custom = false): void => {
    if (percent >= 100) {
      onChange({ resizeMode: 'original', resizePercent: 100 })
      return
    }
    onChange({
      resizeMode: 'percent',
      resizePercent: Math.min(100, Math.max(1, Math.round(percent)))
    })
  }

  return (
    <div className="field">
      <label>Resize</label>
      <div className="chip-group">
        <button
          type="button"
          className={`chip ${resizeMode === 'original' ? 'active' : ''}`}
          disabled={disabled}
          onClick={() => onChange({ resizeMode: 'original', resizePercent: 100 })}
        >
          100%
        </button>
        <button
          type="button"
          className={`chip ${resizeMode === 'percent' && resizePercent === 50 ? 'active' : ''}`}
          disabled={disabled}
          onClick={() => setPercent(50)}
        >
          50%
        </button>
        <button
          type="button"
          className={`chip ${isCustom ? 'active' : ''}`}
          disabled={disabled}
          onClick={() => onChange({ resizeMode: 'percent', resizePercent: resizePercent || 75 })}
        >
          Custom %
        </button>
      </div>
      {(resizeMode === 'percent' && resizePercent !== 100) || isCustom ? (
        <div className="row" style={{ marginTop: 8, alignItems: 'center' }}>
          <input
            type="number"
            min={1}
            max={100}
            value={resizePercent}
            disabled={disabled}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10)
              if (!Number.isNaN(n)) setPercent(n, true)
            }}
            style={{ maxWidth: 100 }}
          />
          <span className="hint" style={{ margin: 0 }}>
            % of source width/height
          </span>
        </div>
      ) : null}
    </div>
  )
}
