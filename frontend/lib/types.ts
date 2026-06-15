export type ContractStatus = 'DRAFT' | 'REVIEW' | 'APPROVED'

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
  changedAt: string | null
}

export function nextContractStatus(status: ContractStatus): ContractStatus | null {
  switch (status) {
    case 'DRAFT':
      return 'REVIEW'
    case 'REVIEW':
      return 'APPROVED'
    case 'APPROVED':
      return null
  }
}

export function formatContractStatus(status: ContractStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'Draft'
    case 'REVIEW':
      return 'Review'
    case 'APPROVED':
      return 'Approved'
  }
}
