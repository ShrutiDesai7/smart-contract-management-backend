import { useEffect } from 'react'

export type ToastKind = 'success' | 'error' | 'info'

export type ToastItem = {
  id: string
  kind: ToastKind
  title: string
  message?: string
}

function toastClasses(kind: ToastKind): string {
  switch (kind) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-950'
    case 'error':
      return 'border-rose-200 bg-rose-50 text-rose-950'
    case 'info':
      return 'border-slate-200 bg-white text-slate-900'
  }
}

export function Toast(props: {
  toast: ToastItem
  onClose: (id: string) => void
  autoCloseMs?: number
}) {
  useEffect(() => {
    const ms = props.autoCloseMs ?? 3500
    const t = window.setTimeout(() => props.onClose(props.toast.id), ms)
    return () => window.clearTimeout(t)
  }, [props])

  return (
    <div
      className={[
        'pointer-events-auto w-full max-w-sm rounded-2xl border px-4 py-3 shadow-lg',
        toastClasses(props.toast.kind),
      ].join(' ')}
      role={props.toast.kind === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold">{props.toast.title}</div>
          {props.toast.message ? (
            <div className="mt-0.5 text-xs text-slate-700">{props.toast.message}</div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => props.onClose(props.toast.id)}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-black/5"
          aria-label="Close"
        >
          Close
        </button>
      </div>
    </div>
  )
}

