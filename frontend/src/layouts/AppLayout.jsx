import { Outlet } from 'react-router-dom'
import { Navbar } from '../components/Navbar'

/** Authenticated shell: top bar + content area for /app/*. */
export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
