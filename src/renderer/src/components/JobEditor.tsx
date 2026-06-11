import { useEffect, useMemo, useState } from 'react'
import {
  defaultOutputFileName,
  ensureOutputExtension,
  resolveOutputLocation
} from '@shared/outputPath'
import type { QueueItem } from '@shared/types'
import EncodeSettingsForm from './EncodeSettingsForm'
import OutputPathFields from './OutputPathFields'
import Modal from './Modal'
import { queueOccupancy } from '../utils/queueOccupancy'

interface Props {
  item: QueueItem
  outputTemplate: string
  queue: QueueItem[]
  resolvedQueuePaths: Record<string, string>
  queueIndex: number
  onChange: (patch: Partial<QueueItem>) => void
  onSave: () => void
  onClose: () => void
}

function outputFileNameForItem(item: QueueItem): string {
  if (item.outputFileName?.trim()) return item.outputFileName.trim()

  if (item.outputPathOverride) {
    const normalized = item.outputPathOverride.replace(/\//g, '\\')
    const sep = normalized.lastIndexOf('\\')
    return sep < 0 ? normalized : normalized.slice(sep + 1)
  }

  if (item.analysis) {
    return defaultOutputFileName(item.analysis.sourceName, item.outputFormat)
  }

  return 'output.mp4'
}

function syncOutputPathPatch(
  item: QueueItem,
  templatePath: string,
  patch: { outputFileName?: string; outputDirOverride?: string },
  outputFormat: QueueItem['outputFormat'] = item.outputFormat
): Partial<QueueItem> {
  const outputFileName = patch.outputFileName ?? outputFileNameForItem(item)
  const outputDirOverride =
    patch.outputDirOverride !== undefined ? patch.outputDirOverride : item.outputDirOverride

  const { fullPath } = resolveOutputLocation(templatePath, {
    outputDirOverride,
    outputFileName,
    outputFormat
  })

  return {
    ...patch,
    outputFileName,
    outputDirOverride,
    outputPathOverride: fullPath
  }
}

export default function JobEditor({
  item,
  outputTemplate,
  queue,
  resolvedQueuePaths,
  queueIndex,
  onChange,
  onSave,
  onClose
}: Props): JSX.Element {
  const [templatePath, setTemplatePath] = useState('')

  const occupancy = useMemo(
    () => queueOccupancy(queue, resolvedQueuePaths),
    [queue, resolvedQueuePaths]
  )

  const ignoreDiskPaths = useMemo(() => {
    const paths = [
      item.outputPathOverride,
      resolvedQueuePaths[item.id]
    ].filter((p): p is string => Boolean(p))
    return [...new Set(paths)]
  }, [item.id, item.outputPathOverride, resolvedQueuePaths])

  useEffect(() => {
    if (!item.analysis) {
      setTemplatePath('')
      return
    }
    let cancelled = false
    void window.mencoder
      .previewTemplate(outputTemplate, item, queueIndex)
      .then((r) => {
        if (!cancelled) setTemplatePath(r.path)
      })
      .catch(() => {
        if (!cancelled) setTemplatePath('')
      })
    return () => {
      cancelled = true
    }
  }, [
    item.id,
    item.sourcePath,
    item.sourceType,
    item.analysis,
    item.outputFormat,
    item.proResProfile,
    item.hapVariant,
    outputTemplate,
    queueIndex
  ])

  const templateBase = templatePath || item.outputPathOverride || ''

  const handleOutputPathChange = (patch: {
    outputFileName?: string
    outputDirOverride?: string
  }): void => {
    if (!templateBase) {
      onChange(patch)
      return
    }
    onChange(syncOutputPathPatch(item, templateBase, patch))
  }

  const handleEncodeChange = (patch: Partial<QueueItem>): void => {
    if (patch.outputFormat && patch.outputFormat !== item.outputFormat) {
      const merged = { ...item, ...patch }
      const outputFileName =
        patch.outputFileName ??
        (item.outputFileName
          ? ensureOutputExtension(item.outputFileName, patch.outputFormat)
          : ensureOutputExtension(outputFileNameForItem(item), patch.outputFormat))

      const pathPatch = templateBase
        ? syncOutputPathPatch(merged, templateBase, { outputFileName }, patch.outputFormat)
        : {
            outputFileName,
            outputPathOverride: merged.outputPathOverride
          }

      onChange({ ...patch, ...pathPatch })
      return
    }
    onChange(patch)
  }

  return (
    <Modal onClose={onClose} className="modal-tall modal-editor">
      <h2>Edit job</h2>
      <p className="path-preview">{item.sourcePath}</p>
      <div className="modal-body-scroll">
        <EncodeSettingsForm
          item={item}
          analysis={item.analysis}
          showOutputOverride={false}
          onChange={handleEncodeChange}
        />
        <OutputPathFields
          outputFileName={outputFileNameForItem(item)}
          outputDirOverride={item.outputDirOverride}
          outputFormat={item.outputFormat}
          templatePath={templateBase}
          sourcePath={item.sourcePath}
          ownerIds={[item.id]}
          queueOccupancy={occupancy}
          ignoreDiskPaths={ignoreDiskPaths}
          onChange={handleOutputPathChange}
        />
      </div>
      <div className="modal-actions">
        <button type="button" className="secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="button" onClick={onSave}>
          Save
        </button>
      </div>
    </Modal>
  )
}
