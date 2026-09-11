import { api } from './api'

export const usersService = {
  updateMe: (data) => api.patch('/api/users/me', data),
  deleteMe: () => api.delete('/api/users/me'),
}
