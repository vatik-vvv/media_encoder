import type { ImportReviewItem } from '@shared/import'
import { resolveOutputLocation } from '@shared/outputPath'
import type { AppSettings, QueueItem } from '@shared/types'
import { buildQueueItem } from './buildQueueItem'

export async function reviewItemToQueueItem(
  item: ImportReviewItem,
  settings: AppSettings,
  queueIndex: number
): Promise<QueueItem | null> {
  if (!item.analysis || item.error) return null
  const {
    id: _id,
    selected: _s,
    displayName: _d,
    error: _e,
    sourceType,
    sourcePath,
    sequenceInputPattern,
    analysis,
    outputDirOverride,
    outputFileName,
    ...encodeSettings
  } = item

  const queueItem = buildQueueItem(
    sourceType,
    sourcePath,
    analysis,
    encodeSettings,
    settings,
    item.audioPath
  )

  const preview = await window.mencoder.previewTemplate(
    settings.outputTemplate,
    { ...queueItem, ...encodeSettings, analysis },
    queueIndex
  )
  const { fullPath } = resolveOutputLocation(preview.path, {
    outputDirOverride,
    outputFileName,
    outputFormat: encodeSettings.outputFormat
  })

  return {
    ...queueItem,
    ...encodeSettings,
    sequenceInputPattern,
    outputDirOverride,
    outputFileName,
    outputPathOverride: fullPath
  }
}
