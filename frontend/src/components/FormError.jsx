import { cn } from '../lib/cn'

/** Inline error text. Renders nothing when there is no message. */
export function FormError({ message, id, className }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className={cn('text-sm text-destructive', className)}>
      {message}
    </p>
  )
}

/** Boxed error for form-level/API errors. */
export function FormErrorBanner({ message }) {
  if (!message) return null
  return (
    <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      {message}
    </div>
  )
}
