import { TEMPLATE_VARIABLES } from '@shared/types'

interface Props {
  value: string
  onChange: (value: string) => void
  preview?: string
  previewError?: string
}

export default function TemplateEditor({
  value,
  onChange,
  preview,
  previewError
}: Props): JSX.Element {
  const insertVar = (key: string): void => {
    onChange(value + `{${key}}`)
  }

  return (
    <div className="field">
      <label>Output filename template</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="{source_dir}\{source_name}{ext}"
      />
      <p className="hint" style={{ marginTop: 8 }}>
        Use <code>{'{ext}'}</code> so ProRes/HAP jobs get <code>.mov</code> and MP4 jobs get{' '}
        <code>.mp4</code>.
      </p>
      <div className="chip-group" style={{ marginTop: 8 }}>
        {TEMPLATE_VARIABLES.map((v) => (
          <button
            key={v.key}
            type="button"
            className="chip var-chip"
            title={v.desc}
            onClick={() => insertVar(v.key)}
          >
            {`{${v.key}}`}
          </button>
        ))}
      </div>
      {preview != null && (
        <p className="path-preview" style={{ marginTop: 8 }}>
          Preview: {preview}
        </p>
      )}
      {previewError && <p className="hint custom">{previewError}</p>}
    </div>
  )
}
