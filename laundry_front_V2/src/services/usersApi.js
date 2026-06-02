import { api } from '../api/axios'

export const usersApi = {
  getActive: () => api.get('/admin/active-users').then(r => r.data),
  getInactive: () => api.get('/admin/inactive-users').then(r => r.data),
  create: (data) => api.post('/admin/create-user', data).then(r => r.data),
  update: (id, data) => api.put(`/admin/update-user/${id}`, data).then(r => r.data),
  activate: (id) => api.patch(`/admin/active-user/${id}`).then(r => r.data),
  deactivate: (id) => api.patch(`/admin/inactive-user/${id}`).then(r => r.data),
  changePassword: (id, data) => api.put(`/admin/change-user-password/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/admin/delete-user/${id}`).then(r => r.data),
}
