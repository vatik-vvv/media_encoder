import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ffmpeg = join(root, 'resources', 'ffmpeg', 'ffmpeg.exe')

if (!existsSync(ffmpeg)) {
  console.log('FFmpeg not found — downloading full build (required for HAP)...')
  const script = join(root, 'scripts', 'fetch-ffmpeg.ps1')
  const result = spawnSync(
    'powershell',
    ['-ExecutionPolicy', 'Bypass', '-File', script],
    { stdio: 'inherit', cwd: root }
  )
  if (result.status !== 0) {
    console.error('Failed to download FFmpeg. Run: npm run fetch-ffmpeg')
    process.exit(result.status ?? 1)
  }
}
