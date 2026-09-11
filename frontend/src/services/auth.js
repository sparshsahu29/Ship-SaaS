import { api } from './api'
import { appConfig } from '../config/appConfig'

export const authService = {
  me: () => api.get('/api/auth/me'),
  signup: ({ name, email, password }) => api.post('/api/auth/signup', { name, email, password }),
  login: ({ email, password }) => api.post('/api/auth/login', { email, password }),
  logout: () => api.post('/api/auth/logout'),
  forgotPassword: (email) => api.post('/api/auth/forgot-password', { email }),
  resetPassword: ({ token, password }) => api.post('/api/auth/reset-password', { token, password }),
  changePassword: ({ currentPassword, newPassword }) =>
    api.post('/api/auth/change-password', { current_password: currentPassword, new_password: newPassword }),
  /** Full-page redirect: the backend handles the OAuth dance and redirects back. */
  googleLoginUrl: () => `${appConfig.apiUrl}/api/auth/google`,
}
