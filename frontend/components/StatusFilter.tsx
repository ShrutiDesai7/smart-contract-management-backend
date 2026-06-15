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
        <option value="DRAFT">Draft</option>
        <option value="REVIEW">Review</option>
        <option value="APPROVED">Approved</option>
      </select>
    </div>
  )
}
