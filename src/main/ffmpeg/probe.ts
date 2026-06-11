import { spawn } from 'child_process'
import { getFfprobePath } from './paths'
import type { SourceAnalysis, SourceType } from '@shared/types'
import { basename, dirname, extname } from 'path'

interface FfprobeStream {
  codec_type?: string
  width?: number
  height?: number
  r_frame_rate?: string
  avg_frame_rate?: string
  duration?: string
  nb_frames?: string
}

interface FfprobeOutput {
  streams?: FfprobeStream[]
  format?: { duration?: string }
}

function parseFps(rate?: string): number | undefined {
  if (!rate || rate === '0/0' || rate === 'N/A') return undefined
  const [num, den] = rate.split('/').map(Number)
  if (!den || den === 0) return undefined
  return Math.round((num / den) * 1000) / 1000
}

function runFfprobe(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(getFfprobePath(), args, { windowsHide: true })
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d) => (stdout += d.toString()))
    proc.stderr.on('data', (d) => (stderr += d.toString()))
    proc.on('close', (code) => {
      if (code === 0) resolve(stdout)
      else reject(new Error(stderr || `ffprobe exited ${code}`))
    })
    proc.on('error', reject)
  })
}

export async function probeVideo(filePath: string): Promise<SourceAnalysis> {
  const raw = await runFfprobe([
    '-v',
    'quiet',
    '-print_format',
    'json',
    '-show_streams',
    '-show_format',
    filePath
  ])
  const data: FfprobeOutput = JSON.parse(raw)
  const video = data.streams?.find((s) => s.codec_type === 'video')
  const hasAudio = data.streams?.some((s) => s.codec_type === 'audio') ?? false
  const duration = parseFloat(data.format?.duration ?? video?.duration ?? '0') || undefined
  const nbRaw = video?.nb_frames
  const nbFrames = nbRaw ? parseInt(nbRaw, 10) : undefined
  const detectedInputFps =
    parseFps(video?.avg_frame_rate) ?? parseFps(video?.r_frame_rate) ?? undefined

  const ext = extname(filePath).replace(/^\./, '')
  const sourceName = basename(filePath, extname(filePath))

  return {
    sourceType: 'video',
    sourcePath: filePath,
    width: video?.width,
    height: video?.height,
    duration,
    nbFrames: nbFrames && nbFrames > 0 ? nbFrames : undefined,
    detectedInputFps,
    hasAudio,
    sourceName,
    sourceDir: dirname(filePath),
    sourceExt: ext || 'mp4'
  }
}

export function buildAnalysisFromSequence(
  folderPath: string,
  frameCount: number,
  width?: number,
  height?: number,
  sequenceStartFrame?: number,
  sequenceEndFrame?: number
): SourceAnalysis {
  const sourceName = basename(folderPath)
  return {
    sourceType: 'sequence',
    sourcePath: folderPath,
    frameCount,
    sequenceStartFrame,
    sequenceEndFrame,
    width,
    height,
    sourceName,
    sourceDir: dirname(folderPath),
    sourceExt: 'sequence'
  }
}

export async function analyzeSource(
  sourceType: SourceType,
  sourcePath: string,
  sequenceMeta?: {
    frameCount: number
    width?: number
    height?: number
    sequenceStartFrame?: number
    sequenceEndFrame?: number
  }
): Promise<SourceAnalysis> {
  if (sourceType === 'video') {
    return probeVideo(sourcePath)
  }
  return buildAnalysisFromSequence(
    sourcePath,
    sequenceMeta?.frameCount ?? 0,
    sequenceMeta?.width,
    sequenceMeta?.height,
    sequenceMeta?.sequenceStartFrame,
    sequenceMeta?.sequenceEndFrame
  )
}
