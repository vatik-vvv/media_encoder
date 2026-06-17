import { readdir, stat } from 'fs/promises'
import { extname, basename, dirname, join, normalize } from 'path'
import type { DiscoveredSource } from '@shared/import'
import type { SourceType } from '@shared/types'
import { groupImageSequenceFiles } from '@shared/sequenceGrouping'

const VIDEO_EXTS = new Set([
  '.mov',
  '.mp4',
  '.mkv',
  '.avi',
  '.webm',
  '.m4v',
  '.wmv',
  '.mpg',
  '.mpeg',
  '.mxf'
])

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.tif', '.tiff', '.exr', '.dpx', '.tga'])

function isVideoFile(name: string): boolean {
  return VIDEO_EXTS.has(extname(name).toLowerCase())
}

function isImageFile(name: string): boolean {
  return IMAGE_EXTS.has(extname(name).toLowerCase())
}

function sourceKey(type: SourceType, path: string, sequenceInputPattern?: string): string {
  const base = `${type}:${normalize(path).toLowerCase()}`
  if (!sequenceInputPattern) return base
  return `${base}:${normalize(sequenceInputPattern).toLowerCase()}`
}

function addSequenceSource(
  found: Map<string, DiscoveredSource>,
  folderPath: string,
  displayName: string,
  sequenceInputPattern?: string
): void {
  const key = sourceKey('sequence', folderPath, sequenceInputPattern)
  if (found.has(key)) return
  found.set(key, {
    sourceType: 'sequence',
    sourcePath: folderPath,
    displayName,
    sequenceInputPattern
  })
}

async function scanDirectory(
  dirPath: string,
  found: Map<string, DiscoveredSource>
): Promise<void> {
  const normalizedDir = normalize(dirPath)
  let entries
  try {
    entries = await readdir(normalizedDir, { withFileTypes: true })
  } catch {
    return
  }

  const imageFiles = entries.filter((e) => e.isFile() && isImageFile(e.name)).map((e) => e.name)

  for (const entry of entries) {
    const fullPath = join(normalizedDir, entry.name)
    if (entry.isFile() && isVideoFile(entry.name)) {
      const key = sourceKey('video', fullPath)
      if (!found.has(key)) {
        found.set(key, {
          sourceType: 'video',
          sourcePath: fullPath,
          displayName: basename(fullPath)
        })
      }
    }
  }

  if (imageFiles.length >= 2) {
    const groups = groupImageSequenceFiles(imageFiles)
    const folderName = basename(normalizedDir)

    if (groups.length > 0) {
      for (const group of groups) {
        const inputPattern = join(normalizedDir, group.filePattern)
        const displayName =
          groups.length === 1 && group.label === folderName ? folderName : group.label
        addSequenceSource(found, normalizedDir, displayName, inputPattern)
      }
      return
    }

    addSequenceSource(found, normalizedDir, folderName)
    return
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      await scanDirectory(join(normalizedDir, entry.name), found)
    }
  }
}

async function addPath(inputPath: string, found: Map<string, DiscoveredSource>): Promise<void> {
  const normalized = normalize(inputPath)
  let st
  try {
    st = await stat(normalized)
  } catch {
    return
  }

  if (st.isFile()) {
    const name = basename(normalized)
    if (isVideoFile(name)) {
      const key = sourceKey('video', normalized)
      if (!found.has(key)) {
        found.set(key, {
          sourceType: 'video',
          sourcePath: normalized,
          displayName: name
        })
      }
      return
    }
    if (isImageFile(name)) {
      await scanDirectory(dirname(normalized), found)
      return
    }
    return
  }

  if (st.isDirectory()) {
    await scanDirectory(normalized, found)
  }
}

export async function scanPaths(paths: string[]): Promise<DiscoveredSource[]> {
  const found = new Map<string, DiscoveredSource>()
  for (const p of paths) {
    if (p) await addPath(p, found)
  }
  return Array.from(found.values()).sort((a, b) =>
    a.displayName.localeCompare(b.displayName, undefined, { numeric: true })
  )
}
