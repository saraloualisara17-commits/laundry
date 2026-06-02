import { api } from '../api/axios'

export const settingsApi = {
  get: () => api.get('/api/public/settings').then(r => r.data),
  update: (data) => api.put('/api/admin/settings', data).then(r => r.data),
}
