import { useCallback, useMemo, useState } from 'react'
import type { ToastItem, ToastKind } from '../components/Toast'

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const remove = useCallback((id: string) => {
    setToasts((items) => items.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((kind: ToastKind, title: string, message?: string) => {
    const id = uid()
    const item: ToastItem = { id, kind, title, message }
    setToasts((items) => [item, ...items].slice(0, 4))
    return id
  }, [])

  const api = useMemo(
    () => ({
      toasts,
      remove,
      success: (title: string, message?: string) => push('success', title, message),
      error: (title: string, message?: string) => push('error', title, message),
      info: (title: string, message?: string) => push('info', title, message),
    }),
    [push, remove, toasts],
  )

  return api
}

