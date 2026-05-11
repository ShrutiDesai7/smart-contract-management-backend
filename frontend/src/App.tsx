import { useState } from 'react'
import { AskQuestionCard } from './components/AskQuestionCard'
import { ContractListCard } from './components/ContractListCard'
import { Toast } from './components/Toast'
import { UploadContractCard } from './components/UploadContractCard'
import { useToasts } from './lib/useToasts'

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

function App() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [lastUploadedId, setLastUploadedId] = useState<number | null>(null)
  const toasts = useToasts()

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <LogoMark />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 sm:text-xl">Contract Management</h1>
                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                  PDF/DOCX
                </span>
                <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                  Q&A
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600">Upload → Extract text → Track status → Ask with evidence</p>
            </div>
          </div>

          <nav className="flex items-center gap-2 text-sm">
            {[
              { href: '#upload', label: 'Upload' },
              { href: '#contracts', label: 'Contracts' },
              { href: '#ask', label: 'Ask' },
            ].map((x) => (
              <a
                key={x.href}
                href={x.href}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                {x.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="mb-6">
          <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Workspace</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">Contract review in one place</div>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  Upload documents, move them through Draft → Review → Approved, and ask questions. Answers include a
                  supporting quote when available.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="#upload"
                  className="rounded-2xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
                >
                  Upload contract
                </a>
                <a
                  href="#ask"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Ask a question
                </a>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <section id="upload" className="scroll-mt-24">
            <UploadContractCard
              onUploaded={(id) => {
                setLastUploadedId(id)
                setRefreshKey((x) => x + 1)
                toasts.success('Uploaded', `Contract #${id} is ready.`)
              }}
              onError={(message) => toasts.error('Upload failed', message)}
            />
          </section>

          <section id="contracts" className="scroll-mt-24">
            <ContractListCard
              refreshKey={refreshKey}
              highlightId={lastUploadedId}
              onStatusUpdated={() => toasts.success('Status updated')}
              onError={(message) => toasts.error('Action failed', message)}
            />
          </section>

          <section id="ask" className="scroll-mt-24 md:col-span-2">
            <AskQuestionCard
              refreshKey={refreshKey}
              preferredContractId={lastUploadedId}
              onError={(message) => toasts.error('Ask failed', message)}
            />
          </section>
        </div>

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

