import { readdir, stat } from 'fs/promises'
import { extname, basename, dirname, join, normalize } from 'path'
import type { DiscoveredSource } from '@shared/import'
import type { SourceType } from '@shared/types'

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

function sourceKey(type: SourceType, path: string): string {
  return `${type}:${normalize(path).toLowerCase()}`
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

  const imageCount = entries.filter((e) => e.isFile() && isImageFile(e.name)).length

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

  if (imageCount >= 2) {
    const key = sourceKey('sequence', normalizedDir)
    if (!found.has(key)) {
      found.set(key, {
        sourceType: 'sequence',
        sourcePath: normalizedDir,
        displayName: basename(normalizedDir)
      })
    }
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
