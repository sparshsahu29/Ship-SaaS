import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { TEST_USER, authenticatedRoutes, jsonResponse, renderApp } from './helpers'

describe('Auth state and protected routes', () => {
  it('shows a loading state, not protected UI, while /me is pending', async () => {
    let resolve
    renderApp({
      route: '/app/dashboard',
      routes: { 'GET /api/auth/me': () => new Promise((r) => (resolve = r)) },
    })
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument()
    expect(screen.queryByText(/welcome back/i)).not.toBeInTheDocument()

    resolve(jsonResponse(TEST_USER))
    expect(await screen.findByText(/welcome back, ada/i)).toBeInTheDocument()
  })

  it('redirects unauthenticated users from /app/* to /login', async () => {
    renderApp({ route: '/app/settings' })
    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /^settings$/i })).not.toBeInTheDocument()
  })

  it('redirects authenticated users from /login to the dashboard', async () => {
    renderApp({ route: '/login', routes: authenticatedRoutes })
    expect(await screen.findByText(/welcome back, ada/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^sign in$/i })).not.toBeInTheDocument()
  })

  it('restores the session on load via GET /api/auth/me', async () => {
    const { calls } = renderApp({ route: '/app/dashboard', routes: authenticatedRoutes })
    await screen.findByText(/welcome back, ada/i)
    const me = calls.find((c) => c.key === 'GET /api/auth/me')
    expect(me.init.credentials).toBe('include')
  })

  it('logs out from the user menu and returns to the landing page', async () => {
    const { calls } = renderApp({
      route: '/app/dashboard',
      routes: { ...authenticatedRoutes, 'POST /api/auth/logout': () => jsonResponse({ message: 'Logged out.' }) },
    })
    await screen.findByText(/welcome back, ada/i)

    await userEvent.click(screen.getByRole('button', { name: /open user menu/i }))
    await userEvent.click(await screen.findByRole('menuitem', { name: /log out/i }))

    expect(await screen.findByText(/landing page/i)).toBeInTheDocument()
    expect(calls.some((c) => c.key === 'POST /api/auth/logout')).toBe(true)
  })

  it('navigates to settings from the user menu', async () => {
    renderApp({ route: '/app/dashboard', routes: authenticatedRoutes })
    await screen.findByText(/welcome back, ada/i)

    await userEvent.click(screen.getByRole('button', { name: /open user menu/i }))
    await userEvent.click(await screen.findByRole('menuitem', { name: /settings/i }))

    expect(await screen.findByRole('heading', { name: /^settings$/i })).toBeInTheDocument()
  })

  it('drops the user when an API call returns 401', async () => {
    renderApp({
      route: '/app/settings',
      routes: {
        ...authenticatedRoutes,
        'PATCH /api/users/me': () => jsonResponse({ error: { code: 'not_authenticated', message: 'Session expired.' } }, 401),
      },
    })
    const nameInput = await screen.findByLabelText(/^name$/i)
    await userEvent.type(nameInput, ' Byron')
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument())
  })
})
