import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../api/axios';
import { extractErrorMessage } from '../utils/errorUtils';

export const fetchLivreurClients = createAsyncThunk('livreur/fetchClients', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/api/livreur/clients'); // Assuming standard backend endpoint structure
    return response.data;
  } catch (error: any) {
    return rejectWithValue(extractErrorMessage(error));
  }
});

export const fetchLivreurDashboardStats = createAsyncThunk('livreur/fetchDashboardStats', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/api/livreur/dashboard/stats');
    return response.data;
  } catch (error: any) {
    return rejectWithValue(extractErrorMessage(error));
  }
});

export const fetchReadyDeliveries = createAsyncThunk('livreur/fetchReadyDeliveries', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/api/livreur/commandes/ready-for-delivery');
    return response.data;
  } catch (error: any) {
    return rejectWithValue(extractErrorMessage(error));
  }
});

export const fetchReadyOrders = createAsyncThunk('livreur/fetchReadyOrders', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/api/livreur/commandes/prete');
    return response.data;
  } catch (error: any) {
    return rejectWithValue(extractErrorMessage(error));
  }
});

export const fetchCanceledDeliveries = createAsyncThunk('livreur/fetchCanceledDeliveries', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/livreur/commandes/canceled-deliveries');
    return response.data;
  } catch (error: any) {
    return rejectWithValue(extractErrorMessage(error));
  }
});

export const searchClient = createAsyncThunk('livreur/searchClient', async (phone: string, { rejectWithValue }) => {
  try {
    const response = await api.get(`/livreur/clients/search?phone=${phone}`);
    // Backend returns { found: boolean, client: ClientDto|null }
    if (response.data?.client) {
      return response.data.client;
    }
    return rejectWithValue('not_found');
  } catch (error: any) {
    return rejectWithValue(extractErrorMessage(error));
  }
});

export const registerClient = createAsyncThunk('livreur/registerClient', async (data: any, { rejectWithValue }) => {
  try {
    const response = await api.post('/livreur/clients', data);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(extractErrorMessage(error));
  }
});

export const fetchCarpetTypes = createAsyncThunk('livreur/fetchCarpetTypes', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/livreur/carpet-types/active');
    return response.data;
  } catch (error: any) {
    return rejectWithValue(extractErrorMessage(error));
  }
});

export const createOrder = createAsyncThunk('livreur/createOrder', async (data: any, { rejectWithValue }) => {
  try {
    const response = await api.post('/livreur/commandes', data);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(extractErrorMessage(error));
  }
});

export const fetchPaymentTypes = createAsyncThunk('livreur/fetchPaymentTypes', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/livreur/payment-types');
    return response.data;
  } catch (error: any) {
    return rejectWithValue(extractErrorMessage(error));
  }
});

export const confirmPayment = createAsyncThunk('livreur/confirmPayment', async ({ orderId, methodId }: { orderId: number, methodId: number }, { rejectWithValue }) => {
  try {
    const response = await api.post(`/livreur/commandes/${orderId}/payment`, { modePaiement: methodId });
    return response.data;
  } catch (error: any) {
    return rejectWithValue(extractErrorMessage(error));
  }
});

export const cancelDelivery = createAsyncThunk('livreur/cancelDelivery', async (orderId: number, { rejectWithValue }) => {
  try {
    const response = await api.put(`/api/livreur/commandes/${orderId}/cancel`);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(extractErrorMessage(error));
  }
});

