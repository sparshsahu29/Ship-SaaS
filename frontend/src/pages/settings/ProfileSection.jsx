import { useAuth } from '../../auth/AuthContext'
import { Avatar } from '../../components/Avatar'
import { Button } from '../../components/Button'
import { Card, CardBody, CardHeader } from '../../components/Card'
import { FormErrorBanner } from '../../components/FormError'
import { Input } from '../../components/Input'
import { useToast } from '../../components/Toast'
import { useForm, validators } from '../../hooks/useForm'
import { usersService } from '../../services/users'

export function ProfileSection() {
  const { user, setUser } = useAuth()
  const toast = useToast()

  const form = useForm({
    initialValues: { name: user.name },
    validate: (v) => ({ name: validators.required(v.name, 'Name') }),
    onSubmit: async ({ name }) => {
      const updated = await usersService.updateMe({ name: name.trim() })
      setUser(updated)
      toast.success('Profile updated.')
    },
  })

  const joined = new Date(user.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })

  return (
    <Card>
      <CardHeader title="Profile" description="Your public information." />
      <CardBody>
        <form onSubmit={form.handleSubmit} noValidate className="space-y-5">
          <FormErrorBanner message={form.formError} />
          <div className="flex items-center gap-4">
            <Avatar name={user.name} src={user.avatar_url} size="lg" />
            <div className="text-sm">
              <p className="font-medium">{user.name}</p>
              <p className="text-muted">Member since {joined}</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Name" autoComplete="name" {...form.field('name')} />
            <Input
              label="Email"
              type="email"
              value={user.email}
              disabled
              readOnly
              hint={user.is_email_verified ? 'Verified' : 'Not verified'}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={form.submitting} disabled={form.values.name.trim() === user.name}>
              Save changes
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}
