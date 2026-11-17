interface Props {
  dragOver: boolean
  disabled?: boolean
  onAddVideos: () => void
  onAddSequence: () => void
}

export default function SourceDropZone({
  dragOver,
  disabled,
  onAddVideos,
  onAddSequence
}: Props): JSX.Element {
  return (
    <section className={`source-drop-zone panel ${dragOver ? 'drag-active' : ''}`}>
      <p className="source-drop-label">Drop files or folders anywhere in the window</p>
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
