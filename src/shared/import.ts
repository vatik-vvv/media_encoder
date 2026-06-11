import type { EncodeSettings, SourceAnalysis, SourceType } from './types'

export interface ImportReviewItem extends EncodeSettings {
  id: string
  selected: boolean
  sourceType: SourceType
  sourcePath: string
  displayName: string
  analysis?: SourceAnalysis
  error?: string
  /** Custom output folder; file name is set separately. */
  outputDirOverride?: string
  outputFileName: string
}

export interface DiscoveredSource {
  sourceType: SourceType
  sourcePath: string
  displayName: string
}

export interface PreparedImportItem {
  sourceType: SourceType
  sourcePath: string
  displayName: string
  analysis?: SourceAnalysis
  error?: string
}
