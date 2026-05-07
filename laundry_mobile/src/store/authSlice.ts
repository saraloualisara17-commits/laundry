import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user?: User; token?: string; refreshToken?: string }>) => {
      const { user, token, refreshToken } = action.payload;
      
      if (user !== undefined) {
        state.user = user ? { ...user, isActive: user.isActive ?? true } : null;
      }
      
      if (token !== undefined) {
        state.token = token;
      }

      // SecureStore operations are async, so we just fire and forget here,
      // or handle them outside Redux. It's safer to handle them in the API/Login component.
      // But we provide a central action for setting the state in memory.
    },
    logOut: (state) => {
      state.user = null;
      state.token = null;
    },
  },
});

export const { setCredentials, logOut } = authSlice.actions;
export default authSlice.reducer;
