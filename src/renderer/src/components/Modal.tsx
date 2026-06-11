import { useRef, type ReactNode } from 'react'

interface Props {
  onClose: () => void
  children: ReactNode
  className?: string
}

/** Closes only when pointer down/up both occur on the backdrop (not after text selection drag). */
export default function Modal({ onClose, children, className = '' }: Props): JSX.Element {
  const pointerDownOnOverlay = useRef(false)

  return (
    <div
      className="modal-overlay"
      onPointerDown={(e) => {
        pointerDownOnOverlay.current = e.target === e.currentTarget
      }}
      onPointerUp={(e) => {
        if (pointerDownOnOverlay.current && e.target === e.currentTarget) {
          onClose()
        }
        pointerDownOnOverlay.current = false
      }}
    >
      <div
        className={`modal ${className}`.trim()}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
