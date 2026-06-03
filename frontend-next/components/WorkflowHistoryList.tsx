import type { WorkflowHistoryItem } from '@/lib/types'

type WorkflowHistoryListProps = {
  history: WorkflowHistoryItem[]
}

function formatDateTime(value: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString()
}

export function WorkflowHistoryList({ history }: WorkflowHistoryListProps) {
  if (history.length === 0) {
    return <div className="state muted">No workflow history has been recorded yet.</div>
  }

  return (
    <div className="history">
      {history.map((item) => (
        <div className="history-row" key={item.id}>
          <strong>
            {item.previousStatus || 'None'} to {item.newStatus}
          </strong>
          <div className="muted">
            Changed by {item.changedBy || 'system'} on {formatDateTime(item.changedAt)}
          </div>
        </div>
      ))}
    </div>
  )
}
