import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchLivreurDashboardStats, fetchLivreurClients, fetchReadyDeliveries, fetchReadyOrders, fetchCanceledDeliveries, searchClient, fetchCarpetTypes, registerClient, createOrder, fetchPaymentTypes, confirmPayment, cancelDelivery } from './livreurThunks';

interface LivreurState {
  dashboardStats: any;
  clients: any[];
  readyDeliveries: any[];
  readyOrders: any[];
  canceledDeliveries: any[];
  searchResult: any | null;
  pendingClient: any | null;
  carpetTypes: any[];
  paymentTypes: any[];
  loading: boolean;
  error: string | null;
}

const initialState: LivreurState = {
  dashboardStats: { readyOrdersCount: 0, pendingPickupCount: 0, cancelledCount: 0 },
  clients: [],
  readyDeliveries: [],
  readyOrders: [],
  canceledDeliveries: [],
  searchResult: null,
  pendingClient: null,
  carpetTypes: [],
  paymentTypes: [],
  loading: false,
  error: null,
};

const livreurSlice = createSlice({
  name: 'livreur',
  initialState,
  reducers: {
    clearLivreurError: (state) => { state.error = null; },
    setPendingClient: (state, action) => { state.pendingClient = action.payload; },
    clearSearchResult: (state) => { state.searchResult = null; },
  },
  extraReducers: (builder) => {
    const handlePending = (state: LivreurState) => { state.loading = true; state.error = null; };
    const handleRejected = (state: LivreurState, action: any) => { 
      state.loading = false; 
      const payload = action.payload;
      if (typeof payload === 'string') {
        state.error = payload;
      } else if (payload && typeof payload === 'object' && payload.message) {
        state.error = payload.message;
      } else {
        state.error = 'Une erreur est survenue';
      }
    };

    builder
      .addCase(fetchLivreurDashboardStats.pending, handlePending)
      .addCase(fetchLivreurDashboardStats.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboardStats = action.payload || initialState.dashboardStats;
      })
      .addCase(fetchLivreurDashboardStats.rejected, handleRejected)

      .addCase(fetchLivreurClients.pending, handlePending)
      .addCase(fetchLivreurClients.fulfilled, (state, action) => {
        state.loading = false;
        state.clients = action.payload || [];
      })
      .addCase(fetchLivreurClients.rejected, handleRejected)

      .addCase(fetchReadyDeliveries.pending, handlePending)
      .addCase(fetchReadyDeliveries.fulfilled, (state, action) => {
        state.loading = false;
        state.readyDeliveries = action.payload || [];
      })
      .addCase(fetchReadyDeliveries.rejected, handleRejected)

      .addCase(fetchReadyOrders.pending, handlePending)
      .addCase(fetchReadyOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.readyOrders = action.payload || [];
      })
      .addCase(fetchReadyOrders.rejected, handleRejected)

      .addCase(fetchCanceledDeliveries.pending, handlePending)
      .addCase(fetchCanceledDeliveries.fulfilled, (state, action) => {
        state.loading = false;
        state.canceledDeliveries = action.payload || [];
      })
      .addCase(fetchCanceledDeliveries.rejected, handleRejected)

      .addCase(searchClient.pending, handlePending)
      .addCase(searchClient.fulfilled, (state, action) => {
        state.loading = false;
        state.searchResult = action.payload;
      })
      .addCase(searchClient.rejected, (state, action: any) => {
        state.loading = false;
        state.searchResult = null; // Clear if not found
        // don't set error so we don't break the UI, just show not found
      })

      .addCase(fetchCarpetTypes.pending, handlePending)
      .addCase(fetchCarpetTypes.fulfilled, (state, action) => {
        state.loading = false;
        state.carpetTypes = action.payload || [];
      })
      .addCase(fetchCarpetTypes.rejected, handleRejected)
      
      .addCase(registerClient.pending, handlePending)
      .addCase(registerClient.fulfilled, (state, action) => {
        state.loading = false;
        state.pendingClient = action.payload;
      })
      .addCase(registerClient.rejected, handleRejected)

      .addCase(createOrder.pending, handlePending)
      .addCase(createOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.pendingClient = null;
      })
      .addCase(createOrder.rejected, handleRejected)

      .addCase(fetchPaymentTypes.pending, handlePending)
      .addCase(fetchPaymentTypes.fulfilled, (state, action) => {
        state.loading = false;
        state.paymentTypes = action.payload || [];
      })
      .addCase(fetchPaymentTypes.rejected, handleRejected)

      .addCase(confirmPayment.pending, handlePending)
      .addCase(confirmPayment.fulfilled, (state, action) => {
        state.loading = false;
        // Remove the paid order from readyDeliveries
        state.readyDeliveries = state.readyDeliveries.filter((o: any) => o.id !== action.payload?.id);
      })
      .addCase(confirmPayment.rejected, handleRejected)

      .addCase(cancelDelivery.pending, handlePending)
      .addCase(cancelDelivery.fulfilled, (state, action) => {
        state.loading = false;
        state.readyDeliveries = state.readyDeliveries.filter((o: any) => o.id !== action.payload?.id);
      })
      .addCase(cancelDelivery.rejected, handleRejected);
  },
});

export const { clearLivreurError, setPendingClient, clearSearchResult } = livreurSlice.actions;
export default livreurSlice.reducer;
