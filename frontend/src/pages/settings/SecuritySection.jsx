import { useAuth } from '../../auth/AuthContext'
import { useLogout } from '../../auth/useLogout'
import { Button } from '../../components/Button'
import { Card, CardBody, CardHeader } from '../../components/Card'
import { FormErrorBanner } from '../../components/FormError'
import { PasswordInput } from '../../components/PasswordInput'
import { useToast } from '../../components/Toast'
import { useForm, validators } from '../../hooks/useForm'
import { authService } from '../../services/auth'

export function SecuritySection() {
  const { user, refreshUser } = useAuth()
  const toast = useToast()
  const logout = useLogout()

  const form = useForm({
    initialValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    validate: (v) => ({
      currentPassword: user.has_password ? validators.required(v.currentPassword, 'Current password') : undefined,
      newPassword: validators.password(v.newPassword),
      confirmPassword: validators.match(v.newPassword, v.confirmPassword),
    }),
    onSubmit: async ({ currentPassword, newPassword }) => {
      const res = await authService.changePassword({
        currentPassword: user.has_password ? currentPassword : undefined,
        newPassword,
      })
      form.setValue('currentPassword', '')
      form.setValue('newPassword', '')
      form.setValue('confirmPassword', '')
      toast.success(res.message)
      if (!user.has_password) refreshUser()
    },
  })

  return (
    <Card>
      <CardHeader
        title="Security"
        description={user.has_password ? 'Change your password.' : 'Set a password to sign in without Google.'}
        action={
          <Button variant="secondary" size="sm" onClick={logout}>
            Log out
          </Button>
        }
      />
      <CardBody>
        <form onSubmit={form.handleSubmit} noValidate className="max-w-md space-y-4">
          <FormErrorBanner message={form.formError} />
          {user.has_password && (
            <PasswordInput label="Current password" autoComplete="current-password" {...form.field('currentPassword')} />
          )}
          <PasswordInput label="New password" autoComplete="new-password" hint="At least 8 characters." {...form.field('newPassword')} />
          <PasswordInput label="Confirm new password" autoComplete="new-password" {...form.field('confirmPassword')} />
          <div className="flex justify-end">
            <Button type="submit" loading={form.submitting}>
              {user.has_password ? 'Update password' : 'Set password'}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}
