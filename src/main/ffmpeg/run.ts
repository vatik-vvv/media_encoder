import { spawn, ChildProcess } from 'child_process'
import { getFfmpegPath } from './paths'

export interface EncodeProgress {
  percent: number
  timeSec: number
  logLine: string
}

function parseTimeToSec(time: string): number {
  const normalized = time.trim().replace(',', '.')
  const parts = normalized.split(':')
  if (parts.length < 3) return 0
  const [h, m, s] = parts
  return parseInt(h, 10) * 3600 + parseInt(m, 10) * 60 + parseFloat(s)
}

function parseProgressLine(
  line: string,
  durationSec: number,
  totalFrames?: number
): number | null {
  const timeMatch = line.match(/time=(\d{1,2}:\d{2}:\d{2}(?:[.,]\d+)?)/)
  if (timeMatch && durationSec > 0) {
    const timeSec = parseTimeToSec(timeMatch[1])
    return Math.min(100, (timeSec / durationSec) * 100)
  }
  if (totalFrames && totalFrames > 0) {
    const frameMatch = line.match(/frame=\s*(\d+)/)
    if (frameMatch) {
      const frame = parseInt(frameMatch[1], 10)
      return Math.min(100, (frame / totalFrames) * 100)
    }
  }
  return null
}

export class FfmpegRunner {
  private proc: ChildProcess | null = null
  private cancelled = false

  run(
    args: string[],
    durationSec: number,
    onProgress: (p: EncodeProgress) => void,
    onLog: (line: string) => void,
    totalFrames?: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cancelled = false
      const ffmpeg = getFfmpegPath()
      onLog(`> ${ffmpeg} ${args.join(' ')}`)

      this.proc = spawn(ffmpeg, args, { windowsHide: true })
      let stderrBuf = ''

      let lastPercent = -1

      const flushProgress = (line: string): void => {
        if (!line.trim()) return
        onLog(line)
        const percent = parseProgressLine(line, durationSec, totalFrames)
        if (percent == null) return
        const rounded = Math.floor(percent)
        if (rounded <= lastPercent) return
        lastPercent = rounded
        const timeMatch = line.match(/time=(\d{1,2}:\d{2}:\d{2}(?:[.,]\d+)?)/)
        const timeSec = timeMatch ? parseTimeToSec(timeMatch[1]) : 0
        onProgress({ percent, timeSec, logLine: line })
      }

      this.proc.stderr?.on('data', (chunk: Buffer) => {
        stderrBuf += chunk.toString()
        const parts = stderrBuf.split(/\r|\n/)
        stderrBuf = parts.pop() ?? ''
        for (const part of parts) {
          flushProgress(part)
        }
      })

      this.proc.on('close', (code) => {
        if (stderrBuf.trim()) flushProgress(stderrBuf)
        this.proc = null
        if (this.cancelled) {
          reject(new Error('Cancelled'))
          return
        }
        if (code === 0) resolve()
        else reject(new Error(`FFmpeg exited with code ${code}`))
      })

      this.proc.on('error', (err) => {
        this.proc = null
        reject(err)
      })
    })
  }

  cancel(): void {
    this.cancelled = true
    if (this.proc) {
      this.proc.kill('SIGTERM')
      setTimeout(() => this.proc?.kill('SIGKILL'), 2000)
    }
  }
}
