import { ProfileSection } from './ProfileSection'
import { SecuritySection } from './SecuritySection'
import { AccountSection } from './AccountSection'

export function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
        <p className="mt-1 text-sm text-muted">Manage your profile, security and account.</p>
      </div>
      <ProfileSection />
      <SecuritySection />
      <AccountSection />
    </div>
  )
}
