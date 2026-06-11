import {
  ensureOutputExtension,
  fileBase,
  joinDirFile,
  normalizeOutputPath,
  pickNonConflictingFileName,
  resolveOutputLocation,
  type OutputPathParts
} from './outputPath'
import type { OutputFormat } from './types'

export interface OutputOccupancyEntry {
  fullPath: string
  /** Queue or import row id — excluded from conflicts against itself. */
  ownerId?: string
  sourcePath?: string
}

export interface OverwriteWarning {
  fullPath: string
  reason: 'disk' | 'source'
  label: string
}

export function buildOccupiedPathSet(
  entries: OutputOccupancyEntry[],
  excludeOwnerIds: Set<string> = new Set()
): Set<string> {
  const set = new Set<string>()
  for (const e of entries) {
    if (e.ownerId && excludeOwnerIds.has(e.ownerId)) continue
    set.add(normalizeOutputPath(e.fullPath))
  }
  return set
}

export function findOverwriteWarnings(
  items: { fullPath: string; sourcePath: string; label: string }[],
  existsOnDisk: (path: string) => boolean
): OverwriteWarning[] {
  const warnings: OverwriteWarning[] = []

  for (const item of items) {
    const key = normalizeOutputPath(item.fullPath)
    const sourceKey = normalizeOutputPath(item.sourcePath)

    if (key === sourceKey) {
      warnings.push({
        fullPath: item.fullPath,
        reason: 'source',
        label: `${item.label}: output would overwrite the source file`
      })
      continue
    }

    if (existsOnDisk(item.fullPath)) {
      warnings.push({
        fullPath: item.fullPath,
        reason: 'disk',
        label: `${item.label}: ${item.fullPath}`
      })
    }
  }

  return warnings
}

export function resolveUniqueFileNameForLocation(
  templateFullPath: string,
  parts: OutputPathParts,
  occupiedPaths: Set<string>,
  existsOnDisk: (fullPath: string) => boolean,
  format: OutputFormat = parts.outputFormat ?? 'mp4_h264'
): { fileName: string; fullPath: string; dir: string } {
  const loc = resolveOutputLocation(templateFullPath, { ...parts, outputFormat: format })
  const fileName = pickNonConflictingFileName(
    parts.outputFileName,
    loc.dir,
    occupiedPaths,
    existsOnDisk,
    format
  )
  const fullPath = joinDirFile(loc.dir, fileName)
  return { fileName, fullPath, dir: loc.dir }
}

export { ensureOutputExtension, fileBase }
