import { useCallback, useRef, type ReactNode } from 'react'

interface Props {
  top: ReactNode
  bottom: ReactNode
  topPercent: number
  onTopPercentChange: (percent: number) => void
  minTopPx?: number
  minBottomPx?: number
}

export default function VertSplitPane({
  top,
  bottom,
  topPercent,
  onTopPercentChange,
  minTopPx = 120,
  minBottomPx = 80
}: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const y = e.clientY - rect.top
      const total = rect.height
      if (total <= 0) return
      let pct = (y / total) * 100
      const minTopPct = (minTopPx / total) * 100
      const maxTopPct = 100 - (minBottomPx / total) * 100
      pct = Math.max(minTopPct, Math.min(maxTopPct, pct))
      onTopPercentChange(Math.round(pct))
    },
    [minTopPx, minBottomPx, onTopPercentChange]
  )

  const stopDrag = useCallback(() => {
    dragging.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', stopDrag)
  }, [onPointerMove])

  const startDrag = (e: React.PointerEvent): void => {
    e.preventDefault()
    dragging.current = true
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', stopDrag)
  }

  const pct = Math.max(15, Math.min(85, topPercent))

  return (
    <div ref={containerRef} className="vert-split">
      <div className="vert-split-top" style={{ height: `${pct}%` }}>
        {top}
      </div>
      <div
        className="vert-split-handle"
        role="separator"
        aria-orientation="horizontal"
        onPointerDown={startDrag}
      />
      <div className="vert-split-bottom">{bottom}</div>
    </div>
  )
}
