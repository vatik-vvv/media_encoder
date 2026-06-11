import type { ImportReviewItem } from '@shared/import'
import { buildOccupiedPathSet, resolveUniqueFileNameForLocation } from '@shared/outputPathConflict'
import { normalizeOutputPath } from '@shared/outputPath'
import type { AppSettings, QueueItem } from '@shared/types'
import { queueOccupancy } from './queueOccupancy'

export interface FinalizeImportContext {
  settings: AppSettings
  queue: QueueItem[]
  resolvedQueuePaths: Record<string, string>
  queueStartIndex: number
  pathsExistOnDisk: (paths: string[]) => Promise<Record<string, boolean>>
}

function toPreviewQueueItem(item: ImportReviewItem): QueueItem {
  const {
    id,
    selected: _s,
    displayName: _d,
    error: _e,
    sourceType,
    sourcePath,
    analysis,
    outputDirOverride,
    outputFileName,
    ...encode
  } = item
  return {
    id,
    sourceType,
    sourcePath,
    analysis,
    status: 'pending',
    outputDirOverride,
    outputFileName,
    ...encode
  }
}

async function templatePathForItem(
  item: ImportReviewItem,
  template: string,
  index: number
): Promise<string> {
  const preview = await window.mencoder.previewTemplate(
    template,
    toPreviewQueueItem(item),
    index
  )
  if (!preview.path) {
    throw new Error(`Could not resolve output template for ${item.displayName}`)
  }
  return preview.path
}

/**
 * Assigns unique output file names (with (1), (2), …) against queue, disk, batch, and source path.
 */
export async function finalizeImportItemsForQueue(
  selected: ImportReviewItem[],
  ctx: FinalizeImportContext
): Promise<ImportReviewItem[]> {
  const existsMap: Record<string, boolean> = {}
  const occupancy: OutputOccupancyEntry[] = queueOccupancy(ctx.queue, ctx.resolvedQueuePaths)
  const updated: ImportReviewItem[] = []
  let index = ctx.queueStartIndex

  const preloadPaths = occupancy.map((o) => o.fullPath)
  if (preloadPaths.length > 0) {
    Object.assign(existsMap, await ctx.pathsExistOnDisk(preloadPaths))
  }

  for (const item of selected) {
    if (!item.analysis || item.error) continue
    index++

    const templatePath = await templatePathForItem(item, ctx.settings.outputTemplate, index)
    const excludeSelf = new Set([item.id])
    const occupied = buildOccupiedPathSet(occupancy, excludeSelf)
    const sourceKey = normalizeOutputPath(item.sourcePath)

    const existsOnDisk = (fullPath: string): boolean => {
      const key = normalizeOutputPath(fullPath)
      if (key === sourceKey) return true
      return existsMap[key] === true
    }

    const final = resolveUniqueFileNameForLocation(
      templatePath,
      {
        outputDirOverride: item.outputDirOverride,
        outputFileName: item.outputFileName,
        outputFormat: item.outputFormat
      },
      occupied,
      existsOnDisk,
      item.outputFormat
    )

    const diskCheck = await ctx.pathsExistOnDisk([final.fullPath])
    Object.assign(existsMap, diskCheck)
    existsMap[normalizeOutputPath(final.fullPath)] = true

    updated.push({ ...item, outputFileName: final.fileName })
    occupancy.push({
      fullPath: final.fullPath,
      ownerId: item.id,
      sourcePath: item.sourcePath
    })
  }

  return updated
}
