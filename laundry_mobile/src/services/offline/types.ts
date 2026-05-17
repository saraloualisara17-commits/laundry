export enum TaskType {
  UPDATE_ORDER_STATUS = 'UPDATE_ORDER_STATUS',
  RECORD_PAYMENT = 'RECORD_PAYMENT',
  DELIVERY_CONFIRMATION = 'DELIVERY_CONFIRMATION',
  UPLOAD_IMAGE = 'UPLOAD_IMAGE',
  CREATE_CLIENT = 'CREATE_CLIENT',
}

export interface OfflineTask {
  id: string;
  type: TaskType;
  payload: any;
  metadata?: {
    orderId?: string | number;
    clientId?: string | number;
    timestamp: number;
    attempts: number;
  };
}

export interface ConnectivityState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type?: string;
}
