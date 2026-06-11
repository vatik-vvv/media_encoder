import { encodeWantsAlpha } from '@shared/encodeSettingsHelpers'
import {
  HAP_VARIANTS,
  HAP_VARIANT_MAP,
  OUTPUT_FORMAT_META,
  PRORES_PROFILES,
  PRORES_PROFILE_MAP,
  type EncodeSettings,
  type HapVariant,
  type OutputFormat,
  type ProResProfile
} from '@shared/types'

interface Props {
  outputFormat: OutputFormat
  proResProfile: ProResProfile
  hapVariant: HapVariant
  sourceMayHaveAlpha?: boolean
  onChange: (patch: Partial<EncodeSettings>) => void
  disabled?: boolean
}

const OUTPUT_FORMATS: OutputFormat[] = ['mp4_h264', 'prores', 'hap']

export default function FormatControl({
  outputFormat,
  proResProfile,
  hapVariant,
  sourceMayHaveAlpha,
  onChange,
  disabled
}: Props): JSX.Element {
  const prores422Selected =
    outputFormat === 'prores' &&
    (proResProfile === '422_lt' || proResProfile === '422' || proResProfile === 'hq')
  const alphaOutput = encodeWantsAlpha({ outputFormat, proResProfile, hapVariant })
  const prores4444NoAlpha = outputFormat === 'prores' && proResProfile === '4444'
  const hapNoAlpha =
    outputFormat === 'hap' && (hapVariant === 'hap' || hapVariant === 'hap_q')

  return (
    <div className="field">
      <label>Output format</label>
      <div className="chip-group">
        {OUTPUT_FORMATS.map((f) => (
          <button
            key={f}
            type="button"
            className={`chip ${outputFormat === f ? 'active' : ''}`}
            disabled={disabled}
            onClick={() => onChange({ outputFormat: f })}
          >
            {OUTPUT_FORMAT_META[f].label}
          </button>
        ))}
      </div>

      {outputFormat === 'prores' && (
        <>
          <label style={{ marginTop: 12, display: 'block' }}>ProRes profile</label>
          <div className="chip-group">
            {PRORES_PROFILES.map((p) => (
              <button
                key={p}
                type="button"
                className={`chip ${proResProfile === p ? 'active' : ''}`}
                disabled={disabled}
                onClick={() => onChange({ proResProfile: p })}
              >
                {PRORES_PROFILE_MAP[p].label.replace('ProRes ', '')}
              </button>
            ))}
          </div>
        </>
      )}

      {outputFormat === 'hap' && (
        <>
          <label style={{ marginTop: 12, display: 'block' }}>HAP variant</label>
          <div className="chip-group">
            {HAP_VARIANTS.map((v) => (
              <button
                key={v}
                type="button"
                className={`chip ${hapVariant === v ? 'active' : ''}`}
                disabled={disabled}
                onClick={() => onChange({ hapVariant: v })}
              >
                {HAP_VARIANT_MAP[v].label}
              </button>
            ))}
          </div>
        </>
      )}

      {prores422Selected && sourceMayHaveAlpha && (
        <p className="hint custom" style={{ marginTop: 8 }}>
          ProRes 422 profiles do not preserve alpha. Use ProRes 4444 (Alpha) or HAP Alpha for
          transparency.
        </p>
      )}

      {prores4444NoAlpha && sourceMayHaveAlpha && (
        <p className="hint custom" style={{ marginTop: 8 }}>
          ProRes 4444 ignores the alpha channel. Use ProRes 4444 (Alpha) to keep transparency.
        </p>
      )}

      {hapNoAlpha && sourceMayHaveAlpha && (
        <p className="hint custom" style={{ marginTop: 8 }}>
          HAP and HAP Q ignore the alpha channel. Use HAP Alpha for transparency.
        </p>
      )}

      {alphaOutput && (
        <p className="hint custom" style={{ marginTop: 8 }}>
          Alpha channel will be included in the output.
        </p>
      )}
    </div>
  )
}
