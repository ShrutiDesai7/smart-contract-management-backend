'use client'

import type { ContractStatus } from '@/lib/types'

type StatusFilterProps = {
  value: ContractStatus | ''
  onChange: (value: ContractStatus | '') => void
}

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <div className="field">
      <label htmlFor="status-filter">Status</label>
      <select
        id="status-filter"
        className="select"
        value={value}
        onChange={(event) => onChange(event.target.value as ContractStatus | '')}
      >
        <option value="">All statuses</option>
        <option value="UPLOADED">Uploaded</option>
        <option value="UNDER_REVIEW">Under Review</option>
        <option value="NEEDS_CHANGES">Needs Changes</option>
        <option value="APPROVED">Approved</option>
        <option value="REJECTED">Rejected</option>
      </select>
    </div>
  )
}
