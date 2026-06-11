import {
  COMPRESSION_MAP,
  HAP_VARIANT_MAP,
  OUTPUT_FORMAT_META,
  PRORES_PROFILE_MAP,
  type CompressionLevel,
  type EncodeSettings,
  type HapVariant,
  type OutputFormat,
  type ProResProfile
} from './types'

export function extensionForFormat(format: OutputFormat): string {
  return OUTPUT_FORMAT_META[format].extension
}

export function isMovFormat(format: OutputFormat): boolean {
  return format === 'prores' || format === 'hap'
}

export function encodeWantsAlpha(
  item: Pick<EncodeSettings, 'outputFormat' | 'proResProfile' | 'hapVariant'>
): boolean {
  if (item.outputFormat === 'prores') return item.proResProfile === '4444_alpha'
  if (item.outputFormat === 'hap') return item.hapVariant === 'hap_alpha'
  return false
}

/** FFmpeg `format=` filter to strip or preserve alpha for ProRes / HAP. */
export function alphaFormatFilter(
  item: Pick<EncodeSettings, 'outputFormat' | 'proResProfile' | 'hapVariant'>
): string | null {
  if (item.outputFormat === 'prores') {
    return `format=${PRORES_PROFILE_MAP[item.proResProfile].pixFmt}`
  }
  if (item.outputFormat === 'hap') {
    return encodeWantsAlpha(item) ? 'format=rgba' : 'format=rgb24'
  }
  return null
}

export function normalizeProResProfile(value: unknown): ProResProfile {
  if (value === '422_lt' || value === 'lt') return '422_lt'
  if (value === '422' || value === 'standard') return '422'
  if (value === 'hq') return 'hq'
  if (value === '4444') return '4444'
  if (value === '4444_alpha') return '4444_alpha'
  return '422'
}

function normalizeHapVariant(value: unknown): HapVariant {
  if (value === 'hap_alpha' || value === 'hap_q_alpha') return 'hap_alpha'
  if (value === 'hap_q') return 'hap_q'
  return 'hap'
}

function normalizeOutputFormat(value: unknown): OutputFormat {
  if (value === 'prores' || value === 'hap') return value
  return 'mp4_h264'
}

export function profileSlugForSettings(
  item: Pick<EncodeSettings, 'outputFormat' | 'proResProfile' | 'hapVariant' | 'compressionLevel'>
): string {
  if (item.outputFormat === 'prores') {
    return PRORES_PROFILE_MAP[item.proResProfile].slug
  }
  if (item.outputFormat === 'hap') {
    return HAP_VARIANT_MAP[item.hapVariant].slug
  }
  return COMPRESSION_MAP[item.compressionLevel].slug
}

export function formatSlugForSettings(item: Pick<EncodeSettings, 'outputFormat'>): string {
  return OUTPUT_FORMAT_META[item.outputFormat].slug
}

export function normalizeEncodeSettings(partial: Partial<EncodeSettings>): EncodeSettings {
  const level = (partial.compressionLevel ?? 2) as CompressionLevel
  const comp = COMPRESSION_MAP[level] ?? COMPRESSION_MAP[2]
  return {
    ...(partial as EncodeSettings),
    outputFormat: normalizeOutputFormat(partial.outputFormat),
    proResProfile: normalizeProResProfile(partial.proResProfile),
    hapVariant: normalizeHapVariant(partial.hapVariant),
    compressionLevel: level,
    videoRateControl: partial.videoRateControl ?? 'crf',
    videoBitrateMbps: partial.videoBitrateMbps ?? comp.defaultBitrateMbps,
    crf: partial.crf ?? comp.defaultCrf
  }
}

export function formatCompressionCell(
  item: Pick<EncodeSettings, 'compressionLevel' | 'crf' | 'videoRateControl' | 'videoBitrateMbps'>
): string {
  const level = item.compressionLevel
  if (item.videoRateControl === 'bitrate') {
    const mbps = item.videoBitrateMbps ?? COMPRESSION_MAP[level].defaultBitrateMbps
    return `L${level} / ${mbps}M`
  }
  return `L${level} / ${item.crf}`
}

export function formatEncodeCell(item: EncodeSettings): string {
  if (item.outputFormat === 'prores') {
    return PRORES_PROFILE_MAP[item.proResProfile].label
  }
  if (item.outputFormat === 'hap') {
    return HAP_VARIANT_MAP[item.hapVariant].label
  }
  return `MP4 ${formatCompressionCell(item)}`
}
