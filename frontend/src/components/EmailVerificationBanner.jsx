import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { authService } from '../services/auth'
import { useToast } from './Toast'

export function EmailVerificationBanner() {
  const { user } = useAuth()
  const toast = useToast()
  const [sending, setSending] = useState(false)
  if (!user || user.is_email_verified) return null

  const resend = async () => {
    setSending(true)
    try {
      const res = await authService.resendVerification()
      toast.success(res.message)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="border-b border-border bg-muted-background px-4 py-2 text-sm sm:px-6">
      Please verify your email address.{' '}
      <button type="button" onClick={resend} disabled={sending} className="font-medium underline disabled:opacity-50">
        {sending ? 'Sending…' : 'Resend verification email'}
      </button>
    </div>
  )
}
