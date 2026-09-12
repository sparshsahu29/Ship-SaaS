import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/Button'
import { Logo } from '../components/Logo'
import { appConfig } from '../config/appConfig'

/**
 * Public landing page at "/". Intentionally blank: a header with auth
 * actions and a hero placeholder. Replace the hero with your marketing
 * content; the header/auth wiring can stay as-is.
 */
export function LandingPage() {
  const { isAuthenticated, loading } = useAuth()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo to="/" className="text-sm" />
          <nav aria-label="Account" className="flex items-center gap-2">
            {loading ? null : isAuthenticated ? (
              <Button to="/app/dashboard" size="sm">Go to dashboard</Button>
            ) : (
              <>
                <Button to="/login" size="sm" variant="ghost">Log in</Button>
                <Button to="/signup" size="sm">Sign up</Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-muted sm:text-4xl">Landing page</h1>
      </main>

      <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted">
        &copy; {new Date().getFullYear()} {appConfig.appName} &middot;{' '}
        <a className="underline" href={`mailto:${appConfig.supportEmail}`}>{appConfig.supportEmail}</a>
      </footer>
    </div>
  )
}
