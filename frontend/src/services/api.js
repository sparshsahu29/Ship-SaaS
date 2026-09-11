import { appConfig } from '../config/appConfig'

/**
 * Normalized error thrown by every API call.
 *   err.status  - HTTP status (0 for network errors)
 *   err.code    - machine-readable code from the backend (or 'network_error')
 *   err.message - human-readable message safe to show in the UI
 *   err.details - optional field-level validation details
 */
export class ApiError extends Error {
  constructor({ status, code, message, details }) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }

  /** Map validation details to `{ field: message }` for forms. */
  get fieldErrors() {
    if (!Array.isArray(this.details)) return {}
    return Object.fromEntries(this.details.map((d) => [d.field, d.message]))
  }
}

const listeners = new Set()

/** Subscribe to 401 responses (used by AuthContext to drop the user). */
export function onUnauthorized(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

async function request(method, path, body) {
  let response
  try {
    response = await fetch(`${appConfig.apiUrl}${path}`, {
      method,
      credentials: 'include',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError({ status: 0, code: 'network_error', message: 'Unable to reach the server. Check your connection.' })
  }

  const data = response.status === 204 ? null : await response.json().catch(() => null)

  if (!response.ok) {
    const err = data?.error || {}
    // Only a missing/expired session should drop the user; other 401s
    // (wrong password on login/change-password) are ordinary form errors.
    if (response.status === 401 && err.code === 'not_authenticated') listeners.forEach((fn) => fn())
    throw new ApiError({
      status: response.status,
      code: err.code || 'http_error',
      message: err.message || 'Something went wrong. Please try again.',
      details: err.details,
    })
  }
  return data
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body ?? {}),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
}
