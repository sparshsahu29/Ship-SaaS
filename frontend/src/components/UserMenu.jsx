import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useLogout } from '../auth/useLogout'
import { Avatar } from './Avatar'
import { Dropdown, DropdownItem, DropdownSeparator } from './Dropdown'

/** Avatar button in the top bar. Opens a menu with Settings and Log out. */
export function UserMenu() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const logout = useLogout()
  if (!user) return null

  return (
    <Dropdown
      trigger={(props) => (
        <button
          {...props}
          className="flex items-center gap-2 rounded-full p-0.5 hover:bg-muted-background"
          aria-label="Open user menu"
        >
          <Avatar name={user.name} src={user.avatar_url} size="sm" />
        </button>
      )}
    >
      <div className="px-3 py-2">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs text-muted">{user.email}</p>
      </div>
      <DropdownSeparator />
      <DropdownItem onSelect={() => navigate('/app/settings')}>
        <span className="flex items-center gap-2">
          <SettingsIcon />
          Settings
        </span>
      </DropdownItem>
      <DropdownItem onSelect={logout} destructive>
        <span className="flex items-center gap-2">
          <LogoutIcon />
          Log out
        </span>
      </DropdownItem>
    </Dropdown>
  )
}

function SettingsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}
