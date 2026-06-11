import { existsSync } from 'fs'
import { app, shell, BrowserWindow, ipcMain, dialog, nativeImage } from 'electron'
import { extensionForFormat } from '@shared/encodeSettingsHelpers'
import { normalizeOutputPath } from '@shared/outputPath'
import { join } from 'path'
import { getAppIconPath } from './ffmpeg/paths'
import { getSettings, setSettings, saveWindowBounds } from './settings/store'
import { buildTemplateContext, resolveOutputTemplate } from './template/resolveTemplate'
import { resolveInputFps, resolveOutputFps } from '@shared/fps'
import { probeFfmpegCapabilities } from './ffmpeg/capabilities'
import { QueueRunner } from './queue/queueRunner'
import { prepareImportItems } from './import/prepareImport'
import type { AppSettings, OutputFormat, QueueItem } from '@shared/types'

const APP_NAME = 'MEDIA ENCODER'

const isDev = !app.isPackaged
const queueRunner = new QueueRunner()

function createWindow(): void {
  const iconPath = getAppIconPath()
  const icon = nativeImage.createFromPath(iconPath)
  const saved = getSettings().windowBounds
  const width = saved?.width ?? 1400
  const height = saved?.height ?? 920

  const mainWindow = new BrowserWindow({
    width,
    height,
    x: saved?.x,
    y: saved?.y,
    minWidth: 1000,
    minHeight: 680,
    title: APP_NAME,
    show: false,
    autoHideMenuBar: true,
    icon: icon.isEmpty() ? undefined : icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  let boundsTimer: ReturnType<typeof setTimeout> | undefined
  const persistBounds = (): void => {
    if (boundsTimer) clearTimeout(boundsTimer)
    boundsTimer = setTimeout(() => {
      if (mainWindow.isDestroyed()) return
      const b = mainWindow.getBounds()
      saveWindowBounds({ width: b.width, height: b.height, x: b.x, y: b.y })
    }, 400)
  }

  mainWindow.on('resize', persistBounds)
  mainWindow.on('move', persistBounds)
  mainWindow.on('close', () => {
    if (mainWindow.isDestroyed()) return
    const b = mainWindow.getBounds()
    saveWindowBounds({ width: b.width, height: b.height, x: b.x, y: b.y })
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerIpc(): void {
  ipcMain.handle('dialog:openVideo', async () => {
    const r = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Video', extensions: ['mov', 'mp4', 'mkv', 'avi', 'webm', 'm4v', 'wmv'] }]
    })
    return r.canceled ? [] : r.filePaths
  })

  ipcMain.handle('dialog:openSequence', async () => {
    const r = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return r.canceled ? null : r.filePaths[0]
  })

  ipcMain.handle('dialog:openOutputFolder', async () => {
    const r = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return r.canceled ? null : r.filePaths[0]
  })

  ipcMain.handle('fs:pathsExist', async (_, paths: string[]) => {
    const result: Record<string, boolean> = {}
    for (const p of paths) {
      if (!p) continue
      result[normalizeOutputPath(p)] = existsSync(p)
    }
    return result
  })

  ipcMain.handle('dialog:openAudio', async () => {
    const r = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Audio', extensions: ['wav', 'mp3', 'aac', 'm4a', 'flac', 'ogg'] }]
    })
    return r.canceled ? null : r.filePaths[0]
  })

  ipcMain.handle('dialog:saveOutput', async (_, format?: OutputFormat) => {
    const ext = extensionForFormat(format ?? 'mp4_h264').slice(1)
    const r = await dialog.showSaveDialog({
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }]
    })
    return r.canceled ? null : r.filePath
  })

  ipcMain.handle('shell:revealInFolder', async (_, filePath: string) => {
    if (!filePath || !existsSync(filePath)) return { ok: false }
    shell.showItemInFolder(filePath)
    return { ok: true }
  })

  ipcMain.handle('import:prepare', async (_, paths: string[]) => {
    return prepareImportItems(paths)
  })

  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:set', (_, partial: Partial<AppSettings>) => setSettings(partial))

  ipcMain.handle('template:preview', (_, template: string, item: QueueItem, index: number) => {
    const analysis = item.analysis
    if (!analysis) return { path: '', error: 'No analysis' }
    const inputFps = resolveInputFps(item, analysis)
    const outputFps = resolveOutputFps(item, analysis)
    const path = resolveOutputTemplate(
      template,
      buildTemplateContext({
        source_path: analysis.sourcePath,
        source_dir: analysis.sourceDir,
        source_name: analysis.sourceName,
        source_ext: analysis.sourceExt,
        input_fps: inputFps,
        output_fps: outputFps,
        outputFormat: item.outputFormat,
        proResProfile: item.proResProfile,
        hapVariant: item.hapVariant,
        compressionLevel: item.compressionLevel,
        crf: item.crf,
        index,
        width: analysis.width,
        height: analysis.height
      }),
      item.outputFormat
    )
    return { path }
  })

  ipcMain.handle('queue:start', async (_, items: QueueItem[]) => {
    void queueRunner.start(items)
    return { started: true }
  })

  ipcMain.handle('queue:cancel', () => {
    queueRunner.cancel()
    return { cancelled: true }
  })

  ipcMain.handle('queue:isRunning', () => queueRunner.isRunning())
}

app.whenReady().then(() => {
  app.setName(APP_NAME)
  void probeFfmpegCapabilities()
  registerIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
