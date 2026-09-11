import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/Button'
import { FormErrorBanner } from '../components/FormError'
import { GoogleButton } from '../components/GoogleButton'
import { Input } from '../components/Input'
import { PasswordInput } from '../components/PasswordInput'
import { useForm, validators } from '../hooks/useForm'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()

  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: (v) => ({ email: validators.email(v.email), password: validators.required(v.password, 'Password') }),
    onSubmit: async (v) => {
      await login(v)
      navigate(location.state?.from || '/app/dashboard', { replace: true })
    },
  })

  const oauthError = params.get('error') === 'google' ? 'Google sign-in failed. Please try again.' : null

  return (
    <>
      <h1 className="text-xl font-semibold">Welcome back</h1>
      <p className="mt-1 text-sm text-muted">Sign in to your account to continue.</p>

      <div className="mt-6 space-y-4">
        <GoogleButton label="Sign in with Google" />
        <Divider />
        <form onSubmit={form.handleSubmit} noValidate className="space-y-4">
          <FormErrorBanner message={form.formError || oauthError} />
          <Input label="Email" type="email" autoComplete="email" {...form.field('email')} />
          <PasswordInput label="Password" autoComplete="current-password" {...form.field('password')} />
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm text-muted underline-offset-4 hover:underline">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" fullWidth loading={form.submitting}>
            Sign in
          </Button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Don&apos;t have an account?{' '}
        <Link to="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
          Sign up
        </Link>
      </p>
    </>
  )
}

export function Divider({ label = 'or' }) {
  return (
    <div className="flex items-center gap-3 text-xs uppercase text-muted" role="separator">
      <span className="h-px flex-1 bg-border" />
      {label}
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}
