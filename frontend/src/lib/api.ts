export type ContractStatus = 'DRAFT' | 'REVIEW' | 'APPROVED'

export type ContractUploadResponse = {
  id: number
  contractName: string
  status: ContractStatus
  originalFileName: string | null
  storedFileName: string | null
  contentType: string | null
  fileSizeBytes: number | null
  uploadedAt: string | null
}

export type ContractListItem = {
  id: number
  contractName: string
  status: ContractStatus
  uploadedAt: string | null
  originalFileName: string | null
  contentType: string | null
  fileSizeBytes: number | null
}

type ApiError = {
  status: number
  message: string
}

async function parseApiError(resp: Response): Promise<ApiError> {
  const contentType = resp.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const body = (await resp.json()) as unknown
    const message = (() => {
      if (typeof body !== 'object' || body === null) return `Request failed with status ${resp.status}`
      if ('message' in body) return String((body as any).message)
      if ('error' in body) return String((body as any).error)
      if ('detail' in body) return String((body as any).detail)
      return `Request failed with status ${resp.status}`
    })()
    return { status: resp.status, message }
  }
  const text = await resp.text()
  return { status: resp.status, message: text || `Request failed with status ${resp.status}` }
}

export async function uploadContract(params: {
  contractName: string
  file: File
}): Promise<ContractUploadResponse> {
  const form = new FormData()
  form.append('contractName', params.contractName)
  form.append('file', params.file)

  const resp = await fetch('/api/contracts/upload', {
    method: 'POST',
    body: form,
  })

  if (!resp.ok) {
    throw await parseApiError(resp)
  }
  return (await resp.json()) as ContractUploadResponse
}

export async function listContracts(): Promise<ContractListItem[]> {
  const resp = await fetch('/api/contracts', { method: 'GET' })
  if (!resp.ok) {
    throw await parseApiError(resp)
  }
  return (await resp.json()) as ContractListItem[]
}

export async function updateContractStatus(params: {
  id: number
  status: ContractStatus
}): Promise<void> {
  const resp = await fetch(`/api/contracts/${params.id}/status`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: params.status }),
  })
  if (!resp.ok) {
    throw await parseApiError(resp)
  }
}

export type AskQuestionResponse = {
  question: string
  answer: string | null
  matched: boolean
}

export async function askQuestion(params: {
  id: number
  question: string
}): Promise<AskQuestionResponse> {
  const resp = await fetch(`/api/contracts/${params.id}/ask`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question: params.question }),
  })
  if (!resp.ok) {
    throw await parseApiError(resp)
  }
  return (await resp.json()) as AskQuestionResponse
}

export type Contract = {
  id: number
  contractName: string
  status: ContractStatus
  originalFileName: string | null
  storedFileName: string | null
  contentType: string | null
  fileSizeBytes: number | null
  uploadedAt: string | null
  filePath: string | null
  extractedText: string | null
}

export async function getContract(id: number): Promise<Contract> {
  const resp = await fetch(`/api/contracts/${id}`, { method: 'GET' })
  if (!resp.ok) {
    throw await parseApiError(resp)
  }
  return (await resp.json()) as Contract
}
