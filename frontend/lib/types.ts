export type ContractStatus =
  | 'UPLOADED'
  | 'UNDER_REVIEW'
  | 'NEEDS_CHANGES'
  | 'APPROVED'
  | 'REJECTED'
  | 'DRAFT'
  | 'REVIEW'

export type PagedResponse<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

export type ContractListItem = {
  id: string
  title: string | null
  description: string | null
  status: ContractStatus
  ownerName: string | null
  ownerId?: string | null
  createdAt: string | null
  updatedAt: string | null
}

export type ContractDetail = ContractListItem & {
  originalFileName: string | null
  storedFileName?: string | null
  contentType: string | null
  fileSizeBytes: number | null
  uploadedAt: string | null
}

export type ContractUploadResponse = {
  id: string
  contractName: string
  status: ContractStatus
  originalFileName: string | null
  storedFileName: string | null
  contentType: string | null
  fileSizeBytes: number | null
  uploadedAt: string | null
}

export type WorkflowHistoryItem = {
  id: string
  contractId: string
  previousStatus: ContractStatus | null
  newStatus: ContractStatus
  changedBy: string | null
  comment?: string | null
  changedAt: string | null
}

export type ContractReport = {
  id: string
  contractId: string
  summary: string
  keyTerms: string[]
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  riskPoints: string[]
  importantDates: string[]
  obligations: string[]
  generatedBy: string
  generatedAt: string | null
}

export type ContractQuestionAnswer = {
  answer: string
  evidence: string[]
  generatedBy: string
}

export type User = {
  id: string
  name: string
  email: string
  role: 'USER' | 'ADMIN'
  createdAt: string | null
}

export type AuthResponse = {
  accessToken: string
  tokenType: string
  user: User
}

export function nextContractStatus(status: ContractStatus): ContractStatus | null {
  switch (status) {
    case 'UPLOADED':
    case 'NEEDS_CHANGES':
    case 'REJECTED':
      return 'UNDER_REVIEW'
    case 'UNDER_REVIEW':
      return 'APPROVED'
    case 'DRAFT':
      return 'UNDER_REVIEW'
    case 'REVIEW':
      return 'APPROVED'
    case 'APPROVED':
      return null
  }
}

export function formatContractStatus(status: ContractStatus): string {
  switch (status) {
    case 'UPLOADED':
      return 'Uploaded'
    case 'UNDER_REVIEW':
      return 'Under Review'
    case 'NEEDS_CHANGES':
      return 'Needs Changes'
    case 'DRAFT':
      return 'Draft'
    case 'REVIEW':
      return 'Review'
    case 'APPROVED':
      return 'Approved'
    case 'REJECTED':
      return 'Rejected'
  }
}
