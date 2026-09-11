import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/Button'
import { FormErrorBanner } from '../components/FormError'
import { Input } from '../components/Input'
import { useForm, validators } from '../hooks/useForm'
import { authService } from '../services/auth'

export function ForgotPasswordPage() {
  const [sentMessage, setSentMessage] = useState(null)

  const form = useForm({
    initialValues: { email: '' },
    validate: (v) => ({ email: validators.email(v.email) }),
    onSubmit: async ({ email }) => {
      const res = await authService.forgotPassword(email)
      setSentMessage(res.message)
    },
  })

  if (sentMessage) {
    return (
      <>
        <h1 className="text-xl font-semibold">Check your email</h1>
        <p className="mt-2 text-sm text-muted">{sentMessage}</p>
        <Link to="/login" className="mt-6 inline-block text-sm font-medium underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </>
    )
  }

  return (
    <>
      <h1 className="text-xl font-semibold">Forgot your password?</h1>
      <p className="mt-1 text-sm text-muted">Enter your email and we&apos;ll send you a reset link.</p>
      <form onSubmit={form.handleSubmit} noValidate className="mt-6 space-y-4">
        <FormErrorBanner message={form.formError} />
        <Input label="Email" type="email" autoComplete="email" {...form.field('email')} />
        <Button type="submit" fullWidth loading={form.submitting}>
          Send reset link
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
