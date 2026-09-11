import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { FormErrorBanner } from '../components/FormError'
import { PasswordInput } from '../components/PasswordInput'
import { useForm, validators } from '../hooks/useForm'
import { authService } from '../services/auth'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const navigate = useNavigate()
  const [done, setDone] = useState(false)

  const form = useForm({
    initialValues: { password: '', confirmPassword: '' },
    validate: (v) => ({
      password: validators.password(v.password),
      confirmPassword: validators.match(v.password, v.confirmPassword),
    }),
    onSubmit: async ({ password }) => {
      await authService.resetPassword({ token, password })
      setDone(true)
    },
  })

  if (!token) {
    return (
      <>
        <h1 className="text-xl font-semibold">Invalid link</h1>
        <p className="mt-2 text-sm text-muted">This password reset link is missing its token.</p>
        <Link to="/forgot-password" className="mt-6 inline-block text-sm font-medium underline-offset-4 hover:underline">
          Request a new link
        </Link>
      </>
    )
  }

  if (done) {
    return (
      <>
        <h1 className="text-xl font-semibold">Password updated</h1>
        <p className="mt-2 text-sm text-muted">Your password has been reset. You can now sign in with your new password.</p>
        <Button className="mt-6" fullWidth onClick={() => navigate('/login')}>
          Go to sign in
        </Button>
      </>
    )
  }

  return (
    <>
      <h1 className="text-xl font-semibold">Choose a new password</h1>
      <form onSubmit={form.handleSubmit} noValidate className="mt-6 space-y-4">
        <FormErrorBanner message={form.formError} />
        <PasswordInput label="New password" autoComplete="new-password" hint="At least 8 characters." {...form.field('password')} />
        <PasswordInput label="Confirm password" autoComplete="new-password" {...form.field('confirmPassword')} />
        <Button type="submit" fullWidth loading={form.submitting}>
          Reset password
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  )
}
