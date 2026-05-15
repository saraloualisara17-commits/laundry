import { createAsyncThunk } from '@reduxjs/toolkit';
import ordersApi from '../../services/orders/ordersApi';
import { handleApiError } from '../../services/shared/errorHandler';
import { OrderFilters, UpdateStatusRequest } from '../../services/orders/ordersTypes';

// --- ADMIN / GENERAL ---

export const fetchAllOrders = createAsyncThunk(
  'orders/fetchAll',
  async (filters: OrderFilters = {}, { rejectWithValue }) => {
    try {
      const response = await ordersApi.getOrders(filters);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const fetchRecentOrders = createAsyncThunk(
  'orders/fetchRecent',
  async (limit: number = 10, { rejectWithValue }) => {
    try {
      const response = await ordersApi.getRecentOrders(limit);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const fetchOrderById = createAsyncThunk(
  'orders/fetchById',
  async (id: number | string, { rejectWithValue }) => {
    try {
      const response = await ordersApi.getOrder(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const updateOrderStatus = createAsyncThunk(
  'orders/updateStatus',
  async ({ id, data }: { id: number | string, data: UpdateStatusRequest }, { rejectWithValue }) => {
    try {
      const response = await ordersApi.updateStatus(id, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const deleteOrder = createAsyncThunk(
  'orders/delete',
  async (id: number | string, { rejectWithValue }) => {
    try {
      await ordersApi.deleteOrder(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// --- LIVREUR ---

export const fetchReadyDeliveries = createAsyncThunk(
  'orders/fetchReadyDeliveries',
  async (_, { rejectWithValue }) => {
    try {
      const response = await ordersApi.getReadyDeliveries();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const fetchPendingPickups = createAsyncThunk(
  'orders/fetchPendingPickups',
  async (_, { rejectWithValue }) => {
    try {
      const response = await ordersApi.getPendingPickups();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const cancelDelivery = createAsyncThunk(
  'orders/cancelDelivery',
  async (id: number | string, { rejectWithValue }) => {
    try {
      const response = await ordersApi.cancelDelivery(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const returnToWorkplace = createAsyncThunk(
  'orders/returnToWorkplace',
  async (id: number | string, { rejectWithValue }) => {
    try {
      const response = await ordersApi.returnToWorkplace(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error));
    }
  }
);
