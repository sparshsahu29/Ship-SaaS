import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// jsdom does not implement <dialog>; provide minimal stubs.
HTMLDialogElement.prototype.showModal ??= function () {
  this.setAttribute('open', '')
}
HTMLDialogElement.prototype.close ??= function () {
  this.removeAttribute('open')
  this.dispatchEvent(new Event('close'))
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
