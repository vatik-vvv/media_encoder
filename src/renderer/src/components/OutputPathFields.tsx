import { useCallback, useMemo } from 'react'
import {
  buildOccupiedPathSet,
  type OutputOccupancyEntry
} from '@shared/outputPathConflict'
import { extensionForFormat } from '@shared/encodeSettingsHelpers'
import {
  normalizeOutputPath,
  pickNonConflictingFileName,
  resolveOutputLocation
} from '@shared/outputPath'
import type { OutputFormat } from '@shared/types'

interface Props {
  outputFileName: string
  outputDirOverride?: string
  outputFormat?: OutputFormat
  templatePath: string
  sourcePath: string
  ownerIds: string[]
  queueOccupancy: OutputOccupancyEntry[]
  /** Existing output paths for this job — allowed on disk when re-encoding. */
  ignoreDiskPaths?: string[]
  onChange: (patch: { outputFileName?: string; outputDirOverride?: string }) => void
  batchNote?: boolean
}

export default function OutputPathFields({
  outputFileName,
  outputDirOverride,
  outputFormat = 'mp4_h264',
  templatePath,
  sourcePath,
  ownerIds,
  queueOccupancy,
  ignoreDiskPaths = [],
  onChange,
  batchNote
}: Props): JSX.Element {
  const outputPreview = useMemo(() => {
    if (!templatePath) return null
    return resolveOutputLocation(templatePath, { outputDirOverride, outputFileName, outputFormat })
  }, [templatePath, outputDirOverride, outputFileName, outputFormat])

  const dedupeFileName = useCallback(async (): Promise<void> => {
    if (!templatePath || !outputPreview) return

    const existsMap = await window.mencoder.pathsExistOnDisk([outputPreview.fullPath])
    const sourceKey = normalizeOutputPath(sourcePath)
    const exclude = new Set(ownerIds)
    const occupied = buildOccupiedPathSet(queueOccupancy, exclude)

    const ignoredDisk = new Set(ignoreDiskPaths.map(normalizeOutputPath))

    const existsOnDisk = (p: string): boolean => {
      const key = normalizeOutputPath(p)
      if (key === sourceKey) return true
      if (ignoredDisk.has(key)) return false
      return existsMap[key] === true
    }

    const unique = pickNonConflictingFileName(
      outputFileName,
      outputPreview.dir,
      occupied,
      existsOnDisk,
      outputFormat
    )

    if (unique !== outputFileName) {
      onChange({ outputFileName: unique })
    }
  }, [
    templatePath,
    outputPreview,
    outputFileName,
    outputFormat,
    ownerIds,
    queueOccupancy,
    ignoreDiskPaths,
    sourcePath,
    onChange
  ])

  return (
    <div className="output-path-fields">
      <h3 className="settings-section-title">Output</h3>
      <div className="field">
        <label>Output file name</label>
        <input
          type="text"
          value={outputFileName}
          onChange={(e) => onChange({ outputFileName: e.target.value })}
          onBlur={() => void dedupeFileName()}
          placeholder={`source_name${extensionForFormat(outputFormat)}`}
        />
        <p className="hint">If the name exists in the queue or on disk, (1), (2), … is added automatically.</p>
      </div>
      <div className="field">
        <label>Output folder</label>
        <div className="row">
          <button
            type="button"
            className="secondary"
            onClick={async () => {
              const dir = await window.mencoder.openOutputFolder()
              if (dir) {
                onChange({ outputDirOverride: dir })
                setTimeout(() => void dedupeFileName(), 0)
              }
            }}
          >
            Choose folder…
          </button>
          {outputDirOverride && (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                onChange({ outputDirOverride: undefined })
                setTimeout(() => void dedupeFileName(), 0)
              }}
            >
              Use default folder
            </button>
          )}
        </div>
      </div>
      {outputPreview ? (
        <div className="import-output-summary">
          <div className="import-output-summary-row">
            <span className="import-output-label">Folder</span>
            <span className="path-preview" title={outputPreview.dir}>
              {outputPreview.dir}
              {outputDirOverride ? '' : ' (from template)'}
            </span>
          </div>
          <div className="import-output-summary-row">
            <span className="import-output-label">File</span>
            <span className="path-preview">{outputPreview.fileName}</span>
          </div>
          <div className="import-output-summary-row">
            <span className="import-output-label">Full path</span>
            <span className="path-preview" title={outputPreview.fullPath}>
              {outputPreview.fullPath}
            </span>
          </div>
          {normalizeOutputPath(outputPreview.fullPath) === normalizeOutputPath(sourcePath) && (
            <p className="hint custom" style={{ marginTop: 8 }}>
              Warning: output path is the same as the source file.
            </p>
          )}
          {batchNote && (
            <p className="hint" style={{ marginTop: 8 }}>
              Folder and file name apply to all selected items; each gets a unique name when added.
            </p>
          )}
        </div>
      ) : (
        <p className="hint">Resolving output path…</p>
      )}
    </div>
  )
}
