import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function NotFoundPage() {
  const { isAuthenticated } = useAuth()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-medium text-muted">404</p>
      <h1 className="mt-2 text-2xl font-semibold">Page not found</h1>
      <Link to={isAuthenticated ? '/app/dashboard' : '/login'} className="mt-6 text-sm font-medium underline-offset-4 hover:underline">
        {isAuthenticated ? 'Back to dashboard' : 'Go to sign in'}
      </Link>
    </div>
  )
}
