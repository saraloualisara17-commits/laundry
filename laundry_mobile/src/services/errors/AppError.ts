export enum ErrorType {
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  API = 'API',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION = 'VALIDATION',
  CONFLICT = 'CONFLICT',
  OFFLINE = 'OFFLINE',
  UNKNOWN = 'UNKNOWN',
}

export class AppError extends Error {
  public type: ErrorType;
  public status?: number;
  public code?: string;
  public details?: any;
  public originalError?: any;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    options: {
      status?: number;
      code?: string;
      details?: any;
      originalError?: any;
    } = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
    this.originalError = options.originalError;
    
    // Ensure the prototype is set correctly for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Static helper to check if an object is an AppError
   */
  public static isAppError(error: any): error is AppError {
    return error instanceof AppError;
  }
}
