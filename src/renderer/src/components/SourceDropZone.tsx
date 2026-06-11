import type { DragEvent } from 'react'

interface Props {
  dragOver: boolean
  disabled?: boolean
  onDragOver: (e: DragEvent) => void
  onDragLeave: (e: DragEvent) => void
  onDrop: (e: DragEvent) => void
  onAddVideos: () => void
  onAddSequence: () => void
}

export default function SourceDropZone({
  dragOver,
  disabled,
  onDragOver,
  onDragLeave,
  onDrop,
  onAddVideos,
  onAddSequence
}: Props): JSX.Element {
  return (
    <section
      className={`source-drop-zone panel ${dragOver ? 'drag-active' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <p className="source-drop-label">Drop files or folders here</p>
      <div className="row source-drop-actions">
        <button type="button" disabled={disabled} onClick={onAddVideos}>
          Add video(s)…
        </button>
        <button type="button" disabled={disabled} onClick={onAddSequence}>
          Add sequence folder…
        </button>
      </div>
    </section>
  )
}
