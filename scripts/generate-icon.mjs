/**
 * Builds resources/icon.ico (multi-size) from MEencoder_icon.png
 */
import { writeFileSync, existsSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const pngPath = join(root, 'MEencoder_icon.png')
const outIco = join(root, 'resources', 'icon.ico')
const ICO_SIZES = [256, 128, 64, 48, 32, 16]

if (!existsSync(pngPath)) {
  console.error('Missing source:', pngPath)
  process.exit(1)
}

const tempPaths = []
try {
  for (const size of ICO_SIZES) {
    const tempPath = join(root, 'resources', `.icon-${size}.png`)
    await sharp(pngPath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(tempPath)
    tempPaths.push(tempPath)
  }

  const pngToIco = (await import('png-to-ico')).default
  const buf = await pngToIco(tempPaths)
  writeFileSync(outIco, buf)
  console.log('Wrote', outIco, `(${ICO_SIZES.length} sizes from MEencoder_icon.png)`)
} finally {
  for (const tempPath of tempPaths) {
    try {
      unlinkSync(tempPath)
    } catch {
      /* ignore */
    }
  }
}
