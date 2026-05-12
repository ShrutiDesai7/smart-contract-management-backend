import { useEffect, useMemo, useState } from 'react'
import type { AskQuestionResponse, Contract, ContractListItem } from '../lib/api'
import { askQuestion, getContract, listContracts } from '../lib/api'

function clampText(s: string, max: number): string {
  const t = (s || '').replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max).trim()}…`
}

export function AskQuestionCard(props: {
  refreshKey?: number
  preferredContractId?: number | null
  onError?: (message: string) => void
}) {
  const [contracts, setContracts] = useState<ContractListItem[]>([])
  const [selectedId, setSelectedId] = useState<number | ''>('')
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<AskQuestionResponse | null>(null)
  const [isLoadingContracts, setIsLoadingContracts] = useState(true)
  const [isAsking, setIsAsking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [isLoadingContract, setIsLoadingContract] = useState(false)
  const [showExcerpt, setShowExcerpt] = useState(false)

  const canAsk = useMemo(() => {
    return selectedId !== '' && question.trim().length > 0 && !isAsking
  }, [selectedId, question, isAsking])

  async function loadContracts() {
    try {
      setError(null)
      setIsLoadingContracts(true)
      const data = await listContracts()
      setContracts(data)

      if (props.preferredContractId != null && data.some((c) => c.id === props.preferredContractId)) {
        setSelectedId(props.preferredContractId)
        return
      }
      if (data.length > 0 && selectedId === '') {
        setSelectedId(data[0].id)
      }
    } catch (e: any) {
      const msg = e?.message || 'Failed to load contracts'
      setError(msg)
      props.onError?.(msg)
    } finally {
      setIsLoadingContracts(false)
    }
  }

  async function loadSelectedContract(id: number) {
    try {
      setIsLoadingContract(true)
      const c = await getContract(id)
      setSelectedContract(c)
    } catch (e: any) {
      setSelectedContract(null)
    } finally {
      setIsLoadingContract(false)
    }
  }

  useEffect(() => {
    loadContracts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.refreshKey])

  useEffect(() => {
    if (selectedId === '') {
      setSelectedContract(null)
      return
    }
    loadSelectedContract(selectedId)
    setShowExcerpt(false)
  }, [selectedId])

  useEffect(() => {
    if (props.preferredContractId == null) return
    setSelectedId((curr) => (curr === '' ? props.preferredContractId! : curr))
  }, [props.preferredContractId])

  async function onAsk(e: React.FormEvent) {
    e.preventDefault()
    setResult(null)
    setError(null)
    if (selectedId === '' || question.trim().length === 0) return

    try {
      setIsAsking(true)
      const res = await askQuestion({ id: selectedId, question: question.trim() })
      setResult(res)
    } catch (e: any) {
      const msg = e?.message || 'Failed to get answer'
      setError(msg)
      props.onError?.(msg)
    } finally {
      setIsAsking(false)
    }
  }

  const excerpt = useMemo(() => {
    const t = selectedContract?.extractedText
    if (!t) return null
    return clampText(t, 520)
  }, [selectedContract])

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white/80 shadow-sm ring-1 ring-black/5 transition hover:shadow-md">
      <div className="bg-gradient-to-r from-violet-600/10 via-indigo-600/5 to-transparent px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-2xl bg-white text-violet-700 shadow-sm ring-1 ring-black/5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M21 11.5a8.5 8.5 0 1 1-3.1-6.6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M22 12a10 10 0 0 1-10 10c-1.8 0-3.6-.5-5.1-1.4L2 22l1.4-4.9A10 10 0 0 1 12 2"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Ask a Question</h2>
              <p className="mt-1 text-sm text-slate-600">
                Answers are generated from extracted text and include supporting evidence when available.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadContracts}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>
      </div>

      <form className="space-y-4 px-5 py-5" onSubmit={onAsk}>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">Contract</label>
            <select
              value={selectedId}
              disabled={isLoadingContracts || contracts.length === 0}
              onChange={(e) => setSelectedId(e.target.value === '' ? '' : Number(e.target.value))}
              className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 disabled:opacity-60"
            >
              {isLoadingContracts ? <option value="">Loading…</option> : null}
              {!isLoadingContracts && contracts.length === 0 ? <option value="">No contracts yet</option> : null}
              {!isLoadingContracts
                ? contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.id} — {c.contractName}
                    </option>
                  ))
                : null}
            </select>

            <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              {selectedId === '' ? (
                'Select a contract to enable Q&A.'
              ) : isLoadingContract ? (
                'Loading contract details…'
              ) : selectedContract ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-900">{selectedContract.contractName}</div>
                    <div className="mt-0.5 text-[11px] text-slate-500">
                      Status: <span className="font-medium text-slate-700">{selectedContract.status}</span>
                      {selectedContract.originalFileName ? (
                        <>
                          {' '}
                          • File: <span className="font-medium text-slate-700">{selectedContract.originalFileName}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  {excerpt ? (
                    <button
                      type="button"
                      onClick={() => setShowExcerpt((v) => !v)}
                      className="rounded-xl bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                    >
                      {showExcerpt ? 'Hide excerpt' : 'Show excerpt'}
                    </button>
                  ) : null}
                </div>
              ) : (
                'Contract details unavailable.'
              )}
              {showExcerpt && excerpt ? <div className="mt-2 whitespace-pre-wrap">{excerpt}</div> : null}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Question</label>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., What are the payment terms?"
              className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
            />
            <div className="mt-2 text-xs text-slate-600">Uses OpenAI based on extracted text snippets.</div>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div>
        ) : null}

        <button
          type="submit"
          disabled={!canAsk}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isAsking ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Searching…
            </>
          ) : (
            'Ask'
          )}
        </button>
      </form>

      {result ? (
        <div className="border-t border-slate-200/70 bg-slate-50/70 px-5 py-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Result</div>
          <div className="mt-2 text-sm text-slate-800">
            <div className="font-medium text-slate-900">{result.question}</div>
            {result.matched ? (
              <div className="mt-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                {result.answer}
              </div>
            ) : (
              <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {result.answer || 'No relevant answer found.'}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
