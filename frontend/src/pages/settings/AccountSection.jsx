import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { Button } from '../../components/Button'
import { Card, CardBody, CardHeader } from '../../components/Card'
import { FormErrorBanner } from '../../components/FormError'
import { Input } from '../../components/Input'
import { Modal } from '../../components/Modal'
import { usersService } from '../../services/users'

const CONFIRM_WORD = 'DELETE'

export function AccountSection() {
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const close = () => {
    setOpen(false)
    setConfirm('')
    setError(null)
  }

  const onDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      await usersService.deleteMe()
      setUser(null)
      navigate('/login', { replace: true })
    } catch (err) {
      setError(err.message)
      setDeleting(false)
    }
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader title="Delete account" description="Permanently remove your account and all associated data." />
      <CardBody className="flex justify-end">
        <Button variant="destructive" onClick={() => setOpen(true)}>
          Delete account
        </Button>
      </CardBody>

      <Modal
        open={open}
        onClose={close}
        title="Delete your account?"
        description="This action cannot be undone. All of your data will be permanently deleted."
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onDelete} loading={deleting} disabled={confirm !== CONFIRM_WORD}>
              Delete account
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <FormErrorBanner message={error} />
          <Input
            label={`Type ${CONFIRM_WORD} to confirm`}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="off"
          />
        </div>
      </Modal>
    </Card>
  )
}
