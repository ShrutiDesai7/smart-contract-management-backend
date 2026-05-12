import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AskQuestionCard } from './components/AskQuestionCard'
import { ContractListCard } from './components/ContractListCard'
import { Toast } from './components/Toast'
import { UploadContractCard } from './components/UploadContractCard'
import { useToasts } from './lib/useToasts'

type PanelKey = 'upload' | 'contracts' | 'ask'
type ViewMode = 'all' | 'focus'
type CollapseState = Record<PanelKey, boolean>

function LogoMark() {
  return (
    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-sm ring-1 ring-black/5">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M7 3h7l3 3v15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M14 3v4a1 1 0 0 0 1 1h4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M8.5 12h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8.5 15.5h5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </div>
  )
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore persistence errors
  }
}

function SectionShell(props: {
  id: PanelKey
  title: string
  subtitle: string
  collapsed: boolean
  onToggleCollapsed?: () => void
  children: ReactNode
}) {
  return (
    <section id={props.id} className="scroll-mt-24">
      <div className="rounded-3xl border border-slate-200/70 bg-white/70 shadow-sm ring-1 ring-black/5 backdrop-blur supports-[backdrop-filter]:bg-white/50 transition hover:shadow-md">
        <div className="flex flex-wrap items-start justify-between gap-3 p-5">
          <div className="min-w-[220px]">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{props.title}</div>
            <div className="mt-1 text-sm text-slate-600">{props.subtitle}</div>
          </div>

          {props.onToggleCollapsed ? (
            <button
              type="button"
              onClick={props.onToggleCollapsed}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900/50 active:scale-[0.99]"
              aria-expanded={!props.collapsed}
              aria-controls={`${props.id}-body`}
            >
              <span>{props.collapsed ? 'Expand' : 'Collapse'}</span>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className={props.collapsed ? '' : 'rotate-180 transform'}
              >
                <path
                  d="M6 9l6 6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : null}
        </div>

        <div id={`${props.id}-body`} className={props.collapsed ? 'hidden' : 'px-5 pb-5'}>
          {props.children}
        </div>
      </div>
    </section>
  )
}

function App() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [lastUploadedId, setLastUploadedId] = useState<number | null>(null)
  const toasts = useToasts()

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const savedMode = readJson<ViewMode>('cm.ui.viewMode')
    return savedMode === 'all' || savedMode === 'focus' ? savedMode : 'all'
  })

  const [activePanel, setActivePanel] = useState<PanelKey>(() => {
    const hash = window.location.hash.replace('#', '')
    if (hash === 'upload' || hash === 'contracts' || hash === 'ask') return hash

    const savedActive = readJson<PanelKey>('cm.ui.activePanel')
    return savedActive === 'upload' || savedActive === 'contracts' || savedActive === 'ask' ? savedActive : 'contracts'
  })

  const [collapsed, setCollapsed] = useState<CollapseState>(() => {
    const savedCollapsed = readJson<Partial<CollapseState>>('cm.ui.collapsed')
    return { upload: false, contracts: false, ask: false, ...(savedCollapsed ?? {}) }
  })

  const [heroCollapsed, setHeroCollapsed] = useState<boolean>(() => {
    const savedHero = readJson<boolean>('cm.ui.heroCollapsed')
    return typeof savedHero === 'boolean' ? savedHero : false
  })

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace('#', '')
      if (hash === 'upload' || hash === 'contracts' || hash === 'ask') setActivePanel(hash)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => writeJson('cm.ui.viewMode', viewMode), [viewMode])
  useEffect(() => writeJson('cm.ui.activePanel', activePanel), [activePanel])
  useEffect(() => writeJson('cm.ui.collapsed', collapsed), [collapsed])
  useEffect(() => writeJson('cm.ui.heroCollapsed', heroCollapsed), [heroCollapsed])

  const panels = useMemo(
    () =>
      [
        { key: 'upload' as const, label: 'Upload', hint: 'Add a new PDF/DOCX' },
        { key: 'contracts' as const, label: 'Contracts', hint: 'Track status and review' },
        { key: 'ask' as const, label: 'Ask', hint: 'Q&A with evidence' },
      ] satisfies Array<{ key: PanelKey; label: string; hint: string }>,
    [],
  )

  const selectPanel = (key: PanelKey) => {
    setActivePanel(key)
    try {
      window.location.hash = key
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <LogoMark />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 sm:text-xl">Contract Management</h1>
              </div>
              <p className="mt-1 text-xs text-slate-600">Upload → Extract text → Track status → Ask with evidence</p>
            </div>
          </div>

          <nav className="flex items-center gap-2 text-sm">
            <div className="flex items-center rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode('all')}
                className={
                  viewMode === 'all'
                    ? 'rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900/50 active:scale-[0.99]'
                    : 'rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900/50'
                }
                aria-pressed={viewMode === 'all'}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setViewMode('focus')}
                className={
                  viewMode === 'focus'
                    ? 'rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900/50 active:scale-[0.99]'
                    : 'rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900/50'
                }
                aria-pressed={viewMode === 'focus'}
              >
                Focus
              </button>
            </div>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="mb-6">
          <div className="rounded-3xl border border-slate-200/70 bg-white/70 shadow-sm ring-1 ring-black/5 backdrop-blur supports-[backdrop-filter]:bg-white/50">
            <div className="flex flex-wrap items-start justify-between gap-3 p-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Workspace</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">Contract review in one place</div>
                {!heroCollapsed && (
                  <p className="mt-2 max-w-2xl text-sm text-slate-600">
                    Upload documents, move them through Draft → Review → Approved, and ask questions. Answers include a
                    supporting quote when available.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHeroCollapsed((x) => !x)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900/50 active:scale-[0.99]"
                  aria-expanded={!heroCollapsed}
                >
                  {heroCollapsed ? 'Show details' : 'Hide details'}
                </button>
              </div>
            </div>

            <div className="border-t border-slate-200/70 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {panels.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => selectPanel(p.key)}
                      className={
                        activePanel === p.key
                          ? 'rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900/50 active:scale-[0.99]'
                          : 'rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900/50 active:scale-[0.99]'
                      }
                      aria-current={activePanel === p.key ? 'page' : undefined}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="text-xs text-slate-500">{panels.find((p) => p.key === activePanel)?.hint ?? ''}</div>
              </div>
            </div>
          </div>
        </section>

        {viewMode === 'focus' ? (
          <div className="grid gap-6">
            {activePanel === 'upload' && (
              <SectionShell
                id="upload"
                title="Upload"
                subtitle="Add a new contract and extract text"
                collapsed={false}
              >
                <UploadContractCard
                  onUploaded={(id) => {
                    setLastUploadedId(id)
                    setRefreshKey((x) => x + 1)
                    toasts.success('Uploaded', `Contract #${id} is ready.`)
                    setActivePanel('contracts')
                  }}
                  onError={(message) => toasts.error('Upload failed', message)}
                />
              </SectionShell>
            )}

            {activePanel === 'contracts' && (
              <SectionShell
                id="contracts"
                title="Contracts"
                subtitle="Track status and highlight recent uploads"
                collapsed={false}
              >
                <ContractListCard
                  refreshKey={refreshKey}
                  highlightId={lastUploadedId}
                  onStatusUpdated={() => toasts.success('Status updated')}
                  onError={(message) => toasts.error('Action failed', message)}
                />
              </SectionShell>
            )}

            {activePanel === 'ask' && (
              <SectionShell
                id="ask"
                title="Ask"
                subtitle="Question answering with evidence"
                collapsed={false}
              >
                <AskQuestionCard
                  refreshKey={refreshKey}
                  preferredContractId={lastUploadedId}
                  onError={(message) => toasts.error('Ask failed', message)}
                />
              </SectionShell>
            )}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <SectionShell
                id="upload"
                title="Upload"
                subtitle="Add a new contract and extract text"
                collapsed={collapsed.upload}
                onToggleCollapsed={() => setCollapsed((s) => ({ ...s, upload: !s.upload }))}
              >
                <UploadContractCard
                  onUploaded={(id) => {
                    setLastUploadedId(id)
                    setRefreshKey((x) => x + 1)
                    toasts.success('Uploaded', `Contract #${id} is ready.`)
                  }}
                  onError={(message) => toasts.error('Upload failed', message)}
                />
              </SectionShell>
            </div>

            <div className="lg:col-span-7">
              <SectionShell
                id="contracts"
                title="Contracts"
                subtitle="Track status and highlight recent uploads"
                collapsed={collapsed.contracts}
                onToggleCollapsed={() => setCollapsed((s) => ({ ...s, contracts: !s.contracts }))}
              >
                <ContractListCard
                  refreshKey={refreshKey}
                  highlightId={lastUploadedId}
                  onStatusUpdated={() => toasts.success('Status updated')}
                  onError={(message) => toasts.error('Action failed', message)}
                />
              </SectionShell>
            </div>

            <div className="lg:col-span-12">
              <SectionShell
                id="ask"
                title="Ask"
                subtitle="Question answering with evidence"
                collapsed={collapsed.ask}
                onToggleCollapsed={() => setCollapsed((s) => ({ ...s, ask: !s.ask }))}
              >
                <AskQuestionCard
                  refreshKey={refreshKey}
                  preferredContractId={lastUploadedId}
                  onError={(message) => toasts.error('Ask failed', message)}
                />
              </SectionShell>
            </div>
          </div>
        )}

        <footer className="mt-10 pb-6 text-center text-xs text-slate-500">
          Built for contract uploads, workflow tracking, and evidence-backed Q&A.
        </footer>
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 mx-auto flex max-w-6xl flex-col items-end gap-2 px-4">
        {toasts.toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={toasts.remove} />
        ))}
      </div>
    </div>
  )
}

export default App
