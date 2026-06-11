interface Props {
  jobIndex: number
  jobTotal: number
  jobPercent: number
  label?: string
}

export function computeOverallPercent(
  jobIndex: number,
  jobTotal: number,
  jobPercent: number
): number {
  if (jobTotal <= 0) return 0
  const completed = Math.max(0, jobIndex - 1)
  return Math.min(100, ((completed + jobPercent / 100) / jobTotal) * 100)
}

export default function QueueOverallProgress({
  jobIndex,
  jobTotal,
  jobPercent,
  label
}: Props): JSX.Element {
  const overall = computeOverallPercent(jobIndex, jobTotal, jobPercent)
  const rounded = Math.round(overall)

  return (
    <div className="queue-overall-progress">
      <div className="queue-overall-progress-header">
        <span>{label ?? 'Queue progress'}</span>
        <span className="queue-overall-progress-pct">
          {rounded}% · job {Math.min(jobIndex, jobTotal)} of {jobTotal}
          {jobPercent > 0 && jobPercent < 100 ? ` (${Math.round(jobPercent)}% current)` : ''}
        </span>
      </div>
      <div className="progress-bar" role="progressbar" aria-valuenow={rounded} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-bar-fill" style={{ width: `${overall}%` }} />
      </div>
    </div>
  )
}
