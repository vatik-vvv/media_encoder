import { useCallback, useEffect, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import type { ImportReviewItem } from '@shared/import'
import type { AppSettings, EncodeSettings, QueueItem } from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/types'
import { defaultOutputFileName } from '@shared/outputPath'
import { normalizeAppSettings } from '@shared/settingsHelpers'
import { preparedToReviewItems } from './utils/importReview'
import { finalizeImportItemsForQueue } from './utils/finalizeImportOutputs'
import { reviewItemToQueueItem } from './utils/reviewToQueue'
import { duplicateQueueItem } from './utils/duplicateQueueItem'
import QueueTable from './components/QueueTable'
import QueueOverallProgress from './components/QueueOverallProgress'
import JobEditor from './components/JobEditor'
import SettingsDialog from './components/SettingsDialog'
import ImportReviewDialog from './components/ImportReviewDialog'
import SourceDropZone from './components/SourceDropZone'
import VertSplitPane from './components/VertSplitPane'
import appIcon from '../../../MEencoder_icon.png'
import { clampTrimFrames, frameToTimecode, getTrimFrameBounds, initTrimForSource } from '@shared/trim'
import { resolveInputFps } from '@shared/fps'

export default function App(): JSX.Element {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [defaults, setDefaults] = useState<EncodeSettings>(DEFAULT_SETTINGS.encodeDefaults)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [resolvedPaths, setResolvedPaths] = useState<Record<string, string>>({})
  const [encoding, setEncoding] = useState(false)
  const [queueRun, setQueueRun] = useState<{
    jobIndex: number
    jobTotal: number
    jobPercent: number
  } | null>(null)
  const [log, setLog] = useState<string[]>([])
  const [queuePanePercent, setQueuePanePercent] = useState(68)
  const [windowDrag, setWindowDrag] = useState(false)
  const [importReview, setImportReview] = useState<{
    items: ImportReviewItem[]
    loading: boolean
    message?: string
  } | null>(null)
  const splitSaveTimer = useRef<ReturnType<typeof setTimeout>>()
  const windowDragDepth = useRef(0)

  useEffect(() => {
    void window.mencoder.getSettings().then((s) => {
      const normalized = normalizeAppSettings(s)
      setSettings(normalized)
      setDefaults(normalized.encodeDefaults)
      setQueuePanePercent(normalized.queuePanePercent)
    })
  }, [])

  const persistSplitPercent = useCallback((percent: number) => {
    setQueuePanePercent(percent)
    if (splitSaveTimer.current) clearTimeout(splitSaveTimer.current)
    splitSaveTimer.current = setTimeout(() => {
      void window.mencoder.setSettings({ queuePanePercent: percent })
    }, 400)
  }, [])

  const refreshResolvedPaths = useCallback(async () => {
    const map: Record<string, string> = {}
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i]
      if (item.outputPathOverride) {
        map[item.id] = item.outputPathOverride
      } else if (item.analysis) {
        const r = await window.mencoder.previewTemplate(settings.outputTemplate, item, i + 1)
        map[item.id] = r.path
      }
    }
    setResolvedPaths(map)
  }, [queue, settings.outputTemplate])

  useEffect(() => {
    void refreshResolvedPaths()
  }, [refreshResolvedPaths])

  useEffect(() => {
    const unsubs = [
      window.mencoder.onQueueProgress((data) => {
        const d = data as {
          id: string
          progress: number
          overallIndex?: number
          overallTotal?: number
        }
        setQueue((q) =>
          q.map((item) =>
            item.id === d.id ? { ...item, progress: d.progress, status: 'running' } : item
          )
        )
        if (d.overallIndex != null && d.overallTotal != null) {
          setQueueRun({
            jobIndex: Math.max(1, d.overallIndex),
            jobTotal: d.overallTotal,
            jobPercent: d.progress
          })
        }
      }),
      window.mencoder.onQueueLog((data) => {
        const d = data as { line: string }
        setLog((l) => [...l.slice(-500), d.line])
      }),
      window.mencoder.onJobStatus((data) => {
        const d = data as {
          id: string
          status: QueueItem['status']
          errorMessage?: string
          encodeDurationMs?: number
        }
        setQueue((q) =>
          q.map((item) =>
            item.id === d.id
              ? {
                  ...item,
                  status: d.status,
                  errorMessage: d.errorMessage,
                  progress: d.status === 'done' ? 100 : item.progress,
                  encodeDurationMs:
                    d.encodeDurationMs ?? (d.status === 'done' ? item.encodeDurationMs : undefined)
                }
              : item
          )
        )
      }),
      window.mencoder.onJobDone((data) => {
        const d = data as { id: string; success: boolean; outputPath?: string }
        if (d.success && d.outputPath) {
          setLog((l) => [...l, `Done: ${d.outputPath}`])
          setResolvedPaths((prev) => ({ ...prev, [d.id]: d.outputPath! }))
        }
      }),
      window.mencoder.onQueueFinished(() => {
        setEncoding(false)
        setQueueRun(null)
      })
    ]
    return () => unsubs.forEach((u) => u())
  }, [])

  const openImportFromPaths = useCallback(
    async (paths: string[]) => {
      if (paths.length === 0) return
      setImportReview({ items: [], loading: true })
      try {
        const prepared = await window.mencoder.prepareImport(paths)
        const items = preparedToReviewItems(prepared, defaults, settings)
        setImportReview({
          items,
          loading: false,
          message:
            prepared.length === 0
              ? 'No video files or image sequences found.'
              : `Found ${items.length} source(s). Select items and edit settings before adding to the queue.`
        })
      } catch (err) {
        setImportReview({
          items: [],
          loading: false,
          message: err instanceof Error ? err.message : String(err)
        })
      }
    },
    [defaults, settings]
  )

  const extractDropPaths = (e: DragEvent): string[] => {
    const paths: string[] = []
    for (const file of Array.from(e.dataTransfer?.files ?? [])) {
      const f = file as File & { path?: string }
      if (f.path) paths.push(f.path)
    }
    return paths
  }

  const handleWindowDragEnter = (e: DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    windowDragDepth.current += 1
    setWindowDrag(true)
  }

  const handleWindowDragOver = (e: DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
  }

  const handleWindowDragLeave = (e: DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    windowDragDepth.current = Math.max(0, windowDragDepth.current - 1)
    if (windowDragDepth.current === 0) setWindowDrag(false)
  }

  const handleWindowDrop = (e: DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    windowDragDepth.current = 0
    setWindowDrag(false)
    const paths = extractDropPaths(e)
    if (paths.length > 0) void openImportFromPaths(paths)
  }

  const handleAddVideos = async (): Promise<void> => {
    const paths = await window.mencoder.openVideoFiles()
    if (paths.length > 0) await openImportFromPaths(paths)
  }

  const handleAddSequence = async (): Promise<void> => {
    const folder = await window.mencoder.openSequenceFolder()
    if (folder) await openImportFromPaths([folder])
  }

  const handleImportConfirm = async (selected: ImportReviewItem[]): Promise<void> => {
    try {
      const finalized = await finalizeImportItemsForQueue(selected, {
        settings,
        queue,
        resolvedQueuePaths: resolvedPaths,
        queueStartIndex: queue.length,
        pathsExistOnDisk: (paths) => window.mencoder.pathsExistOnDisk(paths)
      })

      const newItems: QueueItem[] = []
      let index = queue.length
      for (const item of finalized) {
        index++
        const q = await reviewItemToQueueItem(item, settings, index)
        if (q) newItems.push(q)
      }
      if (newItems.length === 0) return

      setQueue((prev) => [...prev, ...newItems])
      setImportReview(null)
      void refreshResolvedPaths()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      window.alert(`Could not add to queue: ${message}`)
    }
  }

  const applyDefaultsToReviewItem = (item: ImportReviewItem): ImportReviewItem => {
    let merged: ImportReviewItem = {
      ...item,
      ...defaults,
      outputDirOverride: undefined,
      outputFileName: item.analysis
        ? defaultOutputFileName(item.analysis.sourceName, defaults.outputFormat)
        : item.outputFileName
    }
    if (merged.analysis) {
      const fps = resolveInputFps(merged, merged.analysis)
      const bounds = getTrimFrameBounds(merged.analysis, fps)
      if (merged.trimEnabled) {
        const { startFrame, endFrame } = clampTrimFrames(
          merged.trimStartFrame,
          merged.trimEndFrame,
          bounds
        )
        merged = {
          ...merged,
          trimStartFrame: startFrame,
          trimEndFrame: endFrame,
          trimStartTimecode: frameToTimecode(startFrame, fps, bounds.baseFrame),
          trimEndTimecode: frameToTimecode(endFrame, fps, bounds.baseFrame)
        }
      } else {
        const trim = initTrimForSource(merged.analysis, fps)
        merged = { ...merged, ...trim }
      }
    }
    return merged
  }

  const handleEncodeQueue = async (): Promise<void> => {
    if (queue.length === 0) return
    setEncoding(true)
    setLog([])
    const toRun = queue.filter((i) => i.status !== 'done')
    setQueueRun({ jobIndex: 1, jobTotal: toRun.length, jobPercent: 0 })
    const items = toRun.map((item) => ({ ...item, status: 'pending' as const, progress: 0 }))
    setQueue((q) =>
      q.map((item) => {
        const run = items.find((r) => r.id === item.id)
        return run ?? item
      })
    )
    await window.mencoder.startQueue(items)
  }

  const handleSaveSettings = async (partial: Partial<AppSettings>): Promise<void> => {
    const s = await window.mencoder.setSettings(partial)
    const normalized = normalizeAppSettings(s)
    setSettings(normalized)
    setDefaults(normalized.encodeDefaults)
    setQueuePanePercent(normalized.queuePanePercent)
  }

  const handleDuplicate = async (id: string): Promise<void> => {
    const idx = queue.findIndex((i) => i.id === id)
    if (idx < 0) return
    const source = queue[idx]
    try {
      const dup = await duplicateQueueItem(source, queue, resolvedPaths, settings, idx + 2)
      setQueue((q) => {
        const copy = [...q]
        copy.splice(idx + 1, 0, dup)
        return copy
      })
      setSelectedId(dup.id)
      void refreshResolvedPaths()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err))
    }
  }

  const handleResetStatus = (id: string): void => {
    setQueue((q) =>
      q.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'pending',
              progress: undefined,
              errorMessage: undefined,
              encodeDurationMs: undefined
            }
          : item
      )
    )
  }

  const handleJobChange = (id: string, patch: Partial<QueueItem>): void => {
    setQueue((q) =>
      q.map((item) => {
        if (item.id !== id) return item
        const next = { ...item, ...patch }
        if (item.status === 'done' && Object.keys(patch).length > 0) {
          return {
            ...next,
            status: 'pending',
            progress: undefined,
            encodeDurationMs: undefined,
            errorMessage: undefined
          }
        }
        return next
      })
    )
  }

  const editingItem = editingId ? queue.find((i) => i.id === editingId) : null

  const queuePanel = (
    <section className="panel panel-fill">
      <h2>Queue</h2>
      {encoding && queueRun && queueRun.jobTotal > 0 ? (
        <QueueOverallProgress
          jobIndex={queueRun.jobIndex}
          jobTotal={queueRun.jobTotal}
          jobPercent={queueRun.jobPercent}
        />
      ) : null}
      <div className="panel-fill-body">
        <QueueTable
          items={queue}
          selectedId={selectedId}
          encoding={encoding}
          resolvedPaths={resolvedPaths}
          onSelect={setSelectedId}
          onEdit={setEditingId}
          onDuplicate={(id) => void handleDuplicate(id)}
          onResetStatus={handleResetStatus}
          onRemove={(id) => setQueue((q) => q.filter((i) => i.id !== id))}
          onMove={(id, dir) => {
            setQueue((q) => {
              const idx = q.findIndex((i) => i.id === id)
              const next = idx + dir
              if (next < 0 || next >= q.length) return q
              const copy = [...q]
              ;[copy[idx], copy[next]] = [copy[next], copy[idx]]
              return copy
            })
          }}
        />
      </div>
      <div className="row queue-toolbar">
        <button type="button" onClick={() => void handleEncodeQueue()} disabled={encoding || queue.length === 0}>
          Encode queue
        </button>
        <button type="button" className="danger" disabled={!encoding} onClick={() => void window.mencoder.cancelQueue()}>
          Cancel
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => setQueue((q) => q.filter((i) => i.status !== 'done'))}
        >
          Clear completed
        </button>
      </div>
    </section>
  )

  const logPanel = (
    <section className="panel panel-fill">
      <div className="panel-header-row">
        <h2>Log</h2>
        <button
          type="button"
          className="secondary"
          disabled={log.length === 0}
          onClick={() => setLog([])}
        >
          Clear log
        </button>
      </div>
      <div className="log panel-fill-body">{log.join('\n') || 'No output yet.'}</div>
    </section>
  )

  return (
    <div
      className={`app ${windowDrag ? 'drag-active' : ''}`}
      onDragEnter={handleWindowDragEnter}
      onDragOver={handleWindowDragOver}
      onDragLeave={handleWindowDragLeave}
      onDrop={handleWindowDrop}
    >
      <header className="app-header">
        <div className="app-brand">
          <img src={appIcon} alt="" className="app-logo" />
          <h1>MEDIA ENCODER</h1>
        </div>
        <button type="button" className="secondary" onClick={() => setShowSettings(true)}>
          Settings
        </button>
      </header>

      <SourceDropZone
        dragOver={windowDrag}
        disabled={encoding}
        onAddVideos={() => void handleAddVideos()}
        onAddSequence={() => void handleAddSequence()}
      />

      <VertSplitPane
        top={queuePanel}
        bottom={logPanel}
        topPercent={queuePanePercent}
        onTopPercentChange={persistSplitPercent}
      />

      {importReview && (
        <ImportReviewDialog
          items={importReview.items}
          loading={importReview.loading}
          scanMessage={importReview.message}
          outputTemplate={settings.outputTemplate}
          queueLength={queue.length}
          queue={queue}
          resolvedQueuePaths={resolvedPaths}
          onCancel={() => setImportReview(null)}
          onConfirm={(selected) => void handleImportConfirm(selected)}
          onApplyDefaultsToAll={() => importReview.items.map((item) => applyDefaultsToReviewItem(item))}
        />
      )}

      {editingItem && (
        <JobEditor
          item={editingItem}
          outputTemplate={settings.outputTemplate}
          queue={queue}
          resolvedQueuePaths={resolvedPaths}
          queueIndex={Math.max(1, queue.findIndex((i) => i.id === editingItem.id) + 1)}
          onChange={(patch) => editingId && handleJobChange(editingId, patch)}
          onSave={() => {
            setEditingId(null)
            void refreshResolvedPaths()
          }}
          onClose={() => setEditingId(null)}
        />
      )}

      {showSettings && (
        <SettingsDialog
          settings={settings}
          templatePreview={queue[0] ? resolvedPaths[queue[0].id] : '{source_dir}\\{source_name}{ext}'}
          onSave={(partial) => void handleSaveSettings(partial)}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
