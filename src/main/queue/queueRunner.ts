import { BrowserWindow } from 'electron'
import { analyzeSequence, cleanupConcatList, type SequenceInfo } from '../ffmpeg/sequence'
import { analyzeSource } from '../ffmpeg/probe'
import { getFfmpegCapabilities } from '../ffmpeg/capabilities'
import { buildFfmpegArgs } from '../ffmpeg/buildArgs'
import { FfmpegRunner } from '../ffmpeg/run'
import { buildTemplateContext, ensureOutputDir, resolveOutputTemplate } from '../template/resolveTemplate'
import { getSettings } from '../settings/store'
import { resolveInputFps, resolveOutputFps } from '@shared/fps'
import { resolveTrimFromSettings } from '@shared/trim'
import { applyFormatToOutputPath, normalizeOutputPath } from '@shared/outputPath'
import type { QueueItem } from '@shared/types'

export class QueueRunner {
  private runner = new FfmpegRunner()
  private running = false
  private cancelAll = false

  isRunning(): boolean {
    return this.running
  }

  private send(channel: string, payload: unknown): void {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(channel, payload)
    }
  }

  async start(items: QueueItem[]): Promise<void> {
    if (this.running) return
    this.running = true
    this.cancelAll = false

    const settings = getSettings()
    let index = 0

    for (const item of items) {
      if (this.cancelAll) break
      if (item.status === 'done') {
        index++
        continue
      }

      index++
      this.send('queue:job-status', { id: item.id, status: 'running', progress: 0 })

      let sequenceInfo: SequenceInfo | undefined
      let concatPath: string | undefined

      try {
        if (item.outputFormat === 'hap' && !getFfmpegCapabilities().hasHapEncoder) {
          throw new Error(
            'HAP encoding is not available in the bundled FFmpeg (essentials build). ' +
              'Run scripts/fetch-ffmpeg.ps1 to install the full build, then restart the app.'
          )
        }

        let analysis = item.analysis
        const trim = resolveTrimFromSettings(item, analysis)

        if (!analysis) {
          if (item.sourceType === 'sequence') {
            sequenceInfo = await analyzeSequence(item.sourcePath, trim)
            concatPath = sequenceInfo.concatListPath
            analysis = await analyzeSource(item.sourceType, item.sourcePath, {
              frameCount: sequenceInfo.frameCount,
              sequenceStartFrame: sequenceInfo.sequenceStartFrame,
              sequenceEndFrame: sequenceInfo.sequenceEndFrame
            })
          } else {
            analysis = await analyzeSource(item.sourceType, item.sourcePath)
          }
        } else if (item.sourceType === 'sequence') {
          sequenceInfo = await analyzeSequence(item.sourcePath, trim)
          concatPath = sequenceInfo.concatListPath
        }

        const inputFps = resolveInputFps(item, analysis)
        const outputFps = resolveOutputFps(item, analysis)

        const outputPath = applyFormatToOutputPath(
          item.outputPathOverride ??
            resolveOutputTemplate(
              settings.outputTemplate,
              buildTemplateContext({
                source_path: analysis.sourcePath,
                source_dir: analysis.sourceDir,
                source_name: analysis.sourceName,
                source_ext: analysis.sourceExt,
                input_fps: inputFps,
                output_fps: outputFps,
                outputFormat: item.outputFormat,
                proResProfile: item.proResProfile,
                hapVariant: item.hapVariant,
                compressionLevel: item.compressionLevel,
                crf: item.crf,
                index,
                width: analysis.width,
                height: analysis.height
              }),
              item.outputFormat
            ),
          item.outputFormat
        )

        await ensureOutputDir(outputPath)

        if (normalizeOutputPath(outputPath) === normalizeOutputPath(item.sourcePath)) {
          this.send('queue:log', {
            id: item.id,
            line: `Warning: output path is the same as the source file — source may be overwritten.`
          })
        }

        const encodeStartedAt = Date.now()

        const outputFpsForDuration = outputFps
        let durationSec = analysis.duration
        if (trim) {
          durationSec = trim.durationSec
        } else if (!durationSec || durationSec <= 0) {
          if (analysis.frameCount && outputFpsForDuration > 0) {
            durationSec = analysis.frameCount / outputFpsForDuration
          } else if (analysis.nbFrames && inputFps > 0) {
            durationSec = analysis.nbFrames / inputFps
          } else {
            durationSec = 60
          }
        }

        const totalFrames = trim
          ? trim.frameCount
          : analysis.frameCount ?? analysis.nbFrames

        const args = buildFfmpegArgs({
          item: { ...item, analysis },
          outputPath,
          sequenceInfo,
          trim,
          videoDurationSec: durationSec
        })

        const jobTotal = items.length

        await this.runner.run(
          args,
          durationSec,
          (p) => {
            this.send('queue:progress', {
              id: item.id,
              progress: p.percent,
              overallIndex: index,
              overallTotal: jobTotal
            })
          },
          (line) => this.send('queue:log', { id: item.id, line }),
          totalFrames
        )

        await cleanupConcatList(concatPath)
        const encodeDurationMs = Date.now() - encodeStartedAt
        this.send('queue:job-status', {
          id: item.id,
          status: 'done',
          progress: 100,
          encodeDurationMs
        })
        this.send('queue:job-done', { id: item.id, success: true, outputPath })
      } catch (err) {
        await cleanupConcatList(concatPath)
        const message = err instanceof Error ? err.message : String(err)
        const status = message === 'Cancelled' ? 'cancelled' : 'error'
        this.send('queue:job-status', { id: item.id, status, errorMessage: message })
        this.send('queue:job-done', { id: item.id, success: false, error: message })
        if (message === 'Cancelled') {
          this.running = false
          this.send('queue:finished', { cancelled: true })
          return
        }
      }
    }

    this.running = false
    this.send('queue:finished', { cancelled: this.cancelAll })
  }

  cancel(): void {
    this.cancelAll = true
    this.runner.cancel()
  }
}
