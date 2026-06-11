import { existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

function findBinary(name: string): string {
  const exe = process.platform === 'win32' ? `${name}.exe` : name

  if (app.isPackaged) {
    const bundled = join(process.resourcesPath, 'ffmpeg', exe)
    if (existsSync(bundled)) return bundled
  }

  const devPaths = [
    join(process.cwd(), 'resources', 'ffmpeg', exe),
    join(__dirname, '../../resources/ffmpeg', exe),
    join(__dirname, '../../../resources/ffmpeg', exe)
  ]

  for (const p of devPaths) {
    if (existsSync(p)) return p
  }

  return name
}

export function getFfmpegPath(): string {
  return findBinary('ffmpeg')
}

export function getFfprobePath(): string {
  return findBinary('ffprobe')
}

export function getAppIconPath(): string {
  const ico = 'icon.ico'
  if (app.isPackaged) {
    const bundled = join(process.resourcesPath, ico)
    if (existsSync(bundled)) return bundled
  }
  const devPaths = [
    join(process.cwd(), 'resources', ico),
    join(__dirname, '../../resources/icon.ico'),
    join(__dirname, '../../../resources/icon.ico')
  ]
  for (const p of devPaths) {
    if (existsSync(p)) return p
  }
  return join(process.cwd(), 'resources', ico)
}
