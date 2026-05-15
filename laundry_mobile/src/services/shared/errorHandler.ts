import { extractErrorMessage } from '../../utils/errorUtils';

/**
 * Centralized error handler for API services.
 * Can be expanded to include logging, analytics, or specific error transformations.
 */
export const handleApiError = (error: any): string => {
  return extractErrorMessage(error);
};
