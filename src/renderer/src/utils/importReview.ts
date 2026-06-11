import type { ImportReviewItem, PreparedImportItem } from '@shared/import'
import { defaultOutputFileName } from '@shared/outputPath'
import type { AppSettings, EncodeSettings } from '@shared/types'
import { createDefaultEncodeSettings } from '../defaults'
import { newId } from './buildQueueItem'

export function preparedToReviewItems(
  prepared: PreparedImportItem[],
  defaults: EncodeSettings,
  settings: AppSettings
): ImportReviewItem[] {
  return prepared.map((p) => {
    const sourceType = p.sourceType
    const fresh = p.analysis
      ? createDefaultEncodeSettings(sourceType, settings, p.analysis)
      : createDefaultEncodeSettings(sourceType, settings)

    const sourceName = p.analysis?.sourceName ?? p.displayName

    return {
      id: newId(),
      selected: !p.error,
      sourceType: p.sourceType,
      sourcePath: p.sourcePath,
      displayName: p.displayName,
      analysis: p.analysis,
      error: p.error,
      outputFileName: defaultOutputFileName(sourceName, defaults.outputFormat),
      ...fresh,
      ...defaults,
      inputFpsMode: sourceType === 'sequence' ? 'preset' : defaults.inputFpsMode,
      inputFpsPreset: sourceType === 'sequence' ? 30 : defaults.inputFpsPreset
    }
  })
}
