import { analyzeSource } from '../ffmpeg/probe'
import { analyzeSequence } from '../ffmpeg/sequence'
import type { PreparedImportItem } from '@shared/import'
import { scanPaths } from './scanPaths'

export async function prepareImportItems(paths: string[]): Promise<PreparedImportItem[]> {
  const discovered = await scanPaths(paths)
  const items: PreparedImportItem[] = []

  for (const d of discovered) {
    try {
      if (d.sourceType === 'sequence') {
        const seq = await analyzeSequence(d.sourcePath, undefined, {
          inputPattern: d.sequenceInputPattern
        })
        const analysis = await analyzeSource('sequence', d.sourcePath, {
          frameCount: seq.frameCount,
          sequenceStartFrame: seq.sequenceStartFrame,
          sequenceEndFrame: seq.sequenceEndFrame,
          sourceName: d.displayName
        })
        items.push({
          sourceType: d.sourceType,
          sourcePath: d.sourcePath,
          displayName: d.displayName,
          sequenceInputPattern: d.sequenceInputPattern,
          analysis
        })
      } else {
        const analysis = await analyzeSource('video', d.sourcePath)
        items.push({
          sourceType: d.sourceType,
          sourcePath: d.sourcePath,
          displayName: d.displayName,
          analysis
        })
      }
    } catch (err) {
      items.push({
        sourceType: d.sourceType,
        sourcePath: d.sourcePath,
        displayName: d.displayName,
        error: err instanceof Error ? err.message : String(err)
      })
    }
  }

  return items
}
