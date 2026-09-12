import { Link } from 'react-router-dom'
import { cn } from '../lib/cn'
import { LoadingSpinner } from './LoadingSpinner'

const variants = {
  primary: 'bg-primary text-primary-foreground hover:opacity-90',
  secondary: 'bg-card text-foreground border border-border hover:bg-muted-background',
  ghost: 'text-foreground hover:bg-muted-background',
  destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
}

const sizes = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-base',
}

/** Renders a <button>, or a router <Link> when `to` is given. */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  type = 'button',
  to,
  ...props
}) {
  const classes = cn(
    'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    fullWidth && 'w-full',
    className,
  )

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {children}
      </Link>
    )
  }

  return (
    <button type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={classes} {...props}>
      {loading && <LoadingSpinner size="sm" />}
      {children}
    </button>
  )
}
