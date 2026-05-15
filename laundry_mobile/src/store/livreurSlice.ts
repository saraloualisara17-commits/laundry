import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchLivreurDashboardStats, fetchReadyDeliveries, fetchPendingPickups, fetchCanceledDeliveries, fetchPaymentTypes, cancelDelivery, returnToWorkplace } from './livreurThunks';

interface LivreurState {
  dashboardStats: any;
  readyDeliveries: any[];
  readyOrders: any[];
  canceledDeliveries: any[];
  paymentTypes: any[];
  loading: boolean;
  error: string | null;
}

const initialState: LivreurState = {
  dashboardStats: { readyOrdersCount: 0, pendingPickupCount: 0, cancelledCount: 0 },
  readyDeliveries: [],
  readyOrders: [],
  canceledDeliveries: [],
  paymentTypes: [],
  loading: false,
  error: null,
};

const livreurSlice = createSlice({
  name: 'livreur',
  initialState,
  reducers: {
    clearLivreurError: (state) => { state.error = null; },
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

      .addCase(fetchReadyDeliveries.pending, handlePending)
      .addCase(fetchReadyDeliveries.fulfilled, (state, action) => {
        state.loading = false;
        state.readyDeliveries = action.payload || [];
      })
      .addCase(fetchReadyDeliveries.rejected, handleRejected)

      .addCase(fetchPendingPickups.pending, handlePending)
      .addCase(fetchPendingPickups.fulfilled, (state, action) => {
        state.loading = false;
        state.readyOrders = action.payload || [];
      })
      .addCase(fetchPendingPickups.rejected, handleRejected)

      .addCase(fetchCanceledDeliveries.pending, handlePending)
      .addCase(fetchCanceledDeliveries.fulfilled, (state, action) => {
        state.loading = false;
        state.canceledDeliveries = action.payload || [];
      })
      .addCase(fetchCanceledDeliveries.rejected, handleRejected)

      .addCase(fetchPaymentTypes.pending, handlePending)
      .addCase(fetchPaymentTypes.fulfilled, (state, action) => {
        state.loading = false;
        state.paymentTypes = action.payload || [];
      })
      .addCase(fetchPaymentTypes.rejected, handleRejected)

      .addCase(cancelDelivery.pending, handlePending)
      .addCase(cancelDelivery.fulfilled, (state, action) => {
        state.loading = false;
        state.readyDeliveries = state.readyDeliveries.filter((o: any) => o.id !== action.payload?.id);
      })
      .addCase(cancelDelivery.rejected, handleRejected)

      .addCase(returnToWorkplace.pending, handlePending)
      .addCase(returnToWorkplace.fulfilled, (state, action) => {
        state.loading = false;
        // Logic to remove from list if needed, depending on current screen
      })
      .addCase(returnToWorkplace.rejected, handleRejected);
  },
});

export const { clearLivreurError } = livreurSlice.actions;
export default livreurSlice.reducer;
