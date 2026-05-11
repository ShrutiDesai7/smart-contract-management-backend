import { useEffect, useMemo, useState } from 'react'
import type { ContractListItem, ContractStatus } from '../lib/api'
import { listContracts, updateContractStatus } from '../lib/api'

function statusBadgeClasses(status: ContractStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'bg-slate-100 text-slate-700 ring-slate-200'
    case 'REVIEW':
      return 'bg-amber-50 text-amber-800 ring-amber-200'
    case 'APPROVED':
      return 'bg-emerald-50 text-emerald-800 ring-emerald-200'
  }
}

function formatStatus(status: ContractStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'Draft'
    case 'REVIEW':
      return 'Review'
    case 'APPROVED':
      return 'Approved'
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString()
}

function formatSize(bytes: number | null): string {
  if (bytes == null || Number.isNaN(bytes)) return '-'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }
  const formatted = unitIndex === 0 ? `${Math.round(value)}` : value.toFixed(1)
  return `${formatted} ${units[unitIndex]}`
}

function nextStatus(status: ContractStatus): ContractStatus | null {
  switch (status) {
    case 'DRAFT':
      return 'REVIEW'
    case 'REVIEW':
      return 'APPROVED'
    case 'APPROVED':
      return null
  }
}

function progressSteps(status: ContractStatus): Array<{ label: string; state: 'done' | 'current' | 'todo' }> {
  const idx = status === 'DRAFT' ? 0 : status === 'REVIEW' ? 1 : 2
  return [
    { label: 'Draft', state: idx > 0 ? 'done' : idx === 0 ? 'current' : 'todo' },
    { label: 'Review', state: idx > 1 ? 'done' : idx === 1 ? 'current' : 'todo' },
    { label: 'Approved', state: idx === 2 ? 'current' : 'todo' },
  ]
}

function stepDotClasses(state: 'done' | 'current' | 'todo'): string {
  switch (state) {
    case 'done':
      return 'bg-emerald-500 ring-emerald-200'
    case 'current':
      return 'bg-violet-600 ring-violet-200'
    case 'todo':
      return 'bg-slate-200 ring-slate-200'
  }
}

export function ContractListCard(props: {
  refreshKey?: number
  highlightId?: number | null
  onStatusUpdated?: () => void
  onError?: (message: string) => void
}) {
  const [items, setItems] = useState<ContractListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [query, setQuery] = useState('')

  const emptyState = useMemo(() => !isLoading && !error && items.length === 0, [isLoading, error, items])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((c) => {
      const idMatch = String(c.id).includes(q)
      const nameMatch = c.contractName.toLowerCase().includes(q)
      const fileMatch = (c.originalFileName || '').toLowerCase().includes(q)
      return idMatch || nameMatch || fileMatch
    })
  }, [items, query])

  async function refresh() {
    try {
      setError(null)
      setIsLoading(true)
      const data = await listContracts()
      setItems(data)
    } catch (e: any) {
      const msg = e?.message || 'Failed to load contracts'
      setError(msg)
      props.onError?.(msg)
    } finally {
      setIsLoading(false)
    }
  }

  async function advanceStatus(c: ContractListItem) {
    const next = nextStatus(c.status)
    if (!next) return
    try {
      setError(null)
      setBusyId(c.id)
      await updateContractStatus({ id: c.id, status: next })
      props.onStatusUpdated?.()
      await refresh()
    } catch (e: any) {
      const msg = e?.message || 'Failed to update status'
      setError(msg)
      props.onError?.(msg)
    } finally {
      setBusyId(null)
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.refreshKey])

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white/80 shadow-sm ring-1 ring-black/5">
      <div className="bg-gradient-to-r from-sky-600/10 via-sky-600/5 to-transparent px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-2xl bg-white text-sky-700 shadow-sm ring-1 ring-black/5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M8 6h13M8 12h13M8 18h13"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M3.5 6h.01M3.5 12h.01M3.5 18h.01"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Uploaded Contracts</h2>
              <p className="mt-1 text-sm text-slate-600">Search, view status, and advance through the workflow.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-600">
            Total: <span className="font-semibold text-slate-900">{items.length}</span>
            {query.trim() ? (
              <>
                {' '}
                • Showing: <span className="font-semibold text-slate-900">{filtered.length}</span>
              </>
            ) : null}
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, ID, or filename…"
            className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100 sm:max-w-xs"
          />
        </div>
      </div>

      <div className="px-5 py-5">
        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
            Loading…
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        {emptyState ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
            No contracts uploaded yet. Upload one to see it here.
          </div>
        ) : null}

        {!isLoading && !error && filtered.length > 0 ? (
          <div className="mt-4 space-y-3">
            {filtered.map((c) => {
              const isHighlighted = props.highlightId != null && c.id === props.highlightId
              const step = progressSteps(c.status)
              return (
                <div
                  key={c.id}
                  className={[
                    'rounded-3xl border p-4 transition-colors',
                    isHighlighted ? 'border-violet-300 bg-violet-50/40' : 'border-slate-200',
                  ].join(' ')}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{c.contractName}</span>
                        <span
                          className={[
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset',
                            statusBadgeClasses(c.status),
                          ].join(' ')}
                        >
                          {formatStatus(c.status)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        ID:{' '}
                        <button
                          type="button"
                          onClick={() => copy(String(c.id))}
                          className="font-medium text-slate-700 hover:underline"
                          title="Copy ID"
                        >
                          {c.id}
                        </button>{' '}
                        • Uploaded: <span className="font-medium text-slate-700">{formatDate(c.uploadedAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {nextStatus(c.status) ? (
                        <button
                          type="button"
                          onClick={() => advanceStatus(c)}
                          disabled={busyId === c.id}
                          className="rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busyId === c.id ? 'Updating…' : `Move to ${formatStatus(nextStatus(c.status)!)}`}
                        </button>
                      ) : (
                        <span className="text-xs font-medium text-slate-500">Final status</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    {step.map((s) => (
                      <div key={s.label} className="flex items-center gap-2">
                        <span className={['h-2.5 w-2.5 rounded-full ring-2', stepDotClasses(s.state)].join(' ')} />
                        <span className={s.state === 'todo' ? 'text-slate-400' : 'text-slate-700'}>{s.label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 px-3 py-2">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">File</div>
                      <div className="mt-0.5 truncate font-medium text-slate-800">{c.originalFileName || '-'}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-2">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">Type</div>
                      <div className="mt-0.5 truncate font-medium text-slate-800">{c.contentType || '-'}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-2">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">Size</div>
                      <div className="mt-0.5 font-medium text-slate-800">{formatSize(c.fileSizeBytes)}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}

        {!isLoading && !error && filtered.length === 0 && items.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
            No matches for “{query.trim()}”.
          </div>
        ) : null}
      </div>
    </div>
  )
}

