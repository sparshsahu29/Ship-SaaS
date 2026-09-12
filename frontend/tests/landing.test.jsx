import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { authenticatedRoutes, renderApp } from './helpers'

describe('Landing page', () => {
  it('shows the placeholder and auth actions for guests', async () => {
    renderApp({ route: '/' })
    expect(await screen.findByRole('heading', { name: /landing page/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sign up/i })).toHaveAttribute('href', '/signup')
    expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute('href', '/login')
    expect(screen.queryByRole('link', { name: /go to dashboard/i })).not.toBeInTheDocument()
  })

  it('links signed-in users to the dashboard instead', async () => {
    renderApp({ route: '/', routes: authenticatedRoutes })
    expect(await screen.findByRole('link', { name: /go to dashboard/i })).toHaveAttribute('href', '/app/dashboard')
    expect(screen.queryByRole('link', { name: /sign up/i })).not.toBeInTheDocument()
  })

  it('navigates to the signup page', async () => {
    renderApp({ route: '/' })
    await userEvent.click(await screen.findByRole('link', { name: /sign up/i }))
    expect(await screen.findByRole('heading', { name: /create your account/i })).toBeInTheDocument()
  })
})
