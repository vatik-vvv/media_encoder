export type SourceType = 'video' | 'sequence'

export type FpsMode = 'auto' | 'preset' | 'custom'
export type OutputFpsMode = 'match' | 'preset' | 'custom'
export type FpsPreset = 25 | 30 | 50 | 60
export type CompressionLevel = 1 | 2 | 3 | 4 | 5
export type VideoRateControl = 'crf' | 'bitrate'
export type ResizeMode = 'original' | 'percent' | 'maxWidth' | 'maxHeight' | 'exact'

export type OutputFormat = 'mp4_h264' | 'prores' | 'hap'

export type ProResProfile = '422' | '422_lt' | 'hq' | '4444' | '4444_alpha'

export type HapVariant = 'hap' | 'hap_alpha' | 'hap_q'

export interface WindowBounds {
  width: number
  height: number
  x?: number
  y?: number
}
export type JobStatus = 'pending' | 'running' | 'done' | 'error' | 'cancelled'

export interface SourceAnalysis {
  sourceType: SourceType
  sourcePath: string
  width?: number
  height?: number
  duration?: number
  frameCount?: number
  /** First filename frame number for image sequences (e.g. 0 from `frame_00000.png`). */
  sequenceStartFrame?: number
  /** Last filename frame number for image sequences. */
  sequenceEndFrame?: number
  nbFrames?: number
  detectedInputFps?: number
  hasAudio?: boolean
  sourceName: string
  sourceDir: string
  sourceExt: string
}

export type TrimInputMode = 'frames' | 'timecode'

export interface EncodeSettings {
  outputFormat: OutputFormat
  proResProfile: ProResProfile
  hapVariant: HapVariant
  inputFpsMode: FpsMode
  inputFpsPreset: FpsPreset
  inputFpsCustom: number
  outputFpsMode: OutputFpsMode
  outputFpsPreset: FpsPreset
  outputFpsCustom: number
  audioPath?: string
  /** When external audio is longer than video, cut audio to video length (video is never shortened). */
  trimAudioToVideo: boolean
  resizeMode: ResizeMode
  resizePercent: number
  resizeWidth?: number
  resizeHeight?: number
  compressionLevel: CompressionLevel
  crf: number
  videoRateControl: VideoRateControl
  videoBitrateMbps: number
  trimEnabled: boolean
  trimMode: TrimInputMode
  trimStartFrame: number
  trimEndFrame: number
  trimStartTimecode: string
  trimEndTimecode: string
}

export interface QueueItem extends EncodeSettings {
  id: string
  sourceType: SourceType
  sourcePath: string
  analysis?: SourceAnalysis
  outputDirOverride?: string
  outputFileName?: string
  outputPathOverride?: string
  status: JobStatus
  progress?: number
  errorMessage?: string
  /** Wall-clock encode time when status becomes `done`. */
  encodeDurationMs?: number
}

export interface AppSettings {
  outputTemplate: string
  defaultOutputFormat: OutputFormat
  defaultProResProfile: ProResProfile
  defaultCompressionLevel: CompressionLevel
  defaultCrf: number
  defaultOutputFpsPreset: FpsPreset
  windowBounds?: WindowBounds
  /** Height share (0–100) for queue vs log split. */
  queuePanePercent: number
  encodeDefaults: EncodeSettings
}

export const OUTPUT_FORMAT_META: Record<
  OutputFormat,
  { label: string; slug: string; extension: string }
> = {
  mp4_h264: { label: 'MP4 (H.264)', slug: 'mp4-h264', extension: '.mp4' },
  prores: { label: 'ProRes', slug: 'prores', extension: '.mov' },
  hap: { label: 'HAP', slug: 'hap', extension: '.mov' }
}

export const PRORES_PROFILE_MAP: Record<
  ProResProfile,
  {
    label: string
    slug: string
    ffmpegProfile: number
    pixFmt: string
    /** Target bits per macroblock (prores_ks); aligns rate with Apple profile targets. */
    bitsPerMb: number
    quantMat: 'proxy' | 'lt' | 'standard' | 'hq' | 'default'
  }
> = {
  '422_lt': {
    label: 'ProRes 422 LT',
    slug: 'prores-422-lt',
    ffmpegProfile: 1,
    pixFmt: 'yuv422p10le',
    bitsPerMb: 525,
    quantMat: 'lt'
  },
  '422': {
    label: 'ProRes 422',
    slug: 'prores-422',
    ffmpegProfile: 2,
    pixFmt: 'yuv422p10le',
    bitsPerMb: 875,
    quantMat: 'standard'
  },
  hq: {
    label: 'ProRes 422 HQ',
    slug: 'prores-422-hq',
    ffmpegProfile: 3,
    pixFmt: 'yuv422p10le',
    bitsPerMb: 1350,
    quantMat: 'hq'
  },
  '4444': {
    label: 'ProRes 4444',
    slug: 'prores-4444',
    ffmpegProfile: 4,
    pixFmt: 'yuv444p10le',
    bitsPerMb: 1350,
    quantMat: 'default'
  },
  '4444_alpha': {
    label: 'ProRes 4444 (Alpha)',
    slug: 'prores-4444-alpha',
    ffmpegProfile: 4,
    pixFmt: 'yuva444p10le',
    bitsPerMb: 1350,
    quantMat: 'default'
  }
}

export const HAP_VARIANT_MAP: Record<HapVariant, { label: string; slug: string; ffmpegFormat: string }> =
  {
    hap: { label: 'HAP', slug: 'hap', ffmpegFormat: 'hap' },
    hap_alpha: { label: 'HAP Alpha', slug: 'hap-alpha', ffmpegFormat: 'hap_alpha' },
    hap_q: { label: 'HAP Q', slug: 'hap-q', ffmpegFormat: 'hap_q' }
  }

export const PRORES_PROFILES: ProResProfile[] = ['422_lt', '422', 'hq', '4444', '4444_alpha']
export const HAP_VARIANTS: HapVariant[] = ['hap', 'hap_alpha', 'hap_q']

export const DEFAULT_SETTINGS: AppSettings = {
  outputTemplate: '{source_dir}\\{source_name}{ext}',
  defaultOutputFormat: 'mp4_h264',
  defaultProResProfile: '422',
  defaultCompressionLevel: 2,
  defaultCrf: 20,
  defaultOutputFpsPreset: 30,
  queuePanePercent: 68,
  encodeDefaults: {
    outputFormat: 'mp4_h264',
    proResProfile: '422',
    hapVariant: 'hap',
    inputFpsMode: 'auto',
    inputFpsPreset: 30,
    inputFpsCustom: 30,
    outputFpsMode: 'match',
    outputFpsPreset: 30,
    outputFpsCustom: 30,
    trimAudioToVideo: true,
    resizeMode: 'original',
    resizePercent: 100,
    compressionLevel: 2,
    crf: 20,
    videoRateControl: 'crf',
    videoBitrateMbps: 12,
    trimEnabled: false,
    trimMode: 'frames',
    trimStartFrame: 1,
    trimEndFrame: 1,
    trimStartTimecode: '00:00:00:00',
    trimEndTimecode: '00:00:00:00'
  }
}

export const COMPRESSION_MAP: Record<
  CompressionLevel,
  {
    label: string
    slug: string
    defaultCrf: number
    defaultBitrateMbps: number
    preset: string
  }
> = {
  1: {
    label: 'Maximum quality',
    slug: 'max-quality',
    defaultCrf: 18,
    defaultBitrateMbps: 20,
    preset: 'slow'
  },
  2: {
    label: 'High quality',
    slug: 'high',
    defaultCrf: 20,
    defaultBitrateMbps: 12,
    preset: 'medium'
  },
  3: {
    label: 'Balanced',
    slug: 'balanced',
    defaultCrf: 23,
    defaultBitrateMbps: 8,
    preset: 'medium'
  },
  4: {
    label: 'Smaller file',
    slug: 'smaller',
    defaultCrf: 26,
    defaultBitrateMbps: 5,
    preset: 'medium'
  },
  5: {
    label: 'Maximum compression',
    slug: 'max-compression',
    defaultCrf: 28,
    defaultBitrateMbps: 3,
    preset: 'fast'
  }
}

export const FPS_PRESETS: FpsPreset[] = [25, 30, 50, 60]

export const TEMPLATE_VARIABLES = [
  { key: 'source_path', desc: 'Full path to source' },
  { key: 'source_dir', desc: 'Directory containing source' },
  { key: 'source_name', desc: 'Basename without extension' },
  { key: 'source_ext', desc: 'Source extension' },
  { key: 'date', desc: 'YYYY-MM-DD' },
  { key: 'time', desc: 'HH-mm-ss' },
  { key: 'datetime', desc: 'YYYY-MM-DD_HH-mm-ss' },
  { key: 'input_fps', desc: 'Resolved input framerate' },
  { key: 'output_fps', desc: 'Resolved output framerate' },
  { key: 'width', desc: 'Source width' },
  { key: 'height', desc: 'Source height' },
  { key: 'index', desc: '1-based queue index' },
  { key: 'format', desc: 'Output format slug (mp4-h264, prores, hap)' },
  { key: 'ext', desc: 'Output extension (.mp4 or .mov)' },
  { key: 'profile', desc: 'Profile slug (e.g. prores-422-hq, hap-alpha)' },
  { key: 'compression', desc: 'Compression level slug' },
  { key: 'crf', desc: 'CRF value' }
] as const
