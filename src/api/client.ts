import { BRANDING } from '../config/branding';

const API_BASE = BRANDING.apiUrl;

export interface ApiErrorResponse {
  message: string | string[];
  statusCode?: number;
  error?: string;
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('veltor_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg = Array.isArray(data?.message)
        ? data.message.join('. ')
        : data?.message || `Error en la solicitud (${res.status})`;
      throw new Error(errorMsg);
    }

    return data as T;
  } catch (err: any) {
    console.error(`Error en API [${endpoint}]:`, err);
    throw err;
  }
}

export const api = {
  // Catálogo de vehículos
  getVehicles: (query = '') => request<any>(`/vehicles?${query}`),
  getVehicle: (id: string) => request<any>(`/vehicles/${id}`),

  // Simulador
  simulate: (payload: any) =>
    request<any>('/simulator/calculate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Prospectos (Leads)
  submitLead: (payload: any) =>
    request<any>('/leads', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getLeads: (status?: string) => request<any[]>(`/leads${status ? `?status=${status}` : ''}`),
  updateLeadStatus: (id: string, payload: any) =>
    request<any>(`/leads/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  // Autenticación
  login: (payload: any) =>
    request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getProfile: () => request<any>('/auth/me'),

  // Reportes y Dashboard
  getDashboardMetrics: () => request<any>('/reports/dashboard'),
  getLoansSummary: () => request<any>('/reports/loans'),

  // Clientes
  getCustomers: (query = '') => request<any>(`/customers?${query}`),
  getCustomer: (id: string) => request<any>(`/customers/${id}`),
  createCustomer: (payload: any) =>
    request<any>('/customers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Finanzas y Pagos
  getLoanLedger: (loanId: string, asOfDate?: string) =>
    request<any>(`/finance/loans/${loanId}/ledger${asOfDate ? `?asOfDate=${asOfDate}` : ''}`),
  getPayoffQuote: (loanId: string, targetDate?: string) =>
    request<any>(`/finance/loans/${loanId}/payoff-quote${targetDate ? `?targetDate=${targetDate}` : ''}`),
  registerPayment: (payload: any) =>
    request<any>('/finance/payments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  reversePayment: (paymentId: string, reason: string) =>
    request<any>(`/finance/payments/${paymentId}/reverse`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // Descargas PDF Oficiales
  getLoanSchedulePdfUrl: (loanId: string) => `${API_BASE}/finance/loans/${loanId}/schedule.pdf`,
  getLoanStatementPdfUrl: (loanId: string) => `${API_BASE}/finance/loans/${loanId}/statement.pdf`,

  // Expedientes y Documentos
  getCustomerDocuments: (customerId: string) => request<any[]>(`/customers/${customerId}/documents`),
  getDocumentDownloadUrl: (docId: string) => `${API_BASE}/documents/${docId}/download`,
  uploadCustomerDocument: async (customerId: string, formData: FormData) => {
    const token = localStorage.getItem('veltor_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/customers/${customerId}/documents`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Error al subir documento');
    }
    return res.json();
  },

  // Parámetros y Configuración
  getPublicSettings: () => request<any>('/settings/public'),
  updatePreferentialRate: (monthlyRate: number) =>
    request<any>('/settings/preferential-rate', {
      method: 'PATCH',
      body: JSON.stringify({ monthlyRate }),
    }),
};

