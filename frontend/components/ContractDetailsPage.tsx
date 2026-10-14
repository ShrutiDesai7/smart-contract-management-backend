'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  downloadContract,
  getContract,
  getWorkflowHistory,
  reviewContract,
  submitContractForReview,
} from '@/lib/api'
import type { ContractDetail, WorkflowHistoryItem, User } from '@/lib/types'
import { formatContractStatus } from '@/lib/types'
import { ContractQaPanel } from './ContractQaPanel'
import { ContractReportPanel } from './ContractReportPanel'
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
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [contract, setContract] = useState<ContractDetail | null>(null)
  const [history, setHistory] = useState<WorkflowHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Actions & Review state
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [reviewComment, setReviewComment] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)

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

  async function handleDownload() {
    if (!contract) return
    try {
      setIsDownloading(true)
      setActionError(null)
      await downloadContract(contract.id, contract.originalFileName || `${contract.title || 'contract'}.pdf`)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to download contract')
    } finally {
      setIsDownloading(false)
    }
  }

  async function handleSubmitReview() {
    if (!contract) return
    try {
      setIsActionLoading(true)
      setActionError(null)
      setActionSuccess(null)
      await submitContractForReview(contract.id)
      setActionSuccess('Contract successfully submitted for admin review.')
      setRefreshKey((v) => v + 1)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to submit contract for review')
    } finally {
      setIsActionLoading(false)
    }
  }

  async function handleAdminDecision(status: 'APPROVED' | 'REJECTED' | 'NEEDS_CHANGES') {
    if (!contract) return
    if ((status === 'REJECTED' || status === 'NEEDS_CHANGES') && !reviewComment.trim()) {
      setActionError(`A comment explaining the decision is required when marking as ${formatContractStatus(status)}.`)
      return
    }

    try {
      setIsActionLoading(true)
      setActionError(null)
      setActionSuccess(null)
      await reviewContract({
        id: contract.id,
        status,
        comment: reviewComment.trim() || undefined,
      })
      setActionSuccess(`Contract successfully marked as ${formatContractStatus(status)}.`)
      setReviewComment('')
      setRefreshKey((v) => v + 1)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update review decision')
    } finally {
      setIsActionLoading(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('tokenType')
    localStorage.removeItem('user')
    router.push('/login')
  }

  if (!user) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="panel state muted">Loading...</div>
      </div>
    )
  }

  const isAdmin = user.role === 'ADMIN'

  return (
    <div className="page">
      <header className="topbar">
        <div className="shell topbar-inner">
          <div className="brand">
            <div className="brand-mark">CM</div>
            <div>
              <p className="eyebrow">{isAdmin ? 'Admin Review Workspace' : 'Contract Details'}</p>
              <h1>{contract?.title || `Contract #${id}`}</h1>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
            <Link className="button secondary" href="/">
              Back to Dashboard
            </Link>
            <button className="button secondary" type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
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
                <div className="detail-status-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <StatusBadge status={contract.status} />
                  <button
                    className="button secondary"
                    type="button"
                    disabled={isDownloading}
                    onClick={handleDownload}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    {isDownloading ? 'Downloading...' : 'Download Document'}
                  </button>
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
                  <div className="detail-label">Original File</div>
                  <div>{contract.originalFileName || '-'}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">File Size</div>
                  <div>{formatSize(contract.fileSizeBytes)}</div>
                </div>
              </div>

              {/* Role-Specific Actions */}
              {isAdmin ? (
                <div style={{ marginTop: 22, padding: 18, border: '1px solid #cbd5e1', borderRadius: 8, background: '#f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16 }}>Administrator Review &amp; Decision</h3>
                      <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                        Change contract status, approve, reject, or request changes with reviewer feedback.
                      </p>
                    </div>
                    <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                      ADMIN WORKSPACE
                    </span>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label htmlFor="review-comment" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                      Review Comment / Feedback (Required for Rejections or Change Requests)
                    </label>
                    <textarea
                      id="review-comment"
                      className="input"
                      style={{ width: '100%', minHeight: 70, resize: 'vertical' }}
                      placeholder="Add reviewer notes, reason for decision, or requested revisions..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      className="button"
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => handleAdminDecision('APPROVED')}
                      style={{ background: '#16a34a', borderColor: '#16a34a', color: '#fff' }}
                    >
                      {isActionLoading ? 'Saving...' : 'Approve Contract'}
                    </button>
                    <button
                      className="button"
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => handleAdminDecision('NEEDS_CHANGES')}
                      style={{ background: '#d97706', borderColor: '#d97706', color: '#fff' }}
                    >
                      {isActionLoading ? 'Saving...' : 'Request Changes'}
                    </button>
                    <button
                      className="button"
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => handleAdminDecision('REJECTED')}
                      style={{ background: '#dc2626', borderColor: '#dc2626', color: '#fff' }}
                    >
                      {isActionLoading ? 'Saving...' : 'Reject Contract'}
                    </button>
                  </div>

                  {actionSuccess && <div className="upload-message success-message" style={{ marginTop: 12 }}>{actionSuccess}</div>}
                  {actionError && <div className="upload-message error" style={{ marginTop: 12 }}>{actionError}</div>}
                </div>
              ) : (
                <div style={{ marginTop: 22, padding: 18, border: '1px solid var(--border)', borderRadius: 8, background: '#f8fafc' }}>
                  {contract.status === 'UPLOADED' || contract.status === 'DRAFT' || contract.status === 'NEEDS_CHANGES' ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 16 }}>Ready for Formal Review?</h3>
                        <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                          Submit your contract to administrators for review and approval.
                        </p>
                      </div>
                      <button
                        className="button"
                        type="button"
                        disabled={isActionLoading}
                        onClick={handleSubmitReview}
                      >
                        {isActionLoading ? 'Submitting...' : 'Submit for Review'}
                      </button>
                    </div>
                  ) : contract.status === 'UNDER_REVIEW' ? (
                    <div style={{ color: '#0369a1', fontSize: 14 }}>
                      <strong>Under Review:</strong> Your contract has been submitted and is currently being evaluated by administrators.
                    </div>
                  ) : contract.status === 'APPROVED' ? (
                    <div style={{ color: '#16a34a', fontSize: 14 }}>
                      <strong>Approved:</strong> This contract has been formally approved by an administrator.
                    </div>
                  ) : (
                    <div style={{ color: '#dc2626', fontSize: 14 }}>
                      <strong>Rejected:</strong> This contract was rejected by an administrator. Please see workflow history comments below for details.
                    </div>
                  )}

                  {actionSuccess && <div className="upload-message success-message" style={{ marginTop: 12 }}>{actionSuccess}</div>}
                  {actionError && <div className="upload-message error" style={{ marginTop: 12 }}>{actionError}</div>}
                </div>
              )}
            </section>

            {/* AI Contract Analysis Report */}
            <ContractReportPanel contractId={contract.id} />

            {/* RAG Contract Q&A Panel */}
            <ContractQaPanel contractId={contract.id} />

            {/* Workflow Audit Trail */}
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Workflow History</h2>
                  <p className="muted" style={{ margin: '4px 0 0' }}>
                    Audit trail of all status transitions and reviewer comments
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
