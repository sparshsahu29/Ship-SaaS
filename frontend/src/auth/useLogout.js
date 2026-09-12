import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

/**
 * Log out and land on the public landing page.
 * Navigates first so ProtectedRoute doesn't bounce the user to /login
 * when the auth state clears.
 */
export function useLogout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  return useCallback(async () => {
    navigate('/', { replace: true })
    await logout()
  }, [logout, navigate])
}
