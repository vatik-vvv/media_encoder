import { extensionForFormat } from './encodeSettingsHelpers'
import type { OutputFormat } from './types'

function fileExt(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : ''
}

export function fileBase(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(0, i) : name
}

function splitDirFile(fullPath: string): { dir: string; file: string } {
  const normalized = fullPath.replace(/\//g, '\\')
  const sep = normalized.lastIndexOf('\\')
  if (sep < 0) return { dir: '', file: normalized }
  return { dir: normalized.slice(0, sep), file: normalized.slice(sep + 1) }
}

export function joinDirFile(dir: string, file: string): string {
  const d = dir.replace(/[\\/]+$/, '')
  const f = file.replace(/^[\\/]+/, '')
  return d ? `${d}\\${f}` : f
}

/** Case-insensitive path key for Windows comparisons. */
export function normalizeOutputPath(fullPath: string): string {
  return fullPath.replace(/\//g, '\\').toLowerCase()
}

export function defaultOutputFileName(sourceName: string, format: OutputFormat = 'mp4_h264'): string {
  const base = sourceName.trim() || 'output'
  const ext = extensionForFormat(format)
  return fileExt(base) === ext ? base : `${base}${ext}`
}

export function ensureOutputExtension(fileName: string, format: OutputFormat = 'mp4_h264'): string {
  const trimmed = fileName.trim()
  const ext = extensionForFormat(format)
  if (!trimmed) return `output${ext}`
  const currentExt = fileExt(trimmed)
  if (!currentExt) return `${trimmed}${ext}`
  if (currentExt !== ext) return `${fileBase(trimmed)}${ext}`
  return trimmed
}

/** Force the file extension on a full path to match the output format (e.g. ProRes → .mov). */
export function applyFormatToOutputPath(fullPath: string, format: OutputFormat): string {
  const normalized = fullPath.replace(/\//g, '\\')
  const sep = normalized.lastIndexOf('\\')
  const dir = sep < 0 ? '' : normalized.slice(0, sep)
  const file = sep < 0 ? normalized : normalized.slice(sep + 1)
  const fileName = ensureOutputExtension(file, format)
  return joinDirFile(dir, fileName)
}

export function numberedFileName(stem: string, suffix: number, ext: string): string {
  const e = ext || '.mp4'
  return suffix <= 0 ? `${stem}${e}` : `${stem} (${suffix})${e}`
}

export interface OutputPathParts {
  outputDirOverride?: string
  outputFileName: string
  outputFormat?: OutputFormat
}

export function resolveOutputLocation(
  templateFullPath: string,
  parts: OutputPathParts
): { dir: string; fileName: string; fullPath: string } {
  const { dir: templateDir, file: templateBase } = splitDirFile(templateFullPath)
  const format = parts.outputFormat ?? 'mp4_h264'
  const fileName = ensureOutputExtension(parts.outputFileName || templateBase, format)
  const dir = parts.outputDirOverride || templateDir
  return { dir, fileName, fullPath: joinDirFile(dir, fileName) }
}

export function sourceBaseName(sourceName: string): string {
  return fileBase(sourceName.trim() || 'output')
}

/**
 * Pick the first file name in dir that is not in occupiedPaths and not on disk.
 * Uses (1), (2), … suffixes before the extension.
 */
export function pickNonConflictingFileName(
  desiredFileName: string,
  dir: string,
  occupiedPaths: Set<string>,
  existsOnDisk: (fullPath: string) => boolean,
  format: OutputFormat = 'mp4_h264'
): string {
  const safe = ensureOutputExtension(desiredFileName, format)
  const ext = fileExt(safe) || extensionForFormat(format)
  const stem = fileBase(safe)

  for (let suffix = 0; suffix < 1000; suffix++) {
    const fileName = numberedFileName(stem, suffix, ext)
    const fullPath = joinDirFile(dir, fileName)
    const key = normalizeOutputPath(fullPath)
    if (occupiedPaths.has(key)) continue
    if (existsOnDisk(fullPath)) continue
    return fileName
  }

  return numberedFileName(stem, 999, ext)
}
