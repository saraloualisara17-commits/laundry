import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../api/axios';
import { extractErrorMessage } from '../utils/errorUtils';

// --- DASHBOARD & STATS ---
export const fetchTodayStats = createAsyncThunk('admin/fetchTodayStats', async (_, { rejectWithValue }) => {
  try { const response = await api.get('/admin/statistics/today'); return response.data; }
  catch (error: any) { return rejectWithValue(extractErrorMessage(error)); }
});

// --- COMMANDES (ORDERS) ---
export const fetchRecentOrders = createAsyncThunk('admin/fetchRecentOrders', async (_, { rejectWithValue }) => {
  try { const response = await api.get('/admin/commandes', { params: { limit: 10 } }); return response.data; }
  catch (error: any) { return rejectWithValue(extractErrorMessage(error)); }
});

export const fetchAllOrders = createAsyncThunk('admin/fetchAllOrders', async (params: any = {}, { rejectWithValue }) => {
  try { const response = await api.get('/admin/commandes', { params }); return response.data; }
  catch (error: any) { return rejectWithValue(extractErrorMessage(error)); }
});

export const fetchCommandeById = createAsyncThunk('admin/fetchCommandeById', async (id: number | string, { rejectWithValue }) => {
  try { const response = await api.get(`/admin/commandes/${id}`); return response.data; }
  catch (error: any) { return rejectWithValue(extractErrorMessage(error)); }
});

export const updateCommande = createAsyncThunk('admin/updateCommande', async ({ id, data }: { id: number | string, data: any }, { rejectWithValue }) => {
  try { const response = await api.put(`/admin/commandes/${id}`, data); return response.data; }
  catch (error: any) { return rejectWithValue(extractErrorMessage(error)); }
});

export const updateCommandeStatus = createAsyncThunk('admin/updateStatus', async ({ id, newStatus }: { id: number | string, newStatus: string }, { rejectWithValue }) => {
  try { const response = await api.patch(`/admin/commandes/${id}/status`, { newStatus }); return response.data; }
  catch (error: any) { return rejectWithValue(extractErrorMessage(error)); }
});

export const deleteCommande = createAsyncThunk('admin/deleteCommande', async (id: number | string, { rejectWithValue }) => {
  try { await api.delete(`/admin/commandes/${id}`); return id; }
  catch (error: any) { return rejectWithValue(extractErrorMessage(error)); }
});

// --- CLIENTS ---
export const fetchAllClients = createAsyncThunk('admin/fetchAllClients', async (params: any = {}, { rejectWithValue }) => {
  try { const response = await api.get('/admin/clients', { params }); return response.data; }
  catch (error: any) { return rejectWithValue(extractErrorMessage(error)); }
});

export const fetchClientById = createAsyncThunk('admin/fetchClientById', async (id: number | string, { rejectWithValue }) => {
  try { const response = await api.get(`/admin/clients/${id}`); return response.data; }
  catch (error: any) { return rejectWithValue(extractErrorMessage(error)); }
});

export const fetchClientCommandes = createAsyncThunk('admin/fetchClientCommandes', async (clientId: number | string, { rejectWithValue }) => {
  try { const response = await api.get(`/admin/client/${clientId}`); return response.data; }
  catch (error: any) { return rejectWithValue(extractErrorMessage(error)); }
});

// --- USERS ---
export const fetchActiveUsers = createAsyncThunk('admin/fetchActiveUsers', async (_, { rejectWithValue }) => {
  try { const response = await api.get('/admin/active-users'); return response.data; }
  catch (error: any) { return rejectWithValue(extractErrorMessage(error)); }
});

export const fetchInactiveUsers = createAsyncThunk('admin/fetchInactiveUsers', async (_, { rejectWithValue }) => {
  try { const response = await api.get('/admin/inactive-users'); return response.data; }
  catch (error: any) { return rejectWithValue(extractErrorMessage(error)); }
});

export const createNewUser = createAsyncThunk('admin/createUser', async (data: any, { rejectWithValue }) => {
  try { const response = await api.post('/admin/create-user', data); return response.data; }
  catch (error: any) { return rejectWithValue(extractErrorMessage(error)); }
});

export const updateExistingUser = createAsyncThunk('admin/updateUser', async ({ id, data }: { id: number | string, data: any }, { rejectWithValue }) => {
  try { const response = await api.put(`/admin/update-user/${id}`, data); return response.data; }
  catch (error: any) { return rejectWithValue(extractErrorMessage(error)); }
});

export const deactivateUser = createAsyncThunk('admin/deactivateUser', async (id: number | string, { rejectWithValue }) => {
  try { const response = await api.patch(`/admin/inactive-user/${id}`); return { id, data: response.data }; }
  catch (error: any) { return rejectWithValue(extractErrorMessage(error)); }
});

export const reactivateUser = createAsyncThunk('admin/reactivateUser', async (id: number | string, { rejectWithValue }) => {
  try { const response = await api.patch(`/admin/active-user/${id}`); return { id, data: response.data }; }
  catch (error: any) { return rejectWithValue(extractErrorMessage(error)); }
});

export const removeUser = createAsyncThunk('admin/removeUser', async (id: number | string, { rejectWithValue }) => {
  try { await api.delete(`/admin/delete-user/${id}`); return id; }
  catch (error: any) { return rejectWithValue(extractErrorMessage(error)); }
});

// --- CARPET TYPES (TAPIS) ---
export const fetchAdminCarpetTypes = createAsyncThunk('admin/fetchAdminCarpetTypes', async (_, { rejectWithValue }) => {
  try { const response = await api.get('/admin/carpet-types'); return response.data; }
  catch (error: any) { return rejectWithValue(extractErrorMessage(error)); }
});

export const createAdminCarpetType = createAsyncThunk('admin/createCarpetType', async (data: any, { rejectWithValue }) => {
  try { const response = await api.post('/admin/carpet-types', data); return response.data; }
  catch (error: any) { return rejectWithValue(extractErrorMessage(error)); }
});

export const updateAdminCarpetType = createAsyncThunk('admin/updateCarpetType', async ({ id, data }: { id: number | string, data: any }, { rejectWithValue }) => {
  try { const response = await api.put(`/admin/carpet-types/${id}`, data); return response.data; }
  catch (error: any) { return rejectWithValue(extractErrorMessage(error)); }
});

export const deleteAdminCarpetType = createAsyncThunk('admin/deleteCarpetType', async (id: number | string, { rejectWithValue }) => {
  try { await api.delete(`/admin/carpet-types/${id}`); return id; }
  catch (error: any) { return rejectWithValue(extractErrorMessage(error)); }
});

export const adminChangePassword = createAsyncThunk('admin/changePassword', async ({ id, password }: { id: number | string, password: any }, { rejectWithValue }) => {
  try { const response = await api.put(`/admin/change-user-password/${id}`, password); return response.data; }
  catch (error: any) { return rejectWithValue(extractErrorMessage(error)); }
});
