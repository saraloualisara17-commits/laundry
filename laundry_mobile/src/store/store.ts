import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import adminReducer from './adminSlice';
import livreurReducer from './livreurSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    admin: adminReducer,
    livreur: livreurReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
