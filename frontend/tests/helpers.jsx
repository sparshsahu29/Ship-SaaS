import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { AuthProvider } from '../src/auth/AuthContext'
import { ToastProvider } from '../src/components/Toast'
import { AppRoutes } from '../src/App'

export const TEST_USER = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'ada@example.com',
  name: 'Ada Lovelace',
  avatar_url: null,
  role: 'user',
  is_email_verified: true,
  has_password: true,
  has_google: false,
  created_at: '2024-01-01T00:00:00Z',
}

/** Build a JSON Response like the backend would return. */
export function jsonResponse(body, status = 200) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function errorResponse(status, code, message, details) {
  return jsonResponse({ error: { code, message, details } }, status)
}

/**
 * Install a fetch mock. `routes` maps "METHOD /path" to a Response or a
 * function (request body) => Response. Unmatched calls return 404.
 */
export function mockFetch(routes) {
  const calls = []
  const fetchMock = vi.fn(async (url, init = {}) => {
    const path = new URL(url).pathname
    const key = `${init.method || 'GET'} ${path}`
    const body = init.body ? JSON.parse(init.body) : undefined
    calls.push({ key, body, init })
    const handler = routes[key]
    if (!handler) return errorResponse(404, 'not_found', `No mock for ${key}`)
    return typeof handler === 'function' ? handler(body, init) : handler.clone()
  })
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, calls }
}

export function renderApp({ route = '/', routes = {} } = {}) {
  const mocks = mockFetch({ 'GET /api/auth/me': errorResponse(401, 'not_authenticated', 'Authentication required.'), ...routes })
  const utils = render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
  return { ...utils, ...mocks }
}

export const authenticatedRoutes = { 'GET /api/auth/me': jsonResponse(TEST_USER) }
