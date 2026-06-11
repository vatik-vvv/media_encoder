import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import type { ImportReviewItem } from '@shared/import'
import type { OutputOccupancyEntry } from '@shared/outputPathConflict'
import type { QueueItem } from '@shared/types'
import EncodeSettingsForm from './EncodeSettingsForm'
import OutputPathFields from './OutputPathFields'
import Modal from './Modal'

interface Props {
  items: ImportReviewItem[]
  loading?: boolean
  scanMessage?: string
  outputTemplate: string
  queueLength: number
  queue: QueueItem[]
  resolvedQueuePaths: Record<string, string>
  onConfirm: (selected: ImportReviewItem[]) => void
  onCancel: () => void
  onApplyDefaultsToAll: () => ImportReviewItem[]
}

function toPreviewItem(item: ImportReviewItem): QueueItem {
  const {
    id,
    selected: _s,
    displayName: _d,
    error: _e,
    sourceType,
    sourcePath,
    analysis,
    outputDirOverride,
    outputFileName,
    ...encode
  } = item
  return {
    id,
    sourceType,
    sourcePath,
    analysis,
    status: 'pending',
    outputDirOverride,
    outputFileName,
    ...encode
  }
}

export default function ImportReviewDialog({
  items: initialItems,
  loading,
  scanMessage,
  outputTemplate,
  queueLength,
  queue,
  resolvedQueuePaths,
  onConfirm,
  onCancel,
  onApplyDefaultsToAll
}: Props): JSX.Element {
  const [items, setItems] = useState(initialItems)
  const [editIds, setEditIds] = useState<string[]>([])
  const [lastClickedId, setLastClickedId] = useState<string | null>(null)
  const [templatePath, setTemplatePath] = useState('')

  useEffect(() => {
    setItems(initialItems)
    const first = initialItems.find((i) => !i.error)?.id ?? null
    setEditIds(first ? [first] : [])
    setLastClickedId(first)
  }, [initialItems])

  const editSet = new Set(editIds)
  const primaryId = editIds[0] ?? null
  const primary = items.find((i) => i.id === primaryId)
  const queueSelectedCount = items.filter((i) => i.selected && !i.error).length

  const previewIndex = queueLength + 1

  const queueOccupancy = useMemo((): OutputOccupancyEntry[] => {
    return queue
      .map((q) => ({
        fullPath: q.outputPathOverride ?? resolvedQueuePaths[q.id] ?? '',
        ownerId: q.id,
        sourcePath: q.sourcePath
      }))
      .filter((e) => e.fullPath.length > 0)
  }, [queue, resolvedQueuePaths])

  useEffect(() => {
    if (!primary?.analysis || primary.error) {
      setTemplatePath('')
      return
    }
    let cancelled = false
    void window.mencoder
      .previewTemplate(outputTemplate, toPreviewItem(primary), previewIndex)
      .then((r) => {
        if (!cancelled) setTemplatePath(r.path)
      })
      .catch(() => {
        if (!cancelled) setTemplatePath('')
      })
    return () => {
      cancelled = true
    }
  }, [primaryId, items, outputTemplate, previewIndex])

  const updateItems = (ids: string[], patch: Partial<ImportReviewItem>): void => {
    const idSet = new Set(ids)
    setItems((list) => list.map((i) => (idSet.has(i.id) ? { ...i, ...patch } : i)))
  }

  const toggleQueueSelected = (id: string, checked: boolean): void => {
    updateItems([id], { selected: checked })
  }

  const handleRowClick = (id: string, e: MouseEvent): void => {
    if ((e.target as HTMLElement).closest('input[type="checkbox"]')) return

    const validItems = items.filter((i) => !i.error)
    const clickedIndex = validItems.findIndex((i) => i.id === id)
    if (clickedIndex < 0) return

    if (e.shiftKey && lastClickedId) {
      const anchorIndex = validItems.findIndex((i) => i.id === lastClickedId)
      if (anchorIndex >= 0) {
        const lo = Math.min(anchorIndex, clickedIndex)
        const hi = Math.max(anchorIndex, clickedIndex)
        setEditIds(validItems.slice(lo, hi + 1).map((i) => i.id))
        return
      }
    }

    if (e.ctrlKey || e.metaKey) {
      setEditIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      )
      setLastClickedId(id)
      return
    }

    setEditIds([id])
    setLastClickedId(id)
  }

  const toggleAllQueue = (selected: boolean): void => {
    setItems((list) =>
      list.map((i) => (i.error ? { ...i, selected: false } : { ...i, selected }))
    )
  }

  return (
    <Modal onClose={onCancel} className="modal-import modal-tall">
      <h2>Add sources to queue</h2>
      {scanMessage && <p className="hint">{scanMessage}</p>}
      <p className="hint import-hint-bar">
        Check items to add to the queue. Ctrl+click or Shift+click rows to select multiple for
        batch editing.
      </p>
      {loading ? (
        <p className="hint">Scanning and analyzing sources…</p>
      ) : items.length === 0 ? (
        <p className="hint">No video files or image sequences found.</p>
      ) : (
        <div className="import-layout">
          <div className="import-list-panel">
            <div className="row" style={{ marginBottom: 8 }}>
              <button type="button" className="secondary" onClick={() => toggleAllQueue(true)}>
                Check all
              </button>
              <button type="button" className="secondary" onClick={() => toggleAllQueue(false)}>
                Uncheck all
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  const next = onApplyDefaultsToAll()
                  setItems(next)
                }}
              >
                Apply defaults to all
              </button>
            </div>
            <ul className="import-list">
              {items.map((item) => (
                <li
                  key={item.id}
                  className={`import-list-item ${editSet.has(item.id) ? 'edit-selected' : ''} ${item.error ? 'has-error' : ''}`}
                >
                  <label className="import-list-label">
                    <input
                      type="checkbox"
                      title="Add to queue"
                      checked={item.selected && !item.error}
                      disabled={Boolean(item.error)}
                      onChange={(e) => toggleQueueSelected(item.id, e.target.checked)}
                    />
                    <button
                      type="button"
                      className="import-list-body"
                      onClick={(e) => handleRowClick(item.id, e)}
                    >
                      <span className="import-type">{item.sourceType}</span>
                      <span className="import-name" title={item.sourcePath}>
                        {item.displayName}
                      </span>
                      <span className="import-meta">
                        {item.error
                          ? item.error
                          : item.sourceType === 'sequence'
                            ? `${item.analysis?.frameCount ?? '?'} frames`
                            : item.analysis?.duration != null
                              ? `${item.analysis.duration.toFixed(1)}s`
                              : 'video'}
                      </span>
                    </button>
                  </label>
                </li>
              ))}
            </ul>
          </div>
          <div className="import-settings-panel">
            {primary && editIds.length > 0 ? (
              <>
                {editIds.length > 1 && (
                  <p className="hint batch-edit-banner">
                    Editing {editIds.length} items — changes apply to all selected.
                  </p>
                )}
                <p className="path-preview" title={primary.sourcePath}>
                  {editIds.length === 1
                    ? primary.sourcePath
                    : `${editIds.length} sources selected`}
                </p>
                {primary.error ? (
                  <p className="hint custom">{primary.error}</p>
                ) : (
                  <>
                    <EncodeSettingsForm
                      item={primary}
                      analysis={primary.analysis}
                      showOutputOverride={false}
                      onChange={(patch) =>
                        updateItems(editIds, patch as Partial<ImportReviewItem>)
                      }
                    />
                    <OutputPathFields
                      outputFileName={primary.outputFileName}
                      outputDirOverride={primary.outputDirOverride}
                      outputFormat={primary.outputFormat}
                      templatePath={templatePath}
                      sourcePath={primary.sourcePath}
                      ownerIds={editIds}
                      queueOccupancy={queueOccupancy}
                      batchNote={editIds.length > 1}
                      onChange={(patch) => updateItems(editIds, patch)}
                    />
                  </>
                )}
              </>
            ) : (
              <p className="hint">Select one or more items to edit settings (Ctrl+click).</p>
            )}
          </div>
        </div>
      )}

      <div className="modal-actions">
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          disabled={loading || queueSelectedCount === 0}
          onClick={() => onConfirm(items.filter((i) => i.selected && !i.error))}
        >
          Add {queueSelectedCount} to queue
        </button>
      </div>
    </Modal>
  )
}
