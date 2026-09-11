import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/Button'
import { FormErrorBanner } from '../components/FormError'
import { GoogleButton } from '../components/GoogleButton'
import { Input } from '../components/Input'
import { PasswordInput } from '../components/PasswordInput'
import { useForm, validators } from '../hooks/useForm'
import { Divider } from './LoginPage'

export function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()

  const form = useForm({
    initialValues: { name: '', email: '', password: '', confirmPassword: '' },
    validate: (v) => ({
      name: validators.required(v.name, 'Name'),
      email: validators.email(v.email),
      password: validators.password(v.password),
      confirmPassword: validators.match(v.password, v.confirmPassword),
    }),
    onSubmit: async ({ name, email, password }) => {
      await signup({ name, email, password })
      navigate('/app/dashboard', { replace: true })
    },
  })

  return (
    <>
      <h1 className="text-xl font-semibold">Create your account</h1>
      <p className="mt-1 text-sm text-muted">Get started in less than a minute.</p>

      <div className="mt-6 space-y-4">
        <GoogleButton label="Sign up with Google" />
        <Divider />
        <form onSubmit={form.handleSubmit} noValidate className="space-y-4">
          <FormErrorBanner message={form.formError} />
          <Input label="Name" autoComplete="name" {...form.field('name')} />
          <Input label="Email" type="email" autoComplete="email" {...form.field('email')} />
          <PasswordInput label="Password" autoComplete="new-password" hint="At least 8 characters." {...form.field('password')} />
          <PasswordInput label="Confirm password" autoComplete="new-password" {...form.field('confirmPassword')} />
          <Button type="submit" fullWidth loading={form.submitting}>
            Create account
          </Button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </>
  )
}
