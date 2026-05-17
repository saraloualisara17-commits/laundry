import { QueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

/**
 * Centralized Query Client for the application.
 * Configures global strategies for fetching, caching, and error handling.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 minutes
      staleTime: 1000 * 60 * 5,
      // Retry failed requests twice before showing an error
      retry: 2,
      // Refetch on window focus is often not desirable in mobile (prevents jitter on app switch)
      refetchOnWindowFocus: false,
      // Global error handling for queries
      meta: {
        onError: (error: any) => {
          console.error('Global Query Error:', error);
          // Optional: Generic alert for background sync errors
        },
      },
    },
    mutations: {
      // Global error handling for mutations
      onError: (error: any) => {
        console.error('Global Mutation Error:', error);
        // Alert is handled locally in hooks, but we log it here
      },
    },
  },
});

export default queryClient;
