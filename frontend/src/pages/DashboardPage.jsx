import { useAuth } from '../auth/AuthContext'
import { EmptyState } from '../components/EmptyState'

/**
 * Placeholder dashboard. Replace the contents of this file (or point the
 * /app/dashboard route at a component in src/features/) when you build your product.
 */
export function DashboardPage() {
  const { user } = useAuth()
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Welcome back, {user.name.split(' ')[0]}</h2>
        <p className="mt-1 text-sm text-muted">Here&apos;s where your product lives.</p>
      </div>
      <EmptyState
        title="Your product starts here."
        description="This dashboard is intentionally empty. Replace it with your SaaS functionality."
      />
    </div>
  )
}
