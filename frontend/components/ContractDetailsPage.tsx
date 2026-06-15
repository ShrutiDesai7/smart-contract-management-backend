'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getContract, getWorkflowHistory, updateContractStatus } from '@/lib/api'
import type { ContractDetail, WorkflowHistoryItem } from '@/lib/types'
import { formatContractStatus, nextContractStatus } from '@/lib/types'
import { StatusBadge } from './StatusBadge'
import { WorkflowHistoryList } from './WorkflowHistoryList'
import { WorkflowProgress } from './WorkflowProgress'

function formatDateTime(value: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString()
}

function formatSize(bytes: number | null): string {
  if (bytes == null) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ContractDetailsPage({ id }: { id: string }) {
  const [contract, setContract] = useState<ContractDetail | null>(null)
  const [history, setHistory] = useState<WorkflowHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setIsLoading(true)
        setError(null)
        const [contractResult, historyResult] = await Promise.all([getContract(id), getWorkflowHistory(id)])
        if (!cancelled) {
          setContract(contractResult)
          setHistory(historyResult)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load contract')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id, refreshKey])

  async function advanceStatus() {
    if (!contract) return
    const nextStatus = nextContractStatus(contract.status)
    if (!nextStatus) return

    try {
      setIsUpdating(true)
      setError(null)
      await updateContractStatus(contract.id, nextStatus)
      setRefreshKey((value) => value + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update contract status')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <div className="shell topbar-inner">
          <div className="brand">
            <div className="brand-mark">CM</div>
            <div>
              <p className="eyebrow">Contract Details</p>
              <h1>{contract?.title || `Contract #${id}`}</h1>
            </div>
          </div>
          <Link className="button secondary" href="/">
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="shell main">
        {error ? <div className="error">{error}</div> : null}
        {isLoading ? <div className="panel state muted">Loading contract details...</div> : null}

        {!isLoading && !error && contract ? (
          <div style={{ display: 'grid', gap: 18 }}>
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Contract Information</h2>
                  <p className="muted" style={{ margin: '4px 0 0' }}>
                    ID: {contract.id}
                  </p>
                </div>
                <div className="detail-status-actions">
                  <StatusBadge status={contract.status} />
                  {nextContractStatus(contract.status) ? (
                    <button className="button secondary" type="button" disabled={isUpdating} onClick={advanceStatus}>
                      {isUpdating
                        ? 'Updating...'
                        : `Move to ${formatContractStatus(nextContractStatus(contract.status)!)}`}
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="progress-band">
                <WorkflowProgress status={contract.status} />
              </div>
              <div className="details-grid">
                <div className="detail-item">
                  <div className="detail-label">Owner</div>
                  <div>{contract.ownerName || '-'}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Created</div>
                  <div>{formatDateTime(contract.createdAt)}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Updated</div>
                  <div>{formatDateTime(contract.updatedAt)}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Uploaded</div>
                  <div>{formatDateTime(contract.uploadedAt)}</div>
                </div>
                <div className="detail-item full">
                  <div className="detail-label">Description</div>
                  <div>{contract.description || '-'}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">File</div>
                  <div>{contract.originalFileName || '-'}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">File Size</div>
                  <div>{formatSize(contract.fileSizeBytes)}</div>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Workflow History</h2>
                  <p className="muted" style={{ margin: '4px 0 0' }}>
                    Most recent status changes first
                  </p>
                </div>
              </div>

              <WorkflowHistoryList history={history} />
            </section>
          </div>
        ) : null}
      </main>
    </div>
  )
}
