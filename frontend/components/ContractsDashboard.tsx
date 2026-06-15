'use client'

import { useEffect, useState } from 'react'
import { listContracts, updateContractStatus } from '@/lib/api'
import type { ContractListItem, ContractStatus, PagedResponse } from '@/lib/types'
import { nextContractStatus } from '@/lib/types'
import { ContractTable } from './ContractTable'
import { Pagination } from './Pagination'
import { SearchBar } from './SearchBar'
import { StatusFilter } from './StatusFilter'
import { UploadContractPanel } from './UploadContractPanel'

const PAGE_SIZE = 8

export function ContractsDashboard() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ContractStatus | ''>('')
  const [page, setPage] = useState(0)
  const [data, setData] = useState<PagedResponse<ContractListItem> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setIsLoading(true)
        setError(null)
        const result = await listContracts({ page, size: PAGE_SIZE, search, status })
        if (!cancelled) setData(result)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load contracts')
          setData(null)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [page, search, status, refreshKey])

  function applySearch() {
    setPage(0)
    setSearch(searchInput)
  }

  function changeStatus(nextStatus: ContractStatus | '') {
    setPage(0)
    setStatus(nextStatus)
  }

  function clearSearch() {
    setSearchInput('')
    setSearch('')
    setPage(0)
  }

  async function advanceStatus(contract: ContractListItem) {
    const nextStatus = nextContractStatus(contract.status)
    if (!nextStatus) return

    try {
      setBusyId(contract.id)
      setError(null)
      await updateContractStatus(contract.id, nextStatus)
      setRefreshKey((value) => value + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update contract status')
    } finally {
      setBusyId(null)
    }
  }

  function handleUploaded() {
    setPage(0)
    setRefreshKey((value) => value + 1)
  }

  return (
    <div className="page">
      <header className="topbar">
        <div className="shell topbar-inner">
          <div className="brand">
            <div className="brand-mark">CM</div>
            <div>
              <p className="eyebrow">Contracts</p>
              <h1>Contracts Dashboard</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="shell main">
        <UploadContractPanel onUploaded={handleUploaded} />

        <div className="toolbar">
          <SearchBar value={searchInput} onChange={setSearchInput} onSubmit={applySearch} onClear={clearSearch} />
          <StatusFilter value={status} onChange={changeStatus} />
        </div>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Contracts</h2>
              <p className="muted" style={{ margin: '4px 0 0' }}>
                {data ? `${data.totalElements} contract${data.totalElements === 1 ? '' : 's'}` : 'Loading contract records'}
              </p>
            </div>
          </div>

          {error ? <div className="state error">{error}</div> : null}
          {isLoading ? <div className="state muted">Loading contracts...</div> : null}
          {!isLoading && !error && data?.content.length === 0 ? (
            <div className="state muted">No contracts match the current filters.</div>
          ) : null}

          {!isLoading && !error && data && data.content.length > 0 ? (
            <>
              <ContractTable contracts={data.content} busyId={busyId} onAdvanceStatus={advanceStatus} />
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                totalElements={data.totalElements}
                size={data.size}
                first={data.first}
                last={data.last}
                onPrevious={() => setPage((value) => Math.max(value - 1, 0))}
                onNext={() => setPage((value) => value + 1)}
              />
            </>
          ) : null}
        </section>
      </main>
    </div>
  )
}
