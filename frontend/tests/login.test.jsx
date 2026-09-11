import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { TEST_USER, errorResponse, jsonResponse, renderApp } from './helpers'

describe('Login page', () => {
  it('shows validation errors before calling the API', async () => {
    const { calls } = renderApp({ route: '/login' })
    await screen.findByRole('heading', { name: /welcome back/i })

    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }))

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
    expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    expect(calls.filter((c) => c.key === 'POST /api/auth/login')).toHaveLength(0)
  })

  it('logs in and redirects to the dashboard', async () => {
    const { calls } = renderApp({
      route: '/login',
      routes: { 'POST /api/auth/login': () => jsonResponse(TEST_USER) },
    })
    await screen.findByRole('heading', { name: /welcome back/i })

    await userEvent.type(screen.getByLabelText(/email/i), 'ada@example.com')
    await userEvent.type(screen.getByLabelText(/^password$/i), 'correct-horse')
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }))

    expect(await screen.findByText(/welcome back, ada/i)).toBeInTheDocument()
    const login = calls.find((c) => c.key === 'POST /api/auth/login')
    expect(login.body).toEqual({ email: 'ada@example.com', password: 'correct-horse' })
    expect(login.init.credentials).toBe('include')
  })

  it('displays API errors', async () => {
    renderApp({
      route: '/login',
      routes: { 'POST /api/auth/login': () => errorResponse(401, 'invalid_credentials', 'Invalid email or password.') },
    })
    await screen.findByRole('heading', { name: /welcome back/i })

    await userEvent.type(screen.getByLabelText(/email/i), 'ada@example.com')
    await userEvent.type(screen.getByLabelText(/^password$/i), 'wrong-password')
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.')
    await waitFor(() => expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument())
  })

  it('shows a message when Google sign-in failed', async () => {
    renderApp({ route: '/login?error=google' })
    expect(await screen.findByRole('alert')).toHaveTextContent(/google sign-in failed/i)
  })

  it('has a Google button linking to the backend', async () => {
    renderApp({ route: '/login' })
    expect(await screen.findByRole('button', { name: /sign in with google/i })).toBeInTheDocument()
  })
})
