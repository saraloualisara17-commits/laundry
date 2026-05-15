import { createAsyncThunk } from '@reduxjs/toolkit';
import statisticsApi from '../../services/statistics/statisticsApi';
import { handleApiError } from '../../services/shared/errorHandler';

export const fetchTodayStats = createAsyncThunk(
  'statistics/fetchTodayStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await statisticsApi.getTodayStats();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const fetchStatusOverview = createAsyncThunk(
  'statistics/fetchStatusOverview',
  async (_, { rejectWithValue }) => {
    try {
      const response = await statisticsApi.getStatusOverview();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error));
    }
  }
);
