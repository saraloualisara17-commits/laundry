import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { BASE_URL } from '../api/axios';

interface SystemSettings {
  appName: string;
  logoUrl: string | null;
  businessPhone: string | null;
}

interface SettingsState {
  settings: SystemSettings;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: SettingsState = {
  settings: {
    appName: 'PureClean',
    logoUrl: null,
    businessPhone: null,
  },
  status: 'idle',
  error: null,
};

export const fetchSettings = createAsyncThunk('settings/fetchSettings', async () => {
  const response = await axios.get(`${BASE_URL}/api/public/settings`);
  return response.data;
});

export const updateSettings = createAsyncThunk(
  'settings/updateSettings',
  async ({ appName, businessPhone, logo }: { appName?: string; businessPhone?: string; logo?: any }, { getState }: any) => {
    const formData = new FormData();
    if (appName) formData.append('appName', appName);
    if (businessPhone) formData.append('businessPhone', businessPhone);
    if (logo) {
      // @ts-ignore
      formData.append('logo', {
        uri: logo.uri,
        name: logo.fileName || 'logo.jpg',
        type: logo.type || 'image/jpeg',
      });
    }

    const token = getState().auth.token;
    const response = await axios.put(`${BASE_URL}/api/admin/settings`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSettings.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchSettings.fulfilled, (state, action: PayloadAction<any>) => {
        state.status = 'succeeded';
        state.settings.appName = action.payload.appName || 'PureClean';
        state.settings.logoUrl = action.payload.logoUrl
          ? `${BASE_URL}/uploads/${action.payload.logoUrl}`
          : null;
        state.settings.businessPhone = action.payload.businessPhone || null;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch settings';
      })
      .addCase(updateSettings.fulfilled, (state, action: PayloadAction<any>) => {
        state.settings.appName = action.payload.appName;
        state.settings.logoUrl = action.payload.logoUrl
          ? `${BASE_URL}/uploads/${action.payload.logoUrl}`
          : null;
        state.settings.businessPhone = action.payload.businessPhone || null;
      });
  },
});

export default settingsSlice.reducer;
