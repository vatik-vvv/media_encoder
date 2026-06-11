import {
  COMPRESSION_MAP,
  type CompressionLevel,
  type EncodeSettings,
  type VideoRateControl
} from '@shared/types'

interface Props {
  level: CompressionLevel
  crf: number
  videoRateControl: VideoRateControl
  videoBitrateMbps: number
  onChange: (patch: Partial<EncodeSettings>) => void
  disabled?: boolean
}

const LEVELS: CompressionLevel[] = [1, 2, 3, 4, 5]

function isCustomCrf(level: CompressionLevel, crf: number): boolean {
  return COMPRESSION_MAP[level].defaultCrf !== crf
}

function isCustomBitrate(level: CompressionLevel, mbps: number): boolean {
  return COMPRESSION_MAP[level].defaultBitrateMbps !== mbps
}

export default function CompressionControl({
  level,
  crf,
  videoRateControl,
  videoBitrateMbps,
  onChange,
  disabled
}: Props): JSX.Element {
  const comp = COMPRESSION_MAP[level]
  const isCrf = videoRateControl !== 'bitrate'
  const customCrf = isCrf && isCustomCrf(level, crf)
  const customBitrate = !isCrf && isCustomBitrate(level, videoBitrateMbps)

  const applyLevel = (l: CompressionLevel): void => {
    const c = COMPRESSION_MAP[l]
    onChange({
      compressionLevel: l,
      crf: c.defaultCrf,
      videoBitrateMbps: c.defaultBitrateMbps
    })
  }

  return (
    <div className="field">
      <label>Compression</label>
      <div className="chip-group" style={{ marginBottom: 8 }}>
        <button
          type="button"
          className={`chip ${isCrf ? 'active' : ''}`}
          disabled={disabled}
          onClick={() =>
            onChange({
              videoRateControl: 'crf',
              crf: COMPRESSION_MAP[level].defaultCrf
            })
          }
        >
          Quality (CRF)
        </button>
        <button
          type="button"
          className={`chip ${!isCrf ? 'active' : ''}`}
          disabled={disabled}
          onClick={() =>
            onChange({
              videoRateControl: 'bitrate',
              videoBitrateMbps: COMPRESSION_MAP[level].defaultBitrateMbps
            })
          }
        >
          Target bitrate
        </button>
      </div>
      <div className="chip-group">
        {LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            className={`chip ${level === l ? 'active' : ''}`}
            disabled={disabled}
            title={COMPRESSION_MAP[l].label}
            onClick={() => applyLevel(l)}
          >
            {l}
          </button>
        ))}
      </div>
      <p className="hint">{comp.label}</p>
      {isCrf ? (
        <>
          <label style={{ marginTop: 12, display: 'block' }}>
            CRF fine-tune: <strong>{crf}</strong>
          </label>
          <input
            type="range"
            min={18}
            max={28}
            step={1}
            value={crf}
            disabled={disabled}
            onChange={(e) => onChange({ crf: parseInt(e.target.value, 10) })}
          />
          {customCrf && <p className="hint custom">Custom CRF (preset: {comp.preset})</p>}
          <p className="hint">
            Encoding: CRF {crf}, preset {comp.preset}
          </p>
        </>
      ) : (
        <>
          <label style={{ marginTop: 12, display: 'block' }}>
            Target bitrate: <strong>{videoBitrateMbps} Mbps</strong>
          </label>
          <input
            type="range"
            min={1}
            max={50}
            step={1}
            value={videoBitrateMbps}
            disabled={disabled}
            onChange={(e) => onChange({ videoBitrateMbps: parseInt(e.target.value, 10) })}
          />
          {customBitrate && (
            <p className="hint custom">Custom bitrate (preset: {comp.preset})</p>
          )}
          <p className="hint">
            Encoding: {videoBitrateMbps} Mbps, preset {comp.preset}
          </p>
        </>
      )}
    </div>
  )
}
