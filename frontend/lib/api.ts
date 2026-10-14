import type {
  AuthResponse,
  ContractDetail,
  ContractListItem,
  ContractQuestionAnswer,
  ContractReport,
  ContractStatus,
  ContractUploadResponse,
  PagedResponse,
  User,
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
  const token = localStorage.getItem('accessToken')
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) {
    throw new Error(await parseError(response))
  }
  return (await response.json()) as T
}

async function sendJson<T>(url: string, init: RequestInit): Promise<T> {
  const token = localStorage.getItem('accessToken')
  const headers = {
    ...(init.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  const response = await fetch(url, { ...init, headers })
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

  const token = localStorage.getItem('accessToken')
  const response = await fetch('/api/contracts/upload', {
    method: 'POST',
    body: form,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) {
    throw new Error(await parseError(response))
  }
  return (await response.json()) as ContractUploadResponse
}

export async function downloadContract(id: string, fileName?: string): Promise<void> {
  const token = localStorage.getItem('accessToken')
  const response = await fetch(`/api/contracts/${id}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) {
    throw new Error(await parseError(response))
  }
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName || 'contract-document'
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

export async function updateContractStatus(id: string, status: ContractStatus): Promise<ContractDetail> {
  return sendJson<ContractDetail>(`/api/contracts/${id}/status`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status }),
  })
}

export async function submitContractForReview(id: string): Promise<ContractDetail> {
  return sendJson<ContractDetail>(`/api/contracts/${id}/submit-review`, {
    method: 'POST',
  })
}

export async function reviewContract(params: {
  id: string
  status: 'APPROVED' | 'REJECTED' | 'NEEDS_CHANGES'
  comment?: string
}): Promise<ContractDetail> {
  return sendJson<ContractDetail>(`/api/contracts/${params.id}/review`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: params.status, comment: params.comment }),
  })
}

export async function getContractReport(id: string): Promise<ContractReport> {
  return getJson<ContractReport>(`/api/contracts/${id}/report`)
}

export async function regenerateContractReport(id: string): Promise<ContractReport> {
  return sendJson<ContractReport>(`/api/contracts/${id}/report/regenerate`, {
    method: 'POST',
  })
}

export async function askContractQuestion(params: {
  id: string
  question: string
}): Promise<ContractQuestionAnswer> {
  return sendJson<ContractQuestionAnswer>(`/api/contracts/${params.id}/ask`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question: params.question }),
  })
}

export async function registerUser(params: {
  name: string
  email: string
  password: string
  role?: 'USER' | 'ADMIN'
}): Promise<AuthResponse> {
  return sendJson<AuthResponse>('/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
  })
}

export async function loginUser(params: {
  email: string
  password: string
}): Promise<AuthResponse> {
  return sendJson<AuthResponse>('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
  })
}

export async function getCurrentUser(): Promise<User> {
  return getJson<User>('/api/auth/me')
}
