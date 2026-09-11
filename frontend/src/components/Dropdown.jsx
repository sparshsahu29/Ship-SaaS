import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '../lib/cn'

/**
 * Minimal accessible dropdown menu.
 *   <Dropdown trigger={(props) => <button {...props}>Open</button>}>
 *     <DropdownItem onSelect={...}>Item</DropdownItem>
 *   </Dropdown>
 */
export function Dropdown({ trigger, children, align = 'right' }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const menuRef = useRef(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onClick = (e) => !rootRef.current?.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    menuRef.current?.querySelector('[role="menuitem"]')?.focus()
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const onMenuKeyDown = (e) => {
    const items = [...(menuRef.current?.querySelectorAll('[role="menuitem"]') ?? [])]
    const i = items.indexOf(document.activeElement)
    if (e.key === 'ArrowDown') items[(i + 1) % items.length]?.focus()
    if (e.key === 'ArrowUp') items[(i - 1 + items.length) % items.length]?.focus()
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') e.preventDefault()
  }

  return (
    <div ref={rootRef} className="relative">
      {trigger({
        onClick: () => setOpen((o) => !o),
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        'aria-controls': menuId,
      })}
      {open && (
        <div
          id={menuId}
          ref={menuRef}
          role="menu"
          onKeyDown={onMenuKeyDown}
          onClick={() => setOpen(false)}
          className={cn(
            'absolute z-40 mt-2 min-w-[12rem] overflow-hidden rounded-md border border-border bg-card py-1 shadow-lg',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}

export function DropdownItem({ onSelect, children, destructive = false, ...props }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className={cn(
        'block w-full px-3 py-2 text-left text-sm hover:bg-muted-background focus:bg-muted-background focus:outline-none',
        destructive && 'text-destructive',
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function DropdownSeparator() {
  return <div role="separator" className="my-1 border-t border-border" />
}
