import type { OutputOccupancyEntry } from '@shared/outputPathConflict'
import type { QueueItem } from '@shared/types'

export function queueOccupancy(
  queue: QueueItem[],
  resolvedQueuePaths: Record<string, string>
): OutputOccupancyEntry[] {
  return queue
    .map((q) => ({
      fullPath: q.outputPathOverride ?? resolvedQueuePaths[q.id] ?? '',
      ownerId: q.id,
      sourcePath: q.sourcePath
    }))
    .filter((e) => e.fullPath.length > 0)
}
