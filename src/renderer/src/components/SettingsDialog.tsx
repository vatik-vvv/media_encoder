import { useEffect, useState } from 'react'
import { COMPRESSION_MAP } from '@shared/types'
import type { AppSettings, EncodeSettings } from '@shared/types'
import { buildDefaultEncodeSettings } from '@shared/settingsHelpers'
import TemplateEditor from './TemplateEditor'
import EncodeDefaultsPanel from './EncodeDefaultsPanel'
import Modal from './Modal'

interface Props {
  settings: AppSettings
  onSave: (s: Partial<AppSettings>) => void
  onClose: () => void
  templatePreview?: string
}

export default function SettingsDialog({
  settings,
  onSave,
  onClose,
  templatePreview
}: Props): JSX.Element {
  const [draft, setDraft] = useState(settings)

  useEffect(() => {
    setDraft(settings)
  }, [settings])

  const setEncodeDefaults = (patch: Partial<EncodeSettings>): void => {
    setDraft((d) => ({
      ...d,
      encodeDefaults: { ...d.encodeDefaults, ...patch },
      ...(patch.outputFormat != null ? { defaultOutputFormat: patch.outputFormat } : {}),
      ...(patch.proResProfile != null ? { defaultProResProfile: patch.proResProfile } : {})
    }))
  }

  return (
    <Modal onClose={onClose} className="modal-tall modal-settings">
      <h2>Settings</h2>
      <div className="modal-body-scroll">
        <TemplateEditor
          value={draft.outputTemplate}
          onChange={(v) => setDraft({ ...draft, outputTemplate: v })}
          preview={templatePreview}
        />

        <EncodeDefaultsPanel defaults={draft.encodeDefaults} onChange={setEncodeDefaults} />

        <div className="field">
          <label>Default compression level (MP4 shortcut)</label>
          <input
            type="number"
            min={1}
            max={5}
            value={draft.defaultCompressionLevel}
            onChange={(e) => {
              const level = parseInt(e.target.value, 10) as AppSettings['defaultCompressionLevel']
              const comp = COMPRESSION_MAP[level]
              setDraft({
                ...draft,
                defaultCompressionLevel: level,
                defaultCrf: comp.defaultCrf,
                encodeDefaults: {
                  ...draft.encodeDefaults,
                  compressionLevel: level,
                  crf: comp.defaultCrf,
                  videoBitrateMbps: comp.defaultBitrateMbps
                }
              })
            }}
          />
        </div>

        <div className="field">
          <label>Default CRF (MP4 shortcut)</label>
          <input
            type="number"
            min={18}
            max={28}
            value={draft.defaultCrf}
            onChange={(e) => {
              const crf = parseInt(e.target.value, 10)
              setDraft({
                ...draft,
                defaultCrf: crf,
                encodeDefaults: { ...draft.encodeDefaults, crf }
              })
            }}
          />
        </div>
      </div>

      <div className="modal-actions">
        <button
          type="button"
          className="secondary"
          onClick={() => {
            setDraft({
              outputTemplate: '{source_dir}\\{source_name}{ext}',
              defaultOutputFormat: 'mp4_h264',
              defaultProResProfile: '422',
              defaultCompressionLevel: 2,
              defaultCrf: 20,
              defaultOutputFpsPreset: 30,
              queuePanePercent: 68,
              encodeDefaults: buildDefaultEncodeSettings()
            })
          }}
        >
          Reset all
        </button>
        <button type="button" className="secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            onSave(draft)
            onClose()
          }}
        >
          Save
        </button>
      </div>
    </Modal>
  )
}
