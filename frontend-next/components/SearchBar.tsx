'use client'

import type { FormEvent } from 'react'

type SearchBarProps = {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onClear: () => void
}

export function SearchBar({ value, onChange, onSubmit, onClear }: SearchBarProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="contract-search">Search</label>
        <input
          id="contract-search"
          className="input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search title or owner"
        />
      </div>
      <button className="button" type="submit">
        Search
      </button>
      <button className="button secondary" type="button" onClick={onClear} disabled={!value}>
        Clear
      </button>
    </form>
  )
}
