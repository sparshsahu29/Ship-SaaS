import { forwardRef, useId } from 'react'
import { cn } from '../lib/cn'
import { FormError } from './FormError'

export const Input = forwardRef(function Input(
  { label, error, hint, className, id: idProp, type = 'text', trailing, ...props },
  ref,
) {
  const autoId = useId()
  const id = idProp || autoId
  const errorId = `${id}-error`
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={type}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'h-10 w-full rounded-md border bg-card px-3 text-sm placeholder:text-muted disabled:opacity-50',
            error ? 'border-destructive' : 'border-border',
            trailing && 'pr-10',
            className,
          )}
          {...props}
        />
        {trailing && <div className="absolute inset-y-0 right-0 flex items-center pr-2">{trailing}</div>}
      </div>
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      <FormError id={errorId} message={error} />
    </div>
  )
})
