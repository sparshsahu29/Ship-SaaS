import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { TEST_USER, authenticatedRoutes, errorResponse, jsonResponse, renderApp } from './helpers'

describe('Settings page', () => {
  it('shows profile details', async () => {
    renderApp({ route: '/app/settings', routes: authenticatedRoutes })
    expect(await screen.findByLabelText(/^name$/i)).toHaveValue('Ada Lovelace')
    expect(screen.getByLabelText(/^email$/i)).toHaveValue('ada@example.com')
    expect(screen.getByLabelText(/^email$/i)).toBeDisabled()
    expect(screen.getByText(/member since/i)).toBeInTheDocument()
  })

  it('updates the name', async () => {
    const { calls } = renderApp({
      route: '/app/settings',
      routes: {
        ...authenticatedRoutes,
        'PATCH /api/users/me': (body) => jsonResponse({ ...TEST_USER, name: body.name }),
      },
    })
    const input = await screen.findByLabelText(/^name$/i)
    await userEvent.clear(input)
    await userEvent.type(input, 'Ada Byron')
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText(/profile updated/i)).toBeInTheDocument()
    expect(calls.find((c) => c.key === 'PATCH /api/users/me').body).toEqual({ name: 'Ada Byron' })
  })

  it('changes the password and shows wrong-current-password errors', async () => {
    const { calls } = renderApp({
      route: '/app/settings',
      routes: {
        ...authenticatedRoutes,
        'POST /api/auth/change-password': (body) =>
          body.current_password === 'old-password-1'
            ? jsonResponse({ message: 'Password updated.' })
            : errorResponse(401, 'invalid_password', 'Current password is incorrect.'),
      },
    })
    await screen.findByLabelText(/^name$/i)

    await userEvent.type(screen.getByLabelText(/current password/i), 'wrong-password')
    await userEvent.type(screen.getByLabelText(/^new password$/i), 'new-password-123')
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'new-password-123')
    await userEvent.click(screen.getByRole('button', { name: /update password/i }))
    expect(await screen.findByText(/current password is incorrect/i)).toBeInTheDocument()

    await userEvent.clear(screen.getByLabelText(/current password/i))
    await userEvent.type(screen.getByLabelText(/current password/i), 'old-password-1')
    await userEvent.click(screen.getByRole('button', { name: /update password/i }))
    expect(await screen.findByText(/^password updated\.$/i)).toBeInTheDocument()

    const last = calls.filter((c) => c.key === 'POST /api/auth/change-password').at(-1)
    expect(last.body).toEqual({ current_password: 'old-password-1', new_password: 'new-password-123' })
  })

  it('requires typed confirmation before deleting the account', async () => {
    const { calls } = renderApp({
      route: '/app/settings',
      routes: { ...authenticatedRoutes, 'DELETE /api/users/me': () => new Response(null, { status: 204 }) },
    })
    await screen.findByLabelText(/^name$/i)

    await userEvent.click(screen.getByRole('button', { name: /delete account/i }))
    const dialog = await screen.findByRole('dialog')
    const confirmButton = within(dialog).getByRole('button', { name: /delete account/i })
    expect(confirmButton).toBeDisabled()

    await userEvent.type(within(dialog).getByLabelText(/type delete to confirm/i), 'DELETE')
    expect(confirmButton).toBeEnabled()
    await userEvent.click(confirmButton)

    await waitFor(() => expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument())
    expect(calls.some((c) => c.key === 'DELETE /api/users/me')).toBe(true)
  })
})
