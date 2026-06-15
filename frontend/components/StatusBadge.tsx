import type { ContractStatus } from '@/lib/types'

export function StatusBadge({ status }: { status: ContractStatus }) {
  return <span className={`status ${status}`}>{status}</span>
}
