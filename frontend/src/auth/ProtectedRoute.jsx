import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { FullPageSpinner } from '../components/LoadingSpinner'

/** Wraps /app/*: redirects to /login until the user is known to be authenticated. */
export function ProtectedRoute() {
  const { loading, isAuthenticated } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageSpinner />
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

/** Wraps /login, /signup: sends already-authenticated users to the app. */
export function GuestRoute() {
  const { loading, isAuthenticated } = useAuth()
  if (loading) return <FullPageSpinner />
  if (isAuthenticated) return <Navigate to="/app/dashboard" replace />
  return <Outlet />
}
