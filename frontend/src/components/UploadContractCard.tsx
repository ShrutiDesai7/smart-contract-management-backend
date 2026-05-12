import { useMemo, useRef, useState } from 'react'
import { uploadContract } from '../lib/api'

export function UploadContractCard(props: {
  onUploaded?: (id: number) => void
  onError?: (message: string) => void
}) {
  const [contractName, setContractName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const canSubmit = useMemo(() => {
    return contractName.trim().length > 0 && file != null && !isUploading
  }, [contractName, file, isUploading])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!file || contractName.trim().length === 0) {
      const msg = 'Please enter a contract name and choose a PDF/DOCX file.'
      setError(msg)
      props.onError?.(msg)
      return
    }

    try {
      setIsUploading(true)
      const res = await uploadContract({ contractName: contractName.trim(), file })
      setSuccess(`Uploaded successfully. Contract ID: ${res.id}`)
      setContractName('')
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      props.onUploaded?.(res.id)
    } catch (e: any) {
      const msg = e?.message || 'Upload failed'
      setError(msg)
      props.onError?.(msg)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white/80 shadow-sm ring-1 ring-black/5 transition hover:shadow-md">
      <div className="bg-gradient-to-r from-emerald-600/10 via-emerald-600/5 to-transparent px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-2xl bg-white text-emerald-700 shadow-sm ring-1 ring-black/5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 3v10"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M8.5 9.5 12 13l3.5-3.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Upload Contract</h2>
          </div>
        </div>
      </div>

      <form className="space-y-4 px-5 py-5" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm font-medium text-slate-700">Contract Name</label>
          <input
            value={contractName}
            onChange={(e) => setContractName(e.target.value)}
            placeholder="e.g., NDA — ACME"
            className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">File (PDF or DOCX)</label>
          <input
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            ref={fileInputRef}
            className="mt-1 block w-full text-sm file:mr-4 file:rounded-2xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
          />
          {file ? (
            <div className="mt-2 text-xs text-slate-600">
              Selected: <span className="font-medium text-slate-800">{file.name}</span>
            </div>
          ) : null}
          <p className="mt-1 text-xs text-slate-500">
            Allowed: <span className="font-medium">.pdf</span>, <span className="font-medium">.docx</span>
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div>
        ) : null}
        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {success}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Uploading…
            </>
          ) : (
            'Upload'
          )}
        </button>
      </form>
    </div>
  )
}
