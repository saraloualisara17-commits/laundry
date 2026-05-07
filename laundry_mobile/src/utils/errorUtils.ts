export const extractErrorMessage = (error: any): string => {
  const errData = error.response?.data;
  
  // Handle string responses
  if (typeof errData === 'string') return errData;
  
  // Handle Spring Boot standard error structure
  if (errData?.message) return errData.message;
  
  // Handle generic error field
  if (errData?.error && typeof errData.error === 'string') return errData.error;
  
  // Handle validation errors (Spring Validation)
  if (errData?.errors) {
    if (typeof errData.errors === 'object') {
      // If it's an object of field errors
      return Object.values(errData.errors).join(', ');
    }
    return String(errData.errors);
  }
  
  // Handle Axios/Network errors
  if (error.message === 'Network Error') {
    return 'Erreur réseau. Vérifiez votre connexion.';
  }
  
  return error.message || 'Une erreur est survenue';
};
