import { createSlice } from '@reduxjs/toolkit';
import { 
  fetchTodayStats, 
  fetchRecentOrders, 
  fetchAllOrders, 
  fetchCommandeById,
  updateCommande,
  updateCommandeStatus,
  deleteCommande,
  fetchAllClients, 
  fetchClientById,
  fetchClientCommandes,
  fetchActiveUsers, 
  fetchInactiveUsers, 
  createNewUser,
  updateExistingUser,
  deactivateUser,
  reactivateUser,
  removeUser,
  fetchAdminCarpetTypes,
  createAdminCarpetType,
  updateAdminCarpetType,
  deleteAdminCarpetType
} from './adminThunks';

interface AdminState {
  todayStats: any | null;
  recentOrders: any[];
  allOrders: any[];
  selectedCommande: any | null;
  clients: any[];
  selectedClient: any | null;
  clientCommandes: any[];
  activeUsers: any[];
  inactiveUsers: any[];
  carpetTypes: any[];
  loading: boolean;
  error: string | null;
  success: boolean;
}

const initialState: AdminState = {
  todayStats: null,
  recentOrders: [],
  allOrders: [],
  selectedCommande: null,
  clients: [],
  selectedClient: null,
  clientCommandes: [],
  activeUsers: [],
  inactiveUsers: [],
  carpetTypes: [],
  loading: false,
  error: null,
  success: false,
};

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null; },
    clearSuccess: (state) => { state.success = false; },
    clearSelectedCommande: (state) => { state.selectedCommande = null; },
    clearSelectedClient: (state) => { state.selectedClient = null; },
  },
  extraReducers: (builder) => {
    const handlePending = (state: any) => { state.loading = true; state.error = null; state.success = false; };
    const handleRejected = (state: any, action: any) => { 
      state.loading = false; 
      const payload = action.payload;
      if (typeof payload === 'string') {
        state.error = payload;
      } else if (payload && typeof payload === 'object' && payload.message) {
        state.error = payload.message;
      } else {
        state.error = 'Failed to perform action';
      }
    };

    // Dashboard & Orders
    builder.addCase(fetchTodayStats.pending, handlePending)
           .addCase(fetchTodayStats.fulfilled, (state, action) => { state.loading = false; state.todayStats = action.payload; })
           .addCase(fetchTodayStats.rejected, handleRejected);

    builder.addCase(fetchRecentOrders.pending, handlePending)
           .addCase(fetchRecentOrders.fulfilled, (state, action) => { state.loading = false; state.recentOrders = action.payload?.content || []; })
           .addCase(fetchRecentOrders.rejected, handleRejected);

    builder.addCase(fetchAllOrders.pending, handlePending)
           .addCase(fetchAllOrders.fulfilled, (state, action) => { state.loading = false; state.allOrders = action.payload?.content || action.payload || []; })
           .addCase(fetchAllOrders.rejected, handleRejected);

    builder.addCase(fetchCommandeById.pending, handlePending)
           .addCase(fetchCommandeById.fulfilled, (state, action) => { state.loading = false; state.selectedCommande = action.payload; })
           .addCase(fetchCommandeById.rejected, handleRejected);

    builder.addCase(updateCommande.pending, handlePending)
           .addCase(updateCommande.fulfilled, (state, action) => { 
             state.loading = false; 
             state.success = true; 
             state.selectedCommande = action.payload; 
             const indexAll = state.allOrders.findIndex((o: any) => o.id === action.payload.id);
             if (indexAll >= 0) state.allOrders[indexAll] = action.payload;
           })
           .addCase(updateCommande.rejected, handleRejected);

    builder.addCase(updateCommandeStatus.pending, handlePending)
           .addCase(updateCommandeStatus.fulfilled, (state, action) => { 
             state.loading = false; 
             state.selectedCommande = action.payload; 
             const indexAll = state.allOrders.findIndex((o: any) => o.id === action.payload.id);
             if (indexAll >= 0) state.allOrders[indexAll] = action.payload;
           })
           .addCase(updateCommandeStatus.rejected, handleRejected);

    builder.addCase(deleteCommande.pending, handlePending)
           .addCase(deleteCommande.fulfilled, (state, action) => { 
             state.loading = false; 
             state.success = true; 
             state.allOrders = state.allOrders.filter((o: any) => o.id !== action.payload);
             if (state.selectedCommande?.id === action.payload) state.selectedCommande = null;
           })
           .addCase(deleteCommande.rejected, handleRejected);

    // Clients
    builder.addCase(fetchAllClients.pending, handlePending)
           .addCase(fetchAllClients.fulfilled, (state, action) => { state.loading = false; state.clients = action.payload?.content || action.payload || []; })
           .addCase(fetchAllClients.rejected, handleRejected);

    builder.addCase(fetchClientById.pending, handlePending)
           .addCase(fetchClientById.fulfilled, (state, action) => { state.loading = false; state.selectedClient = action.payload; })
           .addCase(fetchClientById.rejected, handleRejected);

    builder.addCase(fetchClientCommandes.pending, handlePending)
           .addCase(fetchClientCommandes.fulfilled, (state, action) => { state.loading = false; state.clientCommandes = action.payload || []; })
           .addCase(fetchClientCommandes.rejected, handleRejected);

    // Users
    builder.addCase(fetchActiveUsers.pending, handlePending)
           .addCase(fetchActiveUsers.fulfilled, (state, action) => { state.loading = false; state.activeUsers = action.payload || []; })
           .addCase(fetchActiveUsers.rejected, handleRejected);

    builder.addCase(fetchInactiveUsers.pending, handlePending)
           .addCase(fetchInactiveUsers.fulfilled, (state, action) => { state.loading = false; state.inactiveUsers = action.payload || []; })
           .addCase(fetchInactiveUsers.rejected, handleRejected);

    builder.addCase(createNewUser.pending, handlePending)
           .addCase(createNewUser.fulfilled, (state, action) => { state.loading = false; state.success = true; state.activeUsers.push(action.payload); })
           .addCase(createNewUser.rejected, handleRejected);

    builder.addCase(updateExistingUser.pending, handlePending)
           .addCase(updateExistingUser.fulfilled, (state, action) => { 
             state.loading = false; state.success = true; 
             const user = action.payload;
             const activeIndex = state.activeUsers.findIndex((u: any) => u.id === user.id);
             if (activeIndex >= 0) state.activeUsers[activeIndex] = user;
             const inactiveIndex = state.inactiveUsers.findIndex((u: any) => u.id === user.id);
             if (inactiveIndex >= 0) state.inactiveUsers[inactiveIndex] = user;
           })
           .addCase(updateExistingUser.rejected, handleRejected);

    builder.addCase(deactivateUser.pending, handlePending)
           .addCase(deactivateUser.fulfilled, (state, action) => { 
             state.loading = false; state.success = true; 
             const user = state.activeUsers.find((u: any) => u.id === action.payload.id);
             if (user) {
               state.activeUsers = state.activeUsers.filter((u: any) => u.id !== action.payload.id);
               state.inactiveUsers.push({ ...user, active: false, isActive: false });
             }
           })
           .addCase(deactivateUser.rejected, handleRejected);

    builder.addCase(reactivateUser.pending, handlePending)
           .addCase(reactivateUser.fulfilled, (state, action) => { 
             state.loading = false; state.success = true; 
             const user = state.inactiveUsers.find((u: any) => u.id === action.payload.id);
             if (user) {
               state.inactiveUsers = state.inactiveUsers.filter((u: any) => u.id !== action.payload.id);
               state.activeUsers.push({ ...user, active: true, isActive: true });
             }
           })
           .addCase(reactivateUser.rejected, handleRejected);

    builder.addCase(removeUser.pending, handlePending)
           .addCase(removeUser.fulfilled, (state, action) => { 
             state.loading = false; state.success = true; 
             state.inactiveUsers = state.inactiveUsers.filter((u: any) => u.id !== action.payload);
             state.activeUsers = state.activeUsers.filter((u: any) => u.id !== action.payload);
           })
           .addCase(removeUser.rejected, handleRejected);

    // Carpet Types
    builder.addCase(fetchAdminCarpetTypes.pending, handlePending)
           .addCase(fetchAdminCarpetTypes.fulfilled, (state, action) => { state.loading = false; state.carpetTypes = action.payload || []; })
           .addCase(fetchAdminCarpetTypes.rejected, handleRejected);

    builder.addCase(createAdminCarpetType.pending, handlePending)
           .addCase(createAdminCarpetType.fulfilled, (state, action) => { state.loading = false; state.success = true; state.carpetTypes.push(action.payload); })
           .addCase(createAdminCarpetType.rejected, handleRejected);

    builder.addCase(updateAdminCarpetType.pending, handlePending)
           .addCase(updateAdminCarpetType.fulfilled, (state, action) => { 
             state.loading = false; state.success = true; 
             const index = state.carpetTypes.findIndex((c: any) => c.id === action.payload.id);
             if (index >= 0) state.carpetTypes[index] = action.payload;
           })
           .addCase(updateAdminCarpetType.rejected, handleRejected);

    builder.addCase(deleteAdminCarpetType.pending, handlePending)
           .addCase(deleteAdminCarpetType.fulfilled, (state, action) => { 
             state.loading = false; state.success = true; 
             state.carpetTypes = state.carpetTypes.filter((c: any) => c.id !== action.payload);
           })
           .addCase(deleteAdminCarpetType.rejected, handleRejected);
  },
});

export const { clearError, clearSuccess, clearSelectedCommande, clearSelectedClient } = adminSlice.actions;
export default adminSlice.reducer;
