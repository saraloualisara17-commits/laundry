/**
 * Utilities for building query strings and handling pagination.
 */
export const buildQueryParams = (params: Record<string, any>) => {
  const cleanParams: Record<string, any> = {};
  
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      cleanParams[key] = params[key];
    }
  });
  
  return cleanParams;
};
