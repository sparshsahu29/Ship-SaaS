import { NavLink } from 'react-router-dom'
import { Logo } from './Logo'
import { UserMenu } from './UserMenu'
import { cn } from '../lib/cn'

/**
 * Primary navigation shown in the top bar, e.g. `{ to: '/app/projects', label: 'Projects' }`.
 * Empty by default: the logo links to the dashboard and Settings lives in the
 * user menu (avatar), so the bar stays clean until you add product pages.
 */
export const navigation = []

export function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Logo to="/app/dashboard" className="text-sm" />
        {navigation.length > 0 && (
          <nav aria-label="Main" className="flex items-center gap-1">
            {navigation.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive ? 'bg-muted-background text-foreground' : 'text-muted hover:bg-muted-background hover:text-foreground',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        )}
        <div className="ml-auto flex items-center gap-2">
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
