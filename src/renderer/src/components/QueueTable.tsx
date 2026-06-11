import { formatEncodeCell } from '@shared/encodeSettingsHelpers'
import { formatEncodeDuration } from '@shared/formatDuration'
import { formatResizeLabel } from '@shared/resizeLabel'
import type { QueueItem } from '@shared/types'

interface Props {
  items: QueueItem[]
  selectedId: string | null
  encoding?: boolean
  onSelect: (id: string) => void
  onEdit: (id: string) => void
  onDuplicate: (id: string) => void
  onResetStatus: (id: string) => void
  onRemove: (id: string) => void
  onMove: (id: string, direction: -1 | 1) => void
  resolvedPaths: Record<string, string>
}

function statusLabel(item: QueueItem): string {
  if (item.status === 'running' && item.progress != null) {
    const pct = Math.min(100, Math.max(0, item.progress))
    const label = pct > 0 && pct < 1 ? '<1' : String(Math.round(pct))
    return `running ${label}%`
  }
  if (item.status === 'done' && item.encodeDurationMs != null) {
    return `done (${formatEncodeDuration(item.encodeDurationMs)})`
  }
  return item.status
}

function fpsLabel(item: QueueItem, kind: 'in' | 'out'): string {
  if (kind === 'in') {
    if (item.inputFpsMode === 'auto') return 'Auto'
    if (item.inputFpsMode === 'preset') return String(item.inputFpsPreset)
    return String(item.inputFpsCustom)
  }
  if (item.outputFpsMode === 'match') return 'Match'
  if (item.outputFpsMode === 'preset') return String(item.outputFpsPreset)
  return String(item.outputFpsCustom)
}

export default function QueueTable({
  items,
  selectedId,
  encoding = false,
  onSelect,
  onEdit,
  onDuplicate,
  onResetStatus,
  onRemove,
  onMove,
  resolvedPaths
}: Props): JSX.Element {
  if (items.length === 0) {
    return <p className="hint">Queue is empty. Add sources using the controls above.</p>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Source</th>
          <th>Format</th>
          <th>In FPS</th>
          <th>Out FPS</th>
          <th>Resize</th>
          <th>Trim</th>
          <th>Output</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => {
          const outputPath = item.outputPathOverride ?? resolvedPaths[item.id] ?? ''
          const isDone = item.status === 'done'
          const isRunning = item.status === 'running'
          const canReset =
            !isRunning && (item.status === 'done' || item.status === 'error' || item.status === 'cancelled')

          return (
            <tr
              key={item.id}
              className={selectedId === item.id ? 'selected' : ''}
              onClick={() => onSelect(item.id)}
            >
              <td>{i + 1}</td>
              <td title={item.sourcePath}>
                {item.analysis?.sourceName ?? item.sourcePath.split(/[/\\]/).pop()}
              </td>
              <td>{formatEncodeCell(item)}</td>
              <td>{fpsLabel(item, 'in')}</td>
              <td>{fpsLabel(item, 'out')}</td>
              <td>{formatResizeLabel(item)}</td>
              <td>
                {item.trimEnabled ? `${item.trimStartFrame}–${item.trimEndFrame}` : '—'}
              </td>
              <td className="path-preview" title={outputPath}>
                {outputPath || '…'}
              </td>
              <td>
                <span className={`status-${item.status}`}>{statusLabel(item)}</span>
              </td>
              <td>
                <div className="row">
                  <button
                    type="button"
                    className="secondary"
                    disabled={encoding && isRunning}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(item.id)
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    title="Duplicate job"
                    disabled={encoding && isRunning}
                    onClick={(e) => {
                      e.stopPropagation()
                      onDuplicate(item.id)
                    }}
                  >
                    Dup
                  </button>
                  {canReset && (
                    <button
                      type="button"
                      className="secondary"
                      title="Reset status to pending"
                      onClick={(e) => {
                        e.stopPropagation()
                        onResetStatus(item.id)
                      }}
                    >
                      Reset
                    </button>
                  )}
                  {isDone && outputPath && (
                    <button
                      type="button"
                      className="secondary"
                      title="Reveal in Explorer"
                      onClick={(e) => {
                        e.stopPropagation()
                        void window.mencoder.revealInFolder(outputPath)
                      }}
                    >
                      Reveal
                    </button>
                  )}
                  <button type="button" className="secondary" onClick={() => onMove(item.id, -1)}>
                    ↑
                  </button>
                  <button type="button" className="secondary" onClick={() => onMove(item.id, 1)}>
                    ↓
                  </button>
                  <button type="button" className="danger" onClick={() => onRemove(item.id)}>
                    ×
                  </button>
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
