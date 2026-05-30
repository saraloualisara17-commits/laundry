
import { api } from "../../api/axios";

export const createUser = async (data) => {
    return await api.post('/admin/create-user', data);
}

export const updateUser = async (id, data) => {
    return await api.put(`/admin/update-user/${id}`, data);
}

export const getUser = async (id) => {
    return await api.get(`/admin/user/${id}`);
}

export const getActiveUsers = async () => {
    return await api.get('/admin/active-users');
}

export const getInactiveUsers = async () => {
    return await api.get('/admin/inactive-users');
}

export const inactivateUser = async (id) => {
    return await api.patch(`/admin/inactive-user/${id}`);
}

export const activateUser = async (id) => {
    return await api.patch(`/admin/active-user/${id}`);
}

export const deleteUser = async (id) => {
    return await api.delete(`/admin/delete-user/${id}`);
}

// ========== COMMANDES ENDPOINTS ==========

export const getAllCommandes = async (params = {}) => {
    return await api.get('/admin/commandes', { params });
}

export const exportCommandesCsv = async () => {
    return await api.get('/admin/commandes/export-csv', { responseType: 'blob' });
}

export const getCommandeById = async (id) => {
    return await api.get(`/admin/commandes/${id}`);
}

// ========== CLIENTS ENDPOINTS ==========

export const getAllClients = async (params = {}) => {
    return await api.get('/admin/clients', { params });
}

export const getClientStatistics = async () => {
    return await api.get('/admin/clients/statistics');
}

export const getClientCommandes = async (clientId) => {
    return await api.get(`/admin/client/${clientId}`);
}

// ========== CARPET TYPES ENDPOINTS ==========

export const adminGetCarpetTypes = async () => {
    return await api.get('/admin/carpet-types');
}

export const adminCreateCarpetType = async (data) => {
    return await api.post('/admin/carpet-types', data);
}

export const adminUpdateCarpetType = async (id, data) => {
    return await api.put(`/admin/carpet-types/${id}`, data);
}

export const adminDeleteCarpetType = async (id) => {
    return await api.delete(`/admin/carpet-types/${id}`);
}

export const adminChangePassword = async (id, password) => {
    return await api.put(`/admin/change-user-password/${id}`, password)
}

// ========== UNPAID ENDPOINTS ==========

export const getUnpaidOverview = async () => {
    return await api.get('/api/admin/unpaid/overview')
}

export const getUnpaidClients = async () => {
    return await api.get('/api/admin/unpaid/clients')
}

export const getUnpaidClientDetail = async (clientId) => {
    return await api.get(`/api/admin/unpaid/clients/${clientId}`)
}

// ========== SETTINGS ENDPOINTS ==========

export const getSettings = async () => {
    return await api.get('/api/admin/settings')
}

export const updateSettings = async (data) => {
    return await api.put('/api/admin/settings', data)
}

// ========== ORDER ACTIONS ==========

export const updateOrderStatus = async (id, data) => {
    return await api.patch(`/api/commandes/${id}/status`, data)
}

export const deleteOrder = async (id) => {
    return await api.delete(`/api/commandes/${id}`)
}

export const addPayment = async (id, data) => {
    return await api.post(`/api/commandes/${id}/payments`, data)
}

export const assignDeliveryDriver = async (id, data) => {
    return await api.patch(`/api/admin/commandes/${id}/delivery-driver`, data)
}

export const getOrderHistory = async (id) => {
    return await api.get(`/api/commandes/${id}/history`)
}

export const getWhatsappMessage = async (id) => {
    return await api.get(`/api/commandes/${id}/receipt/order/whatsapp`)
}

export const uploadFile = async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return await api.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
}
