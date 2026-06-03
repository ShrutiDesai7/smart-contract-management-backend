type PaginationProps = {
  page: number
  totalPages: number
  totalElements: number
  size: number
  first: boolean
  last: boolean
  onPrevious: () => void
  onNext: () => void
}

export function Pagination({
  page,
  totalPages,
  totalElements,
  size,
  first,
  last,
  onPrevious,
  onNext,
}: PaginationProps) {
  const displayTotalPages = Math.max(totalPages, 1)
  const start = totalElements === 0 ? 0 : page * size + 1
  const end = Math.min((page + 1) * size, totalElements)

  return (
    <div className="pagination">
      <span className="muted">
        {start}-{end} of {totalElements} - Page {page + 1} of {displayTotalPages}
      </span>
      <div className="pagination-actions">
        <button className="button secondary" type="button" disabled={first} onClick={onPrevious}>
          Previous
        </button>
        <button className="button secondary" type="button" disabled={last} onClick={onNext}>
          Next
        </button>
      </div>
    </div>
  )
}
