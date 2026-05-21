import { createAsyncThunk } from '@reduxjs/toolkit';
import statisticsApi from '../services/statistics/statisticsApi';
import ordersApi from '../services/orders/ordersApi';
import clientsApi from '../services/clients/clientsApi';
import usersApi from '../services/users/usersApi';
import catalogApi from '../services/catalog/catalogApi';
import { handleApiError } from '../services/shared/errorHandler';
import api from '../services/shared/api';

// --- DASHBOARD & STATS ---
export const fetchTodayStats = createAsyncThunk('admin/fetchTodayStats', async (_, { rejectWithValue }) => {
  try {
    const response = await statisticsApi.getTodayStats();
    return response.data;
  } catch (error: any) {
    return rejectWithValue(handleApiError(error));
  }
});

// --- COMMANDES (ORDERS) ---
export const fetchRecentOrders = createAsyncThunk('admin/fetchRecentOrders', async (_, { rejectWithValue }) => {
  try {
    const response = await ordersApi.getRecentOrders(10);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(handleApiError(error));
  }
});

export const fetchAllOrders = createAsyncThunk('admin/fetchAllOrders', async (params: any = {}, { rejectWithValue }) => {
  try {
    const response = await ordersApi.getOrders(params);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(handleApiError(error));
  }
});

export const fetchCommandeById = createAsyncThunk('admin/fetchCommandeById', async (id: number | string, { rejectWithValue }) => {
  try {
    const response = await ordersApi.getOrder(id);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(handleApiError(error));
  }
});

export const updateCommande = createAsyncThunk('admin/updateOrder', async ({ id, data }: { id: number | string, data: any }, { rejectWithValue }) => {
  try {
    const response = await ordersApi.updateOrder(id, data);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(handleApiError(error));
  }
});

export const updateCommandeStatus = createAsyncThunk('admin/updateStatus', async ({ id, status, paymentData }: { id: number | string, status: string, paymentData?: any }, { rejectWithValue }) => {
  try { 
    const response = await ordersApi.updateStatus(id, { status, ...paymentData }); 
    return response.data; 
  }
  catch (error: any) { return rejectWithValue(handleApiError(error)); }
});

export const deleteCommande = createAsyncThunk('admin/deleteCommande', async (id: number | string, { rejectWithValue }) => {
  try {
    await ordersApi.deleteOrder(id);
    return id;
  } catch (error: any) {
    return rejectWithValue(handleApiError(error));
  }
});

// --- CLIENTS ---
export const fetchAllClients = createAsyncThunk('admin/fetchAllClients', async (params: any = {}, { rejectWithValue }) => {
  try {
    const response = await clientsApi.getClients(params);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(handleApiError(error));
  }
});

export const fetchClientById = createAsyncThunk('admin/fetchClientById', async (id: number | string, { rejectWithValue }) => {
  try {
    const response = await clientsApi.getClient(id);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(handleApiError(error));
  }
});

export const fetchClientCommandes = createAsyncThunk('admin/fetchClientCommandes', async (clientId: number | string, { rejectWithValue }) => {
  try {
    const response = await clientsApi.getClientCommandes(clientId);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(handleApiError(error));
  }
});

// --- USERS ---
export const fetchActiveUsers = createAsyncThunk('admin/fetchActiveUsers', async (_, { rejectWithValue }) => {
  try {
    const response = await usersApi.getActiveUsers();
    return response.data;
  } catch (error: any) {
    return rejectWithValue(handleApiError(error));
  }
});

export const fetchInactiveUsers = createAsyncThunk('admin/fetchInactiveUsers', async (_, { rejectWithValue }) => {
  try {
    const response = await usersApi.getInactiveUsers();
    return response.data;
  } catch (error: any) {
    return rejectWithValue(handleApiError(error));
  }
});

export const createNewUser = createAsyncThunk('admin/createUser', async (data: any, { rejectWithValue }) => {
  try {
    const response = await usersApi.createUser(data);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(handleApiError(error));
  }
});

export const updateExistingUser = createAsyncThunk('admin/updateUser', async ({ id, data }: { id: number | string, data: any }, { rejectWithValue }) => {
  try {
    const response = await usersApi.updateUser(id, data);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(handleApiError(error));
  }
});

export const deactivateUser = createAsyncThunk('admin/deactivateUser', async (id: number | string, { rejectWithValue }) => {
  try {
    const response = await usersApi.deactivateUser(id);
    return { id, data: response.data };
  } catch (error: any) {
    return rejectWithValue(handleApiError(error));
  }
});

export const reactivateUser = createAsyncThunk('admin/reactivateUser', async (id: number | string, { rejectWithValue }) => {
  try {
    const response = await usersApi.activateUser(id);
    return { id, data: response.data };
  } catch (error: any) {
    return rejectWithValue(handleApiError(error));
  }
});

export const removeUser = createAsyncThunk('admin/removeUser', async (id: number | string, { rejectWithValue }) => {
  try {
    await usersApi.deleteUser(id);
    return id;
  } catch (error: any) {
    return rejectWithValue(handleApiError(error));
  }
});

// --- CATALOG (NEW) ---
export const fetchCategories = createAsyncThunk('admin/fetchCategories', async (_, { rejectWithValue }) => {
  try {
    const response = await catalogApi.getCategories();
    return response.data;
  } catch (error: any) {
    return rejectWithValue(handleApiError(error));
  }
});

export const toggleCategory = createAsyncThunk('admin/toggleCategory', async (id: number | string, { rejectWithValue }) => {
  try {
    const response = await catalogApi.toggleCategory(id);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(handleApiError(error));
  }
});

// --- LEGACY CARPET TYPES (TAPIS) ---
export const fetchAdminCarpetTypes = createAsyncThunk('admin/fetchAdminCarpetTypes', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/admin/carpet-types');
    return response.data;
  } catch (error: any) {
    return rejectWithValue(handleApiError(error));
  }
});

export const createAdminCarpetType = createAsyncThunk('admin/createCarpetType', async (data: any, { rejectWithValue }) => {
  try {
    const response = await api.post('/admin/carpet-types', data);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(handleApiError(error));
  }
});

export const updateAdminCarpetType = createAsyncThunk('admin/updateCarpetType', async ({ id, data }: { id: number | string, data: any }, { rejectWithValue }) => {
  try {
    const response = await api.put(`/admin/carpet-types/${id}`, data);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(handleApiError(error));
  }
});

export const deleteAdminCarpetType = createAsyncThunk('admin/deleteCarpetType', async (id: number | string, { rejectWithValue }) => {
  try {
    await api.delete(`/admin/carpet-types/${id}`);
    return id;
  } catch (error: any) {
    return rejectWithValue(handleApiError(error));
  }
});

export const adminChangePassword = createAsyncThunk('admin/changePassword', async ({ id, password }: { id: number | string, password: any }, { rejectWithValue }) => {
  try {
    const response = await usersApi.resetPassword(id, password.password);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(handleApiError(error));
  }
});
