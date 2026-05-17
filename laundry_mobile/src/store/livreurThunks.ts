import { createAsyncThunk } from '@reduxjs/toolkit';
import statisticsApi from '../services/statistics/statisticsApi';
import ordersApi from '../services/orders/ordersApi';
import catalogApi from '../services/api/catalogApi';
import { handleApiError } from '../services/shared/errorHandler';

// ── DASHBOARD ─────────────────────────────────────────────────────────────────

/**
 * Returns stats for the current livreur.
 */
export const fetchLivreurDashboardStats = createAsyncThunk(
  'livreur/fetchDashboardStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await statisticsApi.getLivreurDashboardStats();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// ── MISSIONS ──────────────────────────────────────────────────────────────────

/**
 * Returns orders with status = READY_FOR_DELIVERY assigned to current livreur.
 */
export const fetchReadyDeliveries = createAsyncThunk(
  'livreur/fetchReadyDeliveries',
  async (_, { rejectWithValue }) => {
    try {
      const response = await ordersApi.getReadyDeliveries();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

/**
 * Returns orders with status = PENDING_PICKUP assigned to current livreur.
 */
export const fetchPendingPickups = createAsyncThunk(
  'livreur/fetchPendingPickups',
  async (_, { rejectWithValue }) => {
    try {
      const response = await ordersApi.getPendingPickups();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

/**
 * Returns cancelled orders for this livreur.
 */
export const fetchCanceledDeliveries = createAsyncThunk(
  'livreur/fetchCanceledDeliveries',
  async (_, { rejectWithValue }) => {
    try {
      const response = await ordersApi.getCanceledDeliveries();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// ── ORDER ACTIONS ─────────────────────────────────────────────────────────────

/**
 * Fetches all carpet types (products) for order creation.
 */
export const fetchCarpetTypes = createAsyncThunk(
  'livreur/fetchCarpetTypes',
  async (_, { rejectWithValue }) => {
    try {
      const response = await catalogApi.getCategories();
      // Flatten products from categories
      const categories = response.data.data || response.data;
      const allProducts = categories.flatMap((c: any) => c.products || []);
      return allProducts;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

/**
 * Creates a new order.
 */
export const createOrder = createAsyncThunk(
  'livreur/createOrder',
  async (orderData: any, { rejectWithValue }) => {
    try {
      const response = await ordersApi.createOrder(orderData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

/**
 * Cancels a delivery (sets status to CANCELLED).
 */
export const cancelDelivery = createAsyncThunk(
  'livreur/cancelDelivery',
  async (orderId: number, { rejectWithValue }) => {
    try {
      const response = await ordersApi.cancelDelivery(orderId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

/**
 * Returns an order to the workshop.
 */
export const returnToWorkplace = createAsyncThunk(
  'livreur/returnToWorkplace',
  async (orderId: number, { rejectWithValue }) => {
    try {
      const response = await ordersApi.returnToWorkplace(orderId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// ── PAYMENT ───────────────────────────────────────────────────────────────────

/**
 * Fetches available payment methods.
 */
export const fetchPaymentTypes = createAsyncThunk(
  'livreur/fetchPaymentTypes',
  async (_, { rejectWithValue }) => {
    try {
      const response = await ordersApi.getPaymentTypes();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error));
    }
  }
);


