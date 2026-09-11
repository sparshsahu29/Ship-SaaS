import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Avatar } from './Avatar'
import { Dropdown, DropdownItem, DropdownSeparator } from './Dropdown'

export function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
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
      <DropdownItem onSelect={() => navigate('/app/settings')}>Settings</DropdownItem>
      <DropdownSeparator />
      <DropdownItem onSelect={() => logout().then(() => navigate('/login'))} destructive>
        Log out
      </DropdownItem>
    </Dropdown>
  )
}
