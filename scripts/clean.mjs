import { rmSync, existsSync } from 'fs'
import { join } from 'path'

const root = join(import.meta.dirname, '..')
const dirs = ['out', 'release', 'release.broken', 'dist-release', 'dist']

let hadErrors = false

for (const name of dirs) {
  const path = join(root, name)
  if (!existsSync(path)) continue
  try {
    rmSync(path, { recursive: true, force: true })
    console.log(`Removed ${name}/`)
  } catch (err) {
    hadErrors = true
    console.warn(
      `Could not remove ${name}/: ${err.message}`,
      '\n  Close MEDIA ENCODER / Electron and any Explorer windows open in that folder, then run clean again.'
    )
  }
}

if (hadErrors) {
  process.exitCode = 1
} else {
  console.log('Clean done.')
}
