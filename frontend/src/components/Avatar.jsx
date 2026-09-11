import { useState } from 'react'
import { cn } from '../lib/cn'

const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-16 w-16 text-xl' }

export function Avatar({ name = '', src, size = 'md', className }) {
  const [failed, setFailed] = useState(false)
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted-background font-medium text-foreground',
        sizes[size],
        className,
      )}
      aria-hidden={src && !failed ? undefined : true}
    >
      {src && !failed ? (
        <img src={src} alt={name} referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        initials || '?'
      )}
    </span>
  )
}
