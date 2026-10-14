'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { loginUser } from '@/lib/api'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()

    if (!trimmedEmail || !trimmedPassword) {
      setError('Please enter both email and password')
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const response = await loginUser({
        email: trimmedEmail,
        password: trimmedPassword,
      })

      // Store token and user info
      localStorage.setItem('accessToken', response.accessToken)
      localStorage.setItem('tokenType', response.tokenType)
      localStorage.setItem('user', JSON.stringify(response.user))

      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
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
          <h2 style={{ margin: '8px 0 0', fontSize: 24 }}>Sign In</h2>
          <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: 14 }}>Enter your credentials to continue</p>
        </div>

        <form onSubmit={handleSubmit}>
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

          <div className="field" style={{ marginBottom: 24 }}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          {error ? <div className="error" style={{ marginBottom: 16 }}>{error}</div> : null}

          <button className="button" type="submit" disabled={isLoading} style={{ width: '100%', marginBottom: 16 }}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ paddingTop: 16, borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: 14 }}>
          <p style={{ margin: 0, color: 'var(--muted)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>
              Create one
            </Link>
          </p>
        </div>

        <div
          style={{
            marginTop: 20,
            padding: 12,
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: 6,
            fontSize: 12,
            color: '#0369a1',
          }}
        >
          <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>Demo Credentials:</p>
          <p style={{ margin: '4px 0' }}>
            <strong>Admin:</strong> admin@example.com / password123
          </p>
          <p style={{ margin: '4px 0' }}>
            <strong>User:</strong> user@example.com / password123
          </p>
        </div>
      </div>
    </div>
  )
}
