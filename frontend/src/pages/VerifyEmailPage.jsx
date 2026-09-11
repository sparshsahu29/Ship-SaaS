import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { authService } from '../services/auth'

export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const { isAuthenticated, refreshUser } = useAuth()
  const [state, setState] = useState(token ? 'verifying' : 'error')
  const [message, setMessage] = useState(token ? null : 'This verification link is missing its token.')
  const ran = useRef(false)

  useEffect(() => {
    if (!token || ran.current) return
    ran.current = true
    authService
      .verifyEmail(token)
      .then(() => {
        setState('success')
        if (isAuthenticated) refreshUser()
      })
      .catch((err) => {
        setState('error')
        setMessage(err.message)
      })
  }, [token, isAuthenticated, refreshUser])

  if (state === 'verifying') {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-muted">
        <LoadingSpinner />
        <p className="text-sm">Verifying your email…</p>
      </div>
    )
  }

  const success = state === 'success'
  return (
    <>
      <h1 className="text-xl font-semibold">{success ? 'Email verified' : 'Verification failed'}</h1>
      <p className="mt-2 text-sm text-muted">
        {success ? 'Thanks — your email address has been confirmed.' : message}
      </p>
      <Link
        to={isAuthenticated ? '/app/dashboard' : '/login'}
        className="mt-6 inline-block text-sm font-medium underline-offset-4 hover:underline"
      >
        {isAuthenticated ? 'Go to dashboard' : 'Go to sign in'}
      </Link>
    </>
  )
}
