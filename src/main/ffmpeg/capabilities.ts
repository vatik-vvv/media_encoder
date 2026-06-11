import { spawn } from 'child_process'
import { getFfmpegPath } from './paths'

export interface FfmpegCapabilities {
  hasHapEncoder: boolean
}

let caps: FfmpegCapabilities = { hasHapEncoder: false }

export function getFfmpegCapabilities(): FfmpegCapabilities {
  return caps
}

function runFfmpeg(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(getFfmpegPath(), args, { windowsHide: true })
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d) => (stdout += d.toString()))
    proc.stderr.on('data', (d) => (stderr += d.toString()))
    proc.on('close', (code) => {
      const out = stdout + stderr
      if (code === 0 || out.length > 0) resolve(out)
      else reject(new Error(stderr || `ffmpeg exited ${code}`))
    })
    proc.on('error', reject)
  })
}

export async function probeFfmpegCapabilities(): Promise<FfmpegCapabilities> {
  try {
    const help = await runFfmpeg(['-hide_banner', '-h', 'encoder=hap'])
    caps = { hasHapEncoder: help.includes('Encoder hap [') }
  } catch {
    caps = { hasHapEncoder: false }
  }
  return caps
}
