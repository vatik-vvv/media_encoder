import { contextBridge, ipcRenderer } from 'electron'
import type { PreparedImportItem } from '@shared/import'
import type { AppSettings, OutputFormat, QueueItem } from '@shared/types'

export interface MediaEncoderApi {
  openVideoFiles: () => Promise<string[]>
  openSequenceFolder: () => Promise<string | null>
  openOutputFolder: () => Promise<string | null>
  openAudioFile: () => Promise<string | null>
  saveOutputFile: (format?: OutputFormat) => Promise<string | null>
  revealInFolder: (filePath: string) => Promise<{ ok: boolean }>
  prepareImport: (paths: string[]) => Promise<PreparedImportItem[]>
  getSettings: () => Promise<AppSettings>
  setSettings: (partial: Partial<AppSettings>) => Promise<AppSettings>
  previewTemplate: (
    template: string,
    item: QueueItem,
    index: number
  ) => Promise<{ path: string; error?: string }>
  pathsExistOnDisk: (paths: string[]) => Promise<Record<string, boolean>>
  startQueue: (items: QueueItem[]) => Promise<{ started: boolean }>
  cancelQueue: () => Promise<{ cancelled: boolean }>
  isQueueRunning: () => Promise<boolean>
  onQueueProgress: (cb: (data: unknown) => void) => () => void
  onQueueLog: (cb: (data: unknown) => void) => () => void
  onJobStatus: (cb: (data: unknown) => void) => () => void
  onJobDone: (cb: (data: unknown) => void) => () => void
  onQueueFinished: (cb: (data: unknown) => void) => () => void
}

function subscribe(channel: string, cb: (data: unknown) => void): () => void {
  const handler = (_: Electron.IpcRendererEvent, data: unknown): void => cb(data)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

const api: MediaEncoderApi = {
  openVideoFiles: () => ipcRenderer.invoke('dialog:openVideo'),
  openSequenceFolder: () => ipcRenderer.invoke('dialog:openSequence'),
  openOutputFolder: () => ipcRenderer.invoke('dialog:openOutputFolder'),
  openAudioFile: () => ipcRenderer.invoke('dialog:openAudio'),
  saveOutputFile: (format) => ipcRenderer.invoke('dialog:saveOutput', format),
  revealInFolder: (filePath) => ipcRenderer.invoke('shell:revealInFolder', filePath),
  prepareImport: (paths) => ipcRenderer.invoke('import:prepare', paths),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (partial) => ipcRenderer.invoke('settings:set', partial),
  previewTemplate: (template, item, index) =>
    ipcRenderer.invoke('template:preview', template, item, index),
  pathsExistOnDisk: (paths) => ipcRenderer.invoke('fs:pathsExist', paths),
  startQueue: (items) => ipcRenderer.invoke('queue:start', items),
  cancelQueue: () => ipcRenderer.invoke('queue:cancel'),
  isQueueRunning: () => ipcRenderer.invoke('queue:isRunning'),
  onQueueProgress: (cb) => subscribe('queue:progress', cb),
  onQueueLog: (cb) => subscribe('queue:log', cb),
  onJobStatus: (cb) => subscribe('queue:job-status', cb),
  onJobDone: (cb) => subscribe('queue:job-done', cb),
  onQueueFinished: (cb) => subscribe('queue:finished', cb)
}

contextBridge.exposeInMainWorld('mencoder', api)
