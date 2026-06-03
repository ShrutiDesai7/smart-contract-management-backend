import Link from 'next/link'
import type { ContractListItem } from '@/lib/types'
import { formatContractStatus, nextContractStatus } from '@/lib/types'
import { StatusBadge } from './StatusBadge'
import { WorkflowProgress } from './WorkflowProgress'

type ContractTableProps = {
  contracts: ContractListItem[]
  busyId: string | null
  onAdvanceStatus: (contract: ContractListItem) => void
}

function formatDate(value: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString()
}

export function ContractTable({ contracts, busyId, onAdvanceStatus }: ContractTableProps) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Owner</th>
            <th>Status</th>
            <th>Workflow</th>
            <th>Created</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {contracts.map((contract) => (
            <tr key={contract.id}>
              <td>
                <strong>{contract.title || `Contract #${contract.id}`}</strong>
                {contract.description ? <div className="muted">{contract.description}</div> : null}
              </td>
              <td>{contract.ownerName || '-'}</td>
              <td>
                <StatusBadge status={contract.status} />
              </td>
              <td>
                <WorkflowProgress status={contract.status} />
              </td>
              <td>{formatDate(contract.createdAt)}</td>
              <td>
                <div className="row-actions">
                  <Link className="button secondary" href={`/contracts/${contract.id}`}>
                    View
                  </Link>
                  {nextContractStatus(contract.status) ? (
                    <button
                      className="button secondary"
                      type="button"
                      disabled={busyId === contract.id}
                      onClick={() => onAdvanceStatus(contract)}
                    >
                      {busyId === contract.id
                        ? 'Updating...'
                        : `Move to ${formatContractStatus(nextContractStatus(contract.status)!)}`}
                    </button>
                  ) : (
                    <span className="muted action-note">Final status</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
