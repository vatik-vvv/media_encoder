import { alphaFormatFilter, isMovFormat } from '@shared/encodeSettingsHelpers'
import { COMPRESSION_MAP, HAP_VARIANT_MAP, PRORES_PROFILE_MAP, type QueueItem } from '@shared/types'
import { resolveInputFps, resolveOutputFps } from '@shared/fps'
import type { ResolvedTrim } from '@shared/trim'
import type { SequenceInfo } from './sequence'

/** HAP chunk count for multi-core decode (1–64). */
const HAP_CHUNKS = 4

export interface BuildArgsInput {
  item: QueueItem
  outputPath: string
  sequenceInfo?: SequenceInfo
  trim?: ResolvedTrim | null
  videoDurationSec?: number
}

function appendAudioArgs(
  args: string[],
  item: QueueItem,
  hasExternalAudio: boolean,
  analysis: QueueItem['analysis'],
  videoDurationSec?: number
): void {
  const mov = isMovFormat(item.outputFormat)

  if (hasExternalAudio && item.audioPath) {
    args.push('-map', '0:v:0', '-map', '1:a:0')
    const trimAudio = item.trimAudioToVideo
    if (trimAudio && videoDurationSec != null && videoDurationSec > 0) {
      args.push('-t', videoDurationSec.toFixed(6))
    }
    args.push('-c:a', mov ? 'pcm_s16le' : 'aac', ...(mov ? [] : ['-b:a', '192k']))
  } else if (item.sourceType === 'video' && analysis?.hasAudio) {
    args.push('-map', '0:v:0', '-map', '0:a:0?')
    args.push('-c:a', mov ? 'copy' : 'aac', ...(mov ? [] : ['-b:a', '192k']))
  } else {
    args.push('-map', '0:v:0', '-an')
  }
}

function appendProResArgs(args: string[], item: QueueItem): void {
  const profile = PRORES_PROFILE_MAP[item.proResProfile]
  args.push(
    '-c:v',
    'prores_ks',
    '-profile:v',
    String(profile.ffmpegProfile),
    '-pix_fmt',
    profile.pixFmt,
    '-bits_per_mb',
    String(profile.bitsPerMb),
    '-quant_mat',
    profile.quantMat,
    '-vendor',
    'apl0',
    '-color_primaries',
    'bt709',
    '-color_trc',
    'bt709',
    '-colorspace',
    'bt709'
  )
  if (item.proResProfile === '4444_alpha') {
    args.push('-alpha_bits', '16')
  }
}

function appendHapArgs(args: string[], item: QueueItem): void {
  const variant = HAP_VARIANT_MAP[item.hapVariant]
  args.push(
    '-c:v',
    'hap',
    '-format',
    variant.ffmpegFormat,
    '-chunks',
    String(HAP_CHUNKS),
    '-compressor',
    'snappy'
  )
}

function appendMp4Args(args: string[], item: QueueItem): void {
  const comp = COMPRESSION_MAP[item.compressionLevel]
  args.push('-c:v', 'libx264')
  if (item.videoRateControl === 'bitrate') {
    const mbps = item.videoBitrateMbps ?? comp.defaultBitrateMbps
    args.push('-b:v', `${mbps}M`)
  } else {
    args.push('-crf', String(item.crf))
  }
  args.push('-preset', comp.preset, '-pix_fmt', 'yuv420p', '-movflags', '+faststart')
}

function appendVideoEncodeArgs(args: string[], item: QueueItem): void {
  if (item.outputFormat === 'prores') {
    appendProResArgs(args, item)
    return
  }
  if (item.outputFormat === 'hap') {
    appendHapArgs(args, item)
    return
  }
  appendMp4Args(args, item)
}

export function buildFfmpegArgs(input: BuildArgsInput): string[] {
  const { item, outputPath, sequenceInfo, trim, videoDurationSec } = input
  const analysis = item.analysis
  const inFps = resolveInputFps(item, analysis)
  const outFps = resolveOutputFps(item, analysis)
  const hasExternalAudio = Boolean(item.audioPath)

  const args: string[] = ['-y', '-hide_banner']

  if (item.sourceType === 'sequence' && sequenceInfo) {
    args.push('-framerate', String(inFps))
    if (sequenceInfo.pattern) {
      const start = sequenceInfo.pattern.startNumber ?? 0
      if (start > 0) args.push('-start_number', String(start))
      args.push('-i', sequenceInfo.pattern.inputPath)
    } else if (sequenceInfo.concatListPath) {
      args.push('-f', 'concat', '-safe', '0', '-i', sequenceInfo.concatListPath)
    }
    if (trim) {
      args.push('-frames:v', String(trim.frameCount))
    }
  } else {
    if (trim) {
      args.push('-ss', trim.startSec.toFixed(6))
    }
    args.push('-i', item.sourcePath)
    if (trim) {
      args.push('-t', trim.durationSec.toFixed(6))
    }
  }

  if (hasExternalAudio && item.audioPath) {
    args.push('-i', item.audioPath)
  }

  const filters: string[] = []
  const alphaFilter = alphaFormatFilter(item)
  if (alphaFilter) {
    filters.push(alphaFilter)
  }

  const resizePct = item.resizePercent ?? 100
  const percent =
    item.resizeMode === 'percent' ? resizePct : item.resizeMode === 'original' ? 100 : 0
  if (percent > 0 && percent < 100) {
    const factor = (percent / 100).toFixed(4)
    filters.push(`scale=iw*${factor}:ih*${factor}`)
  } else if (item.resizeMode === 'maxWidth' && item.resizeWidth) {
    filters.push(`scale=${item.resizeWidth}:-2`)
  } else if (item.resizeMode === 'maxHeight' && item.resizeHeight) {
    filters.push(`scale=-2:${item.resizeHeight}`)
  } else if (item.resizeMode === 'exact' && item.resizeWidth && item.resizeHeight) {
    filters.push(`scale=${item.resizeWidth}:${item.resizeHeight}`)
  }

  const needsFpsFilter =
    item.sourceType === 'video' &&
    item.inputFpsMode !== 'auto' &&
    Math.abs(inFps - (analysis?.detectedInputFps ?? inFps)) > 0.01

  if (needsFpsFilter) {
    filters.push(`fps=${inFps}`)
  }
  if (outFps !== inFps || filters.some((f) => f.startsWith('scale'))) {
    if (!filters.some((f) => f.startsWith('fps='))) {
      filters.push(`fps=${outFps}`)
    } else if (outFps !== inFps) {
      filters.push(`fps=${outFps}`)
    }
  }

  if (filters.length > 0) {
    args.push('-vf', [...new Set(filters)].join(','))
  } else if (item.sourceType === 'sequence') {
    args.push('-r', String(outFps))
  } else if (outFps !== inFps) {
    args.push('-r', String(outFps))
  }

  appendAudioArgs(args, item, hasExternalAudio, analysis, videoDurationSec)
  appendVideoEncodeArgs(args, item)

  if (isMovFormat(item.outputFormat)) {
    args.push('-f', 'mov')
  }

  args.push(outputPath)
  return args
}
