export interface ParsedSequenceFile {
  prefix: string
  frame: number
  padLen: number
  suffix: string
}

export interface ImageSequenceGroup {
  /** Filename pattern within the folder, e.g. `front.%04d.png`. */
  filePattern: string
  /** Short label for UI, e.g. `front` or `front.reflection`. */
  label: string
  /** Sorted basenames belonging to this sequence. */
  files: string[]
  startNumber: number
}

/** Parse `name.0450.suffix.png` style sequence filenames. */
export function parseFrameSequenceFile(name: string): ParsedSequenceFile | null {
  const base = name.replace(/^.*[/\\]/, '')
  const match = base.match(/^(.+?)(\d+)(\..+)$/)
  if (!match) return null
  const [, prefix, numStr, suffix] = match
  return {
    prefix,
    frame: parseInt(numStr, 10),
    padLen: numStr.length,
    suffix
  }
}

function groupKey(parsed: ParsedSequenceFile): string {
  return `${parsed.prefix}\0${parsed.padLen}\0${parsed.suffix}`
}

export function sequenceLabel(prefix: string, suffix: string): string {
  const base = prefix.endsWith('.') ? prefix.slice(0, -1) : prefix
  const plainImageExt = /^\.(png|jpe?g|tiff?|exr|dpx|tga)$/i
  if (plainImageExt.test(suffix)) return base
  const middle = suffix.replace(/\.[^.]+$/, '')
  return base + middle
}

export function filePatternForParsed(
  parsed: Pick<ParsedSequenceFile, 'prefix' | 'padLen' | 'suffix'>
): string {
  return `${parsed.prefix}%0${parsed.padLen}d${parsed.suffix}`
}

export function filterBasenamesForPattern(basenames: string[], filePattern: string): string[] {
  const match = filePattern.match(/^(.+?)%0(\d+)d(\..+)$/)
  if (!match) return basenames
  const [, prefix, padLenStr, suffix] = match
  const padLen = parseInt(padLenStr, 10)
  return basenames.filter((name) => {
    const parsed = parseFrameSequenceFile(name)
    if (!parsed) return false
    return parsed.prefix === prefix && parsed.padLen === padLen && parsed.suffix === suffix
  })
}

/** Group image filenames into separate frame sequences (AOV / render passes). */
export function groupImageSequenceFiles(fileNames: string[]): ImageSequenceGroup[] {
  const buckets = new Map<string, { parsed: ParsedSequenceFile; files: string[] }>()

  for (const name of fileNames) {
    const parsed = parseFrameSequenceFile(name)
    if (!parsed) continue
    const key = groupKey(parsed)
    let bucket = buckets.get(key)
    if (!bucket) {
      bucket = { parsed, files: [] }
      buckets.set(key, bucket)
    }
    bucket.files.push(name)
  }

  return Array.from(buckets.values())
    .map(({ parsed, files }) => {
      const sorted = [...files].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      const first = parseFrameSequenceFile(sorted[0])!
      return {
        filePattern: filePatternForParsed(parsed),
        label: sequenceLabel(parsed.prefix, parsed.suffix),
        files: sorted,
        startNumber: first.frame
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
}
