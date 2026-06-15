'use client'

import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { uploadContract } from '@/lib/api'

type UploadContractPanelProps = {
  onUploaded: (id: string) => void
}

export function UploadContractPanel({ onUploaded }: UploadContractPanelProps) {
  const [contractName, setContractName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    setError(null)

    if (!contractName.trim() || !file) {
      setError('Enter a contract name and choose a PDF or DOCX file.')
      return
    }

    try {
      setIsUploading(true)
      const result = await uploadContract({ contractName: contractName.trim(), file })
      setMessage(`Uploaded ${result.contractName || `contract #${result.id}`}.`)
      setContractName('')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      onUploaded(result.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <section className="panel upload-panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Upload Contract</h2>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            Add a PDF or DOCX contract to start workflow tracking.
          </p>
        </div>
      </div>

      <form className="upload-form" onSubmit={submit}>
        <div className="field">
          <label htmlFor="contract-name">Contract Name</label>
          <input
            id="contract-name"
            className="input"
            value={contractName}
            onChange={(event) => setContractName(event.target.value)}
            placeholder="e.g. Vendor Services Agreement"
          />
        </div>

        <div className="field">
          <label htmlFor="contract-file">File</label>
          <input
            id="contract-file"
            className="input file-input"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            ref={fileInputRef}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </div>

        <button className="button" type="submit" disabled={isUploading}>
          {isUploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>

      {file ? <div className="upload-note muted">Selected: {file.name}</div> : null}
      {message ? <div className="upload-message success-message">{message}</div> : null}
      {error ? <div className="upload-message error">{error}</div> : null}
    </section>
  )
}
