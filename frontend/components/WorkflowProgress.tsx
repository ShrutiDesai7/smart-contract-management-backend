import type { ContractStatus } from '@/lib/types'

type WorkflowProgressProps = {
  status: ContractStatus
}

const steps: ContractStatus[] = ['DRAFT', 'REVIEW', 'APPROVED']

function stepLabel(status: ContractStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'Draft'
    case 'REVIEW':
      return 'Review'
    case 'APPROVED':
      return 'Approved'
  }
}

export function WorkflowProgress({ status }: WorkflowProgressProps) {
  const activeIndex = steps.indexOf(status)

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
    </div>
  )
}
