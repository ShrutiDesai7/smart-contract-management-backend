import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Pagination } from './Pagination'

describe('Pagination', () => {
  it('renders page details and handles navigation actions', () => {
    const onPrevious = vi.fn()
    const onNext = vi.fn()

    render(
      <Pagination
        page={1}
        totalPages={3}
        totalElements={24}
        size={8}
        first={false}
        last={false}
        onPrevious={onPrevious}
        onNext={onNext}
      />
    )

    expect(screen.getByText('9-16 of 24 - Page 2 of 3')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /previous/i }))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    expect(onPrevious).toHaveBeenCalledTimes(1)
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('disables navigation buttons at the list boundaries', () => {
    render(
      <Pagination
        page={0}
        totalPages={1}
        totalElements={0}
        size={8}
        first={true}
        last={true}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })
})
