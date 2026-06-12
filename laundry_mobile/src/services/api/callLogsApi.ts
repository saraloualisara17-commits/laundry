import client from './client';

export interface CallLogStaff {
  id: number;
  name: string;
  role: string;
}

export interface CallLogClient {
  id: number;
  name: string;
}

export interface CallLog {
  id: number;
  staff: CallLogStaff;
  client: CallLogClient;
  orderId: number | null;
  orderStatus: string | null;
  orderTotal: number | null;
  phoneNumber: string;
  callType: 'PHONE' | 'WHATSAPP';
  calledAt: string;
}

export interface CallLogPage {
  content: CallLog[];
  totalElements: number;
  totalPages: number;
  last: boolean;
  number: number;
}

export interface LogCallRequest {
  clientId: number;
  orderId?: number | null;
  phoneNumber: string;
  callType: 'PHONE' | 'WHATSAPP';
}

export const callLogsApi = {
  logCall: (data: LogCallRequest) =>
    client.post<CallLog>('/api/call-logs', data),

  getAll: (page = 0) =>
    client.get<CallLogPage>(`/api/admin/call-logs?page=${page}`),

  getByClient: (clientId: number, page = 0) =>
    client.get<CallLogPage>(`/api/call-logs/client/${clientId}?page=${page}`),
};

export default callLogsApi;
