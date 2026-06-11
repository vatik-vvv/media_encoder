/** Human-readable duration for encode timing in the queue UI. */
export function formatEncodeDuration(ms: number): string {
  const totalSec = ms / 1000
  if (totalSec < 60) {
    return totalSec < 10 ? `${totalSec.toFixed(1)}s` : `${Math.round(totalSec)}s`
  }
  const minutes = Math.floor(totalSec / 60)
  const seconds = Math.round(totalSec % 60)
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`
}
