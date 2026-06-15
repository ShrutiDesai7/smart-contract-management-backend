import type {
  ContractDetail,
  ContractListItem,
  ContractStatus,
  ContractUploadResponse,
  PagedResponse,
  WorkflowHistoryItem,
} from './types'

type ListContractsParams = {
  page: number
  size: number
  search?: string
  status?: ContractStatus | ''
}

async function parseError(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const body = (await response.json()) as Record<string, unknown>
    return String(body.message || body.error || body.detail || `Request failed with status ${response.status}`)
  }
  const text = await response.text()
  return text || `Request failed with status ${response.status}`
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(await parseError(response))
  }
  return (await response.json()) as T
}

async function sendJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  if (!response.ok) {
    throw new Error(await parseError(response))
  }
  return (await response.json()) as T
}

export async function listContracts(params: ListContractsParams): Promise<PagedResponse<ContractListItem>> {
  const query = new URLSearchParams()
  query.set('page', String(params.page))
  query.set('size', String(params.size))
  if (params.search?.trim()) query.set('search', params.search.trim())
  if (params.status) query.set('status', params.status)

  return getJson<PagedResponse<ContractListItem>>(`/api/contracts?${query.toString()}`)
}

export async function getContract(id: string): Promise<ContractDetail> {
  return getJson<ContractDetail>(`/api/contracts/${id}`)
}

export async function getWorkflowHistory(id: string): Promise<WorkflowHistoryItem[]> {
  return getJson<WorkflowHistoryItem[]>(`/api/contracts/${id}/history`)
}

export async function uploadContract(params: {
  contractName: string
  file: File
}): Promise<ContractUploadResponse> {
  const form = new FormData()
  form.append('contractName', params.contractName)
  form.append('file', params.file)

  const response = await fetch('/api/contracts/upload', {
    method: 'POST',
    body: form,
  })
  if (!response.ok) {
    throw new Error(await parseError(response))
  }
  return (await response.json()) as ContractUploadResponse
}

export async function updateContractStatus(id: string, status: ContractStatus): Promise<ContractDetail> {
  return sendJson<ContractDetail>(`/api/contracts/${id}/status`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status }),
  })
}
