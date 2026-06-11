import {
  buildOccupiedPathSet,
  resolveUniqueFileNameForLocation
} from '@shared/outputPathConflict'
import { normalizeOutputPath, resolveOutputLocation } from '@shared/outputPath'
import type { AppSettings, QueueItem } from '@shared/types'
import { newId } from './buildQueueItem'
import { queueOccupancy } from './queueOccupancy'

function desiredOutputFileName(source: QueueItem, templatePath: string): string {
  if (source.outputFileName?.trim()) return source.outputFileName.trim()

  if (source.outputPathOverride) {
    const normalized = source.outputPathOverride.replace(/\//g, '\\')
    const sep = normalized.lastIndexOf('\\')
    return sep < 0 ? normalized : normalized.slice(sep + 1)
  }

  return resolveOutputLocation(templatePath, {
    outputDirOverride: source.outputDirOverride,
    outputFileName: '',
    outputFormat: source.outputFormat
  }).fileName
}

function desiredOutputDir(source: QueueItem, templatePath: string): string | undefined {
  if (source.outputDirOverride) return source.outputDirOverride

  if (source.outputPathOverride) {
    const normalized = source.outputPathOverride.replace(/\//g, '\\')
    const sep = normalized.lastIndexOf('\\')
    if (sep >= 0) return normalized.slice(0, sep)
  }

  return resolveOutputLocation(templatePath, {
    outputDirOverride: source.outputDirOverride,
    outputFileName: desiredOutputFileName(source, templatePath),
    outputFormat: source.outputFormat
  }).dir
}

export async function duplicateQueueItem(
  source: QueueItem,
  queue: QueueItem[],
  resolvedQueuePaths: Record<string, string>,
  settings: AppSettings,
  queueIndex: number
): Promise<QueueItem> {
  const {
    id: _id,
    status: _status,
    progress: _progress,
    errorMessage: _error,
    encodeDurationMs: _duration,
    ...encodeFields
  } = source

  const draft: QueueItem = {
    ...encodeFields,
    id: newId(),
    status: 'pending'
  }

  const preview = await window.mencoder.previewTemplate(
    settings.outputTemplate,
    draft,
    queueIndex
  )
  if (!preview.path) {
    throw new Error('Could not resolve output template for duplicate')
  }

  const occupancy = queueOccupancy(queue, resolvedQueuePaths)
  const preloadPaths = occupancy.map((o) => o.fullPath)
  const existsMap =
    preloadPaths.length > 0 ? await window.mencoder.pathsExistOnDisk(preloadPaths) : {}
  const sourceKey = normalizeOutputPath(source.sourcePath)

  const existsOnDisk = (fullPath: string): boolean => {
    const key = normalizeOutputPath(fullPath)
    if (key === sourceKey) return true
    return existsMap[key] === true
  }

  const occupied = buildOccupiedPathSet(occupancy)
  const fileName = desiredOutputFileName(source, preview.path)
  const dir = desiredOutputDir(source, preview.path)

  const final = resolveUniqueFileNameForLocation(
    preview.path,
    {
      outputDirOverride: dir,
      outputFileName: fileName,
      outputFormat: source.outputFormat
    },
    occupied,
    existsOnDisk,
    source.outputFormat
  )

  return {
    ...draft,
    outputDirOverride: dir,
    outputFileName: final.fileName,
    outputPathOverride: final.fullPath
  }
}
