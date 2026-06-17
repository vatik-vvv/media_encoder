import { readdir, writeFile, unlink, mkdir } from 'fs/promises'
import { join, extname, basename } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'
import type { ResolvedTrim } from '@shared/trim'
import {
  filterBasenamesForPattern,
  parseFrameSequenceFile,
  filePatternForParsed
} from '@shared/sequenceGrouping'

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.tif', '.tiff', '.exr'])

export interface SequenceInfo {
  frameCount: number
  sequenceStartFrame: number
  sequenceEndFrame: number
  pattern?: { inputPath: string; startNumber?: number }
  concatListPath?: string
  firstFramePath?: string
  trim?: ResolvedTrim
}

function isImageFile(name: string): boolean {
  return IMAGE_EXTS.has(extname(name).toLowerCase())
}

export function frameNumberFromBasename(name: string): number | undefined {
  return parseFrameSequenceFile(basename(name))?.frame
}

export function detectSequenceFrameRange(filePaths: string[]): {
  startFrame: number
  endFrame: number
} {
  if (filePaths.length === 0) return { startFrame: 1, endFrame: 1 }

  const first = frameNumberFromBasename(filePaths[0])
  const last = frameNumberFromBasename(filePaths[filePaths.length - 1])
  if (first != null && last != null) {
    return { startFrame: first, endFrame: last }
  }

  return { startFrame: 1, endFrame: filePaths.length }
}

function detectPattern(
  folderPath: string,
  files: string[]
): { inputPath: string; startNumber?: number } | undefined {
  if (files.length === 0) return undefined

  const first = basename(files[0])
  const parsed = parseFrameSequenceFile(first)
  if (!parsed) return undefined

  const inputPath = join(folderPath, filePatternForParsed(parsed))
  return { inputPath, startNumber: parsed.frame }
}

export interface AnalyzeSequenceOptions {
  inputPattern?: string
}

function sliceFramesForTrim(
  allFrames: string[],
  trim: ResolvedTrim,
  sequenceStartFrame: number
): string[] {
  const startIdx = trim.startFrame - sequenceStartFrame
  const endIdx = trim.endFrame - sequenceStartFrame + 1
  return allFrames.slice(startIdx, endIdx)
}

export async function analyzeSequence(
  folderPath: string,
  trim?: ResolvedTrim | null,
  options?: AnalyzeSequenceOptions
): Promise<SequenceInfo> {
  const allBasenames = (await readdir(folderPath, { withFileTypes: true }))
    .filter((e) => e.isFile() && isImageFile(e.name))
    .map((e) => e.name)

  const matchedBasenames = options?.inputPattern
    ? filterBasenamesForPattern(allBasenames, basename(options.inputPattern))
    : allBasenames

  const allFrames = matchedBasenames
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((f) => join(folderPath, f))

  if (allFrames.length === 0) {
    throw new Error('No image frames found in folder')
  }

  const { startFrame: sequenceStartFrame, endFrame: sequenceEndFrame } =
    detectSequenceFrameRange(allFrames)

  let frames = allFrames
  if (trim) {
    frames = sliceFramesForTrim(allFrames, trim, sequenceStartFrame)
    if (frames.length === 0) {
      throw new Error('Trim range excludes all frames')
    }
  }

  const pattern = options?.inputPattern
    ? {
        inputPath: options.inputPattern,
        startNumber: parseFrameSequenceFile(basename(allFrames[0]))?.frame
      }
    : detectPattern(folderPath, frames)
  if (pattern) {
    return {
      frameCount: frames.length,
      sequenceStartFrame,
      sequenceEndFrame,
      pattern,
      firstFramePath: frames[0],
      trim: trim ?? undefined
    }
  }

  const listDir = join(tmpdir(), 'mencoder')
  await mkdir(listDir, { recursive: true })
  const listPath = join(listDir, `concat-${randomBytes(8).toString('hex')}.txt`)
  const lines = frames
    .map((f) => `file '${f.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`)
    .join('\n')
  await writeFile(listPath, lines, 'utf8')

  return {
    frameCount: frames.length,
    sequenceStartFrame,
    sequenceEndFrame,
    concatListPath: listPath,
    firstFramePath: frames[0],
    trim: trim ?? undefined
  }
}

export async function cleanupConcatList(path?: string): Promise<void> {
  if (!path) return
  try {
    await unlink(path)
  } catch {
    /* ignore */
  }
}
