import { useCallback, useState } from 'react'
import { ApiError } from '../services/api'

/**
 * Tiny form helper: tracks values, field errors, a form-level error and
 * submitting state. `validate(values)` returns `{ field: message }`.
 *
 *   const form = useForm({ initialValues, validate, onSubmit })
 *   <form onSubmit={form.handleSubmit}>
 *     <Input {...form.field('email')} />
 */
export function useForm({ initialValues, validate, onSubmit }) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const setValue = useCallback((name, value) => {
    setValues((v) => ({ ...v, [name]: value }))
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e))
  }, [])

  const handleSubmit = async (event) => {
    event?.preventDefault()
    setFormError(null)
    const validationErrors = validate ? validate(values) : {}
    if (Object.values(validationErrors).some(Boolean)) {
      setErrors(validationErrors)
      return
    }
    setSubmitting(true)
    try {
      await onSubmit(values)
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setErrors(err.fieldErrors)
        setFormError(Object.keys(err.fieldErrors).length ? null : err.message)
      } else {
        setFormError(err.message || 'Something went wrong.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const field = (name) => ({
    name,
    value: values[name] ?? '',
    error: errors[name],
    onChange: (e) => setValue(name, e.target.value),
  })

  return { values, errors, formError, submitting, setValue, setFormError, handleSubmit, field }
}

export const validators = {
  required: (v, label = 'This field') => (!v || !String(v).trim() ? `${label} is required.` : undefined),
  email: (v) => (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '') ? 'Enter a valid email address.' : undefined),
  password: (v) => (!v || v.length < 8 ? 'Password must be at least 8 characters.' : undefined),
  match: (a, b, label = 'Passwords') => (a !== b ? `${label} do not match.` : undefined),
}
