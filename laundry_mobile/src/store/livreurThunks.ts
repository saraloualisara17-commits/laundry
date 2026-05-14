import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../api/axios';
import { extractErrorMessage } from '../utils/errorUtils';

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT MAP (all filtered by current authenticated livreur's ID server-side)
//
// GET  /api/livreur/dashboard/stats
//   → LivreurDashboardStatsDTO { readyOrdersCount, pendingPickupCount, cancelledCount, missionsCount }
//   → Counts per status for THIS livreur only
//
// GET  /api/livreur/commandes/ready-for-delivery
//   → List<CommandeDTO> where status = READY_FOR_DELIVERY AND livreur = current user
//   → These are orders cleaned and waiting to be DELIVERED to the client
//   → USE FOR: "Livraisons" tab in missions.tsx
//
// GET  /api/livreur/commandes/ready
//   → List<CommandeDTO> where status = PICKED_UP AND livreur = current user
//   → These are orders already picked up (at workshop), being processed
//   → NOTE: This is NOT pickups waiting. It's orders in PICKED_UP status.
//
// GET  /api/livreur/commandes/canceled-deliveries
//   → List<CommandeDTO> where status = CANCELLED AND livreur = current user
//   → History of cancelled orders for this livreur
//
// GET  /api/livreur/commandes/ready-count
//   → { readyOrdersCount: number } — count of READY_FOR_DELIVERY for this livreur
//   → Redundant: dashboard/stats already returns this, not needed separately
//
// POST /api/livreur/commandes/{id}/payment (uses RecordPaymentRequest)
//   → Marks order as DELIVERED + sets full payment at once (legacy simple flow)
//   → Body: { modePaiement: ModePaiement }
//   → DIFFERENT from PATCH /api/commandes/{id}/status which is more flexible
//
// PUT  /api/livreur/commandes/{id}/cancel
//   → Sets order status to CANCELLED
//
// PATCH /api/livreur/commandes/{id}/return
//   → Sets status back to PICKED_UP (return to workshop)
//
// GET  /api/livreur/payment-types
//   → List<{ id, name }> of available ModePaiement values (CASH, CARD, etc.)
//
// REMOVED (livreur no longer creates clients or orders):
//   GET  /api/livreur/clients/search   — client search for order creation
//   GET  /api/livreur/my-client/pending — pending client before order creation
//   DELETE /api/livreur/clients/{id}   — delete pending client
//   POST /api/livreur/tapis/upload     — image upload during order creation
// ─────────────────────────────────────────────────────────────────────────────

// ── DASHBOARD ─────────────────────────────────────────────────────────────────

/**
 * Returns stats for the current livreur:
 * { readyOrdersCount, pendingPickupCount, cancelledCount, missionsCount }
 */
export const fetchLivreurDashboardStats = createAsyncThunk(
  'livreur/fetchDashboardStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/livreur/dashboard/stats');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

// ── MISSIONS ──────────────────────────────────────────────────────────────────

/**
 * Returns orders with status = READY_FOR_DELIVERY assigned to current livreur.
 * These are CLEANED orders ready to be delivered to the client.
 * → Shows in "Livraisons" tab
 */
export const fetchReadyDeliveries = createAsyncThunk(
  'livreur/fetchReadyDeliveries',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/livreur/commandes/ready-for-delivery');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

/**
 * Returns orders with status = PENDING_PICKUP assigned to current livreur.
 * These are orders WAITING AT THE CLIENT'S HOME to be collected (picked up).
 * → Shows in "Collectes" tab in missions.tsx
 */
export const fetchPendingPickups = createAsyncThunk(
  'livreur/fetchPendingPickups',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/livreur/commandes/pending-pickup');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

/**
 * Returns cancelled orders for this livreur (history/archive).
 */
export const fetchCanceledDeliveries = createAsyncThunk(
  'livreur/fetchCanceledDeliveries',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/livreur/commandes/canceled-deliveries');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

// ── ORDER ACTIONS ─────────────────────────────────────────────────────────────

/**
 * Cancels a delivery (sets status to CANCELLED).
 * PUT /api/livreur/commandes/{id}/cancel
 */
export const cancelDelivery = createAsyncThunk(
  'livreur/cancelDelivery',
  async (orderId: number, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/livreur/commandes/${orderId}/cancel`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

/**
 * Returns an order to the workshop (sets status back to PICKED_UP).
 * PATCH /api/livreur/commandes/{id}/return
 */
export const returnToWorkplace = createAsyncThunk(
  'livreur/returnToWorkplace',
  async (orderId: number, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/api/livreur/commandes/${orderId}/return`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

// ── PAYMENT ───────────────────────────────────────────────────────────────────

/**
 * Fetches available payment methods (CASH, CARD, etc.).
 * GET /api/livreur/payment-types
 */
export const fetchPaymentTypes = createAsyncThunk(
  'livreur/fetchPaymentTypes',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/livreur/payment-types');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

// ── REMOVED THUNKS (kept as stubs to avoid breaking imports) ─────────────────

/** @deprecated Livreur no longer creates clients */
export const fetchLivreurClients = createAsyncThunk('livreur/fetchClients', async () => []);

/** @deprecated Livreur no longer creates clients */
export const searchClient = createAsyncThunk('livreur/searchClient', async () => null);

/** @deprecated Livreur no longer creates clients */
export const registerClient = createAsyncThunk('livreur/registerClient', async () => null);

/** @deprecated Livreur no longer creates orders */
export const createOrder = createAsyncThunk('livreur/createOrder', async () => null);

/** @deprecated Use fetchPendingPickups instead */
export const fetchReadyOrders = fetchPendingPickups;

/** @deprecated Use fetchPendingPickups instead */
export const fetchPickedUpOrders = fetchPendingPickups;

/** @deprecated Use PATCH /api/commandes/{id}/status directly */
export const confirmPayment = createAsyncThunk('livreur/confirmPayment', async () => null);

/** @deprecated Not needed — dashboard/stats returns this */
export const fetchCarpetTypes = createAsyncThunk('livreur/fetchCarpetTypes', async () => []);
