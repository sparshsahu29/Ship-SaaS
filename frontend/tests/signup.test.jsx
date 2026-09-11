import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { TEST_USER, errorResponse, jsonResponse, renderApp } from './helpers'

async function fillForm({ password = 'a-strong-password', confirm = password } = {}) {
  await userEvent.type(screen.getByLabelText(/^name$/i), 'Ada Lovelace')
  await userEvent.type(screen.getByLabelText(/^email$/i), 'ada@example.com')
  await userEvent.type(screen.getByLabelText(/^password$/i), password)
  await userEvent.type(screen.getByLabelText(/confirm password/i), confirm)
}

describe('Signup page', () => {
  it('validates password length and confirmation', async () => {
    const { calls } = renderApp({ route: '/signup' })
    await screen.findByRole('heading', { name: /create your account/i })

    await fillForm({ password: 'short', confirm: 'different' })
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument()
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    expect(calls.filter((c) => c.key === 'POST /api/auth/signup')).toHaveLength(0)
  })

  it('creates an account and lands on the dashboard', async () => {
    const { calls } = renderApp({
      route: '/signup',
      routes: { 'POST /api/auth/signup': () => jsonResponse({ ...TEST_USER, is_email_verified: false }, 201) },
    })
    await screen.findByRole('heading', { name: /create your account/i })

    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText(/welcome back, ada/i)).toBeInTheDocument()
    expect(screen.getByText(/please verify your email/i)).toBeInTheDocument()
    const signup = calls.find((c) => c.key === 'POST /api/auth/signup')
    expect(signup.body).toEqual({ name: 'Ada Lovelace', email: 'ada@example.com', password: 'a-strong-password' })
    expect(signup.body.confirmPassword).toBeUndefined()
  })

  it('shows a duplicate email error from the API', async () => {
    renderApp({
      route: '/signup',
      routes: { 'POST /api/auth/signup': () => errorResponse(409, 'email_taken', 'An account with this email already exists.') },
    })
    await screen.findByRole('heading', { name: /create your account/i })

    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/already exists/i)
  })
})
