import type { ContractStatus } from '@/lib/types'

type WorkflowProgressProps = {
  status: ContractStatus
}

const steps: ContractStatus[] = ['UPLOADED', 'UNDER_REVIEW', 'APPROVED']

function progressStatus(status: ContractStatus): ContractStatus {
  switch (status) {
    case 'DRAFT':
      return 'UPLOADED'
    case 'REVIEW':
      return 'UNDER_REVIEW'
    case 'NEEDS_CHANGES':
    case 'REJECTED':
      return 'UNDER_REVIEW'
    default:
      return status
  }
}

function stepLabel(status: ContractStatus): string {
  switch (status) {
    case 'UPLOADED':
      return 'Uploaded'
    case 'UNDER_REVIEW':
      return 'Under Review'
    case 'DRAFT':
      return 'Draft'
    case 'REVIEW':
      return 'Review'
    case 'APPROVED':
      return 'Approved'
    case 'NEEDS_CHANGES':
      return 'Needs Changes'
    case 'REJECTED':
      return 'Rejected'
  }
}

export function WorkflowProgress({ status }: WorkflowProgressProps) {
  const activeIndex = steps.indexOf(progressStatus(status))

  return (
    <div className="workflow-progress" aria-label="Workflow status">
      {steps.map((step, index) => {
        const state = index < activeIndex ? 'done' : index === activeIndex ? 'current' : 'todo'
        return (
          <div className={`workflow-step ${state}`} key={step}>
            <span className="workflow-dot" />
            <span>{stepLabel(step)}</span>
          </div>
        )
      })}
      {status === 'NEEDS_CHANGES' || status === 'REJECTED' ? (
        <div className={`workflow-step current ${status}`}>
          <span className="workflow-dot" />
          <span>{stepLabel(status)}</span>
        </div>
      ) : null}
    </div>
  )
}
