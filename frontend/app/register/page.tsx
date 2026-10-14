'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { registerUser } from '@/lib/api'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'USER' | 'ADMIN'>('USER')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      router.replace('/')
    }
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()

    if (!trimmedName) {
      setError('Please enter your name')
      return
    }

    if (!trimmedEmail) {
      setError('Please enter your email')
      return
    }

    if (trimmedPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (trimmedPassword !== confirmPassword.trim()) {
      setError('Passwords do not match')
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const response = await registerUser({
        name: trimmedName,
        email: trimmedEmail,
        password: trimmedPassword,
        role,
      })

      // Store token and user info
      localStorage.setItem('accessToken', response.accessToken)
      localStorage.setItem('tokenType', response.tokenType)
      localStorage.setItem('user', JSON.stringify(response.user))

      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          padding: 32,
          border: '1px solid var(--border)',
          borderRadius: 8,
          background: 'var(--surface)',
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div
              style={{
                display: 'grid',
                width: 48,
                height: 48,
                placeItems: 'center',
                border: '1px solid #bad3e8',
                borderRadius: 8,
                background: '#e8f2fb',
                color: '#0f4d7f',
                fontWeight: 800,
                fontSize: 20,
              }}
            >
              CM
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 20 }}>Contract Manager</h1>
            </div>
          </div>
          <h2 style={{ margin: '8px 0 0', fontSize: 24 }}>Create Account</h2>
          <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: 14 }}>Fill in your details to get started</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginBottom: 16 }}>
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              disabled={isLoading}
              autoComplete="name"
            />
          </div>

          <div className="field" style={{ marginBottom: 16 }}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          <div className="field" style={{ marginBottom: 16 }}>
            <label>Register As</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 6 }}>
              <button
                type="button"
                onClick={() => setRole('USER')}
                style={{
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: role === 'USER' ? '2px solid var(--accent, #0284c7)' : '1px solid var(--border)',
                  background: role === 'USER' ? '#f0f9ff' : 'var(--surface)',
                  color: role === 'USER' ? '#0369a1' : 'inherit',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontWeight: role === 'USER' ? 600 : 400,
                  fontSize: 13,
                }}
              >
                <div>Standard User</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Upload & track contracts</div>
              </button>
              <button
                type="button"
                onClick={() => setRole('ADMIN')}
                style={{
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: role === 'ADMIN' ? '2px solid var(--accent, #0284c7)' : '1px solid var(--border)',
                  background: role === 'ADMIN' ? '#f0f9ff' : 'var(--surface)',
                  color: role === 'ADMIN' ? '#0369a1' : 'inherit',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontWeight: role === 'ADMIN' ? 600 : 400,
                  fontSize: 13,
                }}
              >
                <div>Administrator</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Review & approve contracts</div>
              </button>
            </div>
          </div>

          <div className="field" style={{ marginBottom: 16 }}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              autoComplete="new-password"
            />
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--muted)' }}>At least 8 characters</p>
          </div>

          <div className="field" style={{ marginBottom: 24 }}>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              autoComplete="new-password"
            />
          </div>

          {error ? <div className="error" style={{ marginBottom: 16 }}>{error}</div> : null}

          <button className="button" type="submit" disabled={isLoading} style={{ width: '100%', marginBottom: 16 }}>
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div style={{ paddingTop: 16, borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: 14 }}>
          <p style={{ margin: 0, color: 'var(--muted)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
