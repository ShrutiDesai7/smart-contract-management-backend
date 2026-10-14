'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { listContracts, updateContractStatus } from '@/lib/api'
import type { ContractListItem, ContractStatus, PagedResponse, User } from '@/lib/types'
import { nextContractStatus } from '@/lib/types'
import { ContractTable } from './ContractTable'
import { Pagination } from './Pagination'
import { SearchBar } from './SearchBar'
import { StatusFilter } from './StatusFilter'
import { UploadContractPanel } from './UploadContractPanel'

const PAGE_SIZE = 8

export function ContractsDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ContractStatus | ''>('')
  const [page, setPage] = useState(0)
  const [data, setData] = useState<PagedResponse<ContractListItem> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    const userStr = localStorage.getItem('user')
    if (!token || !userStr) {
      router.replace('/login')
      return
    }
    try {
      setUser(JSON.parse(userStr))
    } catch {
      router.replace('/login')
    }
  }, [router])

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

  function handleLogout() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('tokenType')
    localStorage.removeItem('user')
    router.push('/login')
  }

  if (!user) {
    return <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="panel state muted">Loading...</div>
    </div>
  }

  const isAdmin = user.role === 'ADMIN'

  return (
    <div className="page">
      <header className="topbar">
        <div className="shell topbar-inner">
          <div className="brand">
            <div className="brand-mark">CM</div>
            <div>
              <p className="eyebrow">{isAdmin ? 'Administrator Portal' : 'User Portal'}</p>
              <h1>{isAdmin ? 'All Contracts (Review Portal)' : 'My Contracts'}</h1>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{user.name}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    background: isAdmin ? '#fef3c7' : '#e0f2fe',
                    color: isAdmin ? '#92400e' : '#0369a1',
                  }}
                >
                  {user.role}
                </span>
              </div>
            </div>
            <button className="button secondary" type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="shell main">
        {!isAdmin ? (
          <UploadContractPanel onUploaded={handleUploaded} />
        ) : (
          <section className="panel" style={{ padding: '16px 20px', borderLeft: '4px solid #0284c7', background: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a' }}>Admin Review & Governance Workspace</h3>
                <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                  You are reviewing contracts across all users. You can inspect documents, evaluate AI risk reports, conduct Q&amp;A, and make approval decisions.
                </p>
              </div>
            </div>
          </section>
        )}

        <div className="toolbar">
          <SearchBar value={searchInput} onChange={setSearchInput} onSubmit={applySearch} onClear={clearSearch} />
          <StatusFilter value={status} onChange={changeStatus} />
        </div>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">{isAdmin ? 'All Contracts' : 'My Contracts'}</h2>
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
              <ContractTable
                contracts={data.content}
                busyId={busyId}
                userRole={user.role}
                onAdvanceStatus={advanceStatus}
              />
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
