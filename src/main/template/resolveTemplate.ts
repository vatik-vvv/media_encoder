import { dirname, normalize } from 'path'
import { mkdir } from 'fs/promises'
import { applyFormatToOutputPath } from '@shared/outputPath'
import {
  extensionForFormat,
  formatSlugForSettings,
  profileSlugForSettings
} from '@shared/encodeSettingsHelpers'
import { COMPRESSION_MAP, type CompressionLevel, type EncodeSettings } from '@shared/types'

export interface TemplateContext {
  source_path: string
  source_dir: string
  source_name: string
  source_ext: string
  date: string
  time: string
  datetime: string
  input_fps: string
  output_fps: string
  width: string
  height: string
  index: string
  format: string
  ext: string
  profile: string
  compression: string
  crf: string
}

function formatDate(d: Date): { date: string; time: string; datetime: string } {
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const time = `${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`
  const datetime = `${date}_${time}`
  return { date, time, datetime }
}

export function buildTemplateContext(
  partial: Partial<TemplateContext> & {
    source_path: string
    source_dir: string
    source_name: string
    source_ext: string
    input_fps: number
    output_fps: number
    compressionLevel: CompressionLevel
    crf: number
    index: number
    width?: number
    height?: number
  } & Pick<EncodeSettings, 'outputFormat' | 'proResProfile' | 'hapVariant'>
): TemplateContext {
  const now = formatDate(new Date())
  const level = COMPRESSION_MAP[partial.compressionLevel]
  const encodeSlice: Pick<EncodeSettings, 'outputFormat' | 'proResProfile' | 'hapVariant' | 'compressionLevel'> =
    {
      outputFormat: partial.outputFormat,
      proResProfile: partial.proResProfile,
      hapVariant: partial.hapVariant,
      compressionLevel: partial.compressionLevel
    }

  return {
    source_path: partial.source_path,
    source_dir: partial.source_dir,
    source_name: partial.source_name,
    source_ext: partial.source_ext,
    date: partial.date ?? now.date,
    time: partial.time ?? now.time,
    datetime: partial.datetime ?? now.datetime,
    input_fps: String(partial.input_fps),
    output_fps: String(partial.output_fps),
    width: partial.width != null ? String(partial.width) : '',
    height: partial.height != null ? String(partial.height) : '',
    index: String(partial.index),
    format: formatSlugForSettings(encodeSlice),
    ext: extensionForFormat(partial.outputFormat),
    profile: profileSlugForSettings(encodeSlice),
    compression: level.slug,
    crf: String(partial.crf)
  }
}

export function resolveOutputTemplate(
  template: string,
  ctx: TemplateContext,
  outputFormat: EncodeSettings['outputFormat'] = 'mp4_h264'
): string {
  let result = template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const val = ctx[key as keyof TemplateContext]
    return val ?? `{${key}}`
  })
  result = result.replace(/\//g, '\\')
  const requiredExt = ctx.ext || extensionForFormat(outputFormat)
  if (!result.toLowerCase().match(/\.[a-z0-9]+$/)) {
    result += requiredExt
  }
  result = applyFormatToOutputPath(result, outputFormat)
  return normalize(result)
}

export async function ensureOutputDir(outputPath: string): Promise<void> {
  const dir = dirname(outputPath)
  await mkdir(dir, { recursive: true })
}
