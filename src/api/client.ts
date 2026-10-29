import { BRANDING } from '../config/branding';
import { clearSession, getToken } from '../auth/session';

const API_BASE = BRANDING.apiUrl;

export interface ApiErrorResponse {
  message: string | string[];
  statusCode?: number;
  error?: string;
}

/** Cuando el backend rechaza el token se cierra la sesión y se envía al login. */
function handleUnauthorized(endpoint: string) {
  if (endpoint.startsWith('/auth/login')) return;
  clearSession();
  if (!window.location.pathname.startsWith('/login')) {
    window.location.assign('/login?expired=1');
  }
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseError(res: Response): Promise<string> {
  const data = await res.json().catch(() => null);
  if (Array.isArray(data?.message)) return data.message.join('. ');
  return data?.message || `Error en la solicitud (${res.status})`;
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeaders(),
    ...(options?.headers as Record<string, string>),
  };

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

  if (res.status === 401) {
    handleUnauthorized(endpoint);
  }
  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  return (await res.json().catch(() => null)) as T;
}

/** Descarga un PDF protegido con el token y lo abre en una pestaña nueva. */
async function openProtectedFile(endpoint: string) {
  // Se abre la pestaña de inmediato para que el navegador no la bloquee como popup
  const win = window.open('', '_blank');
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { headers: authHeaders() });
    if (res.status === 401) handleUnauthorized(endpoint);
    if (!res.ok) throw new Error(await parseError(res));
    const url = URL.createObjectURL(await res.blob());
    if (win) win.location.href = url;
    else window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    win?.close();
    throw err;
  }
}

const json = (method: string, payload?: unknown): RequestInit => ({
  method,
  body: payload === undefined ? undefined : JSON.stringify(payload),
});

export const api = {
  // Catálogo de vehículos (público)
  getVehicles: (query = '') => request<any>(`/vehicles?${query}`),
  getVehicle: (id: string) => request<any>(`/vehicles/${id}`),

  // Inventario (administración)
  getAllVehiclesAdmin: () => request<any[]>('/vehicles/admin/all'),
  createVehicle: (payload: any) => request<any>('/vehicles', json('POST', payload)),
  updateVehicle: (id: string, payload: any) => request<any>(`/vehicles/${id}`, json('PUT', payload)),
  changeVehicleStatus: (id: string, status: string, reason?: string) =>
    request<any>(`/vehicles/${id}/status`, json('PATCH', { status, reason })),

  // Simulador
  simulate: (payload: any) => request<any>('/simulator/calculate', json('POST', payload)),

  // Prospectos (Leads)
  submitLead: (payload: any) => request<any>('/leads', json('POST', payload)),
  getLeads: (status?: string) => request<any[]>(`/leads${status ? `?status=${status}` : ''}`),
  updateLead: (id: string, payload: any) => request<any>(`/leads/${id}`, json('PUT', payload)),
  updateLeadStatus: (id: string, payload: any) => request<any>(`/leads/${id}/status`, json('PATCH', payload)),
  convertLeadToLoan: (id: string, payload: any) => request<any>(`/leads/${id}/convert-to-loan`, json('POST', payload)),

  // Autenticación
  login: (payload: { email: string; password: string }) => request<any>('/auth/login', json('POST', payload)),
  getProfile: () => request<any>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<any>('/auth/change-password', json('POST', { currentPassword, newPassword })),

  // Reportes y Dashboard
  getDashboardMetrics: () => request<any>('/reports/dashboard'),
  getLoansSummary: () => request<any[]>('/reports/loans'),

  // Clientes
  getCustomers: (query = '') => request<any>(`/customers?${query}`),
  getCustomer: (id: string) => request<any>(`/customers/${id}`),
  createCustomer: (payload: any) => request<any>('/customers', json('POST', payload)),
  grantPortalAccess: (customerId: string) => request<any>(`/customers/${customerId}/portal-access`, json('POST')),

  // Finanzas y Pagos
  getLoanLedger: (loanId: string, asOfDate?: string) =>
    request<any>(`/finance/loans/${loanId}/ledger${asOfDate ? `?asOfDate=${asOfDate}` : ''}`),
  getPayoffQuote: (loanId: string, targetDate?: string) =>
    request<any>(`/finance/loans/${loanId}/payoff-quote${targetDate ? `?targetDate=${targetDate}` : ''}`),
  registerPayment: (payload: any) => request<any>('/finance/payments', json('POST', payload)),
  reversePayment: (paymentId: string, reason: string) =>
    request<any>(`/finance/payments/${paymentId}/reverse`, json('POST', { reason })),

  // Documentos PDF oficiales (requieren sesión)
  openLoanSchedulePdf: (loanId: string) => openProtectedFile(`/finance/loans/${loanId}/schedule.pdf`),
  openLoanStatementPdf: (loanId: string) => openProtectedFile(`/finance/loans/${loanId}/statement.pdf`),
  emailLoanStatement: (loanId: string, to?: string) =>
    request<{ status: string; to: string }>(`/finance/loans/${loanId}/statement/email`, json('POST', to ? { to } : {})),

  // Portal del cliente
  getPortalMe: () => request<any>('/portal/me'),
  getPortalLoan: (loanId: string) => request<any>(`/portal/loans/${loanId}`),

  // Expedientes y Documentos
  getCustomerDocuments: (customerId: string) => request<any[]>(`/customers/${customerId}/documents`),
  openDocument: (docId: string) => openProtectedFile(`/documents/${docId}/download`),
  uploadCustomerDocument: async (customerId: string, formData: FormData) => {
    const res = await fetch(`${API_BASE}/customers/${customerId}/documents`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    });
    if (res.status === 401) handleUnauthorized('/customers');
    if (!res.ok) throw new Error(await parseError(res));
    return res.json();
  },

  // Parámetros y Configuración
  getPublicSettings: () => request<any>('/settings/public'),
  updatePreferentialRate: (monthlyRate: number) =>
    request<any>('/settings/preferential-rate', json('PATCH', { monthlyRate })),

  // Control de Gastos y Contabilidad
  getExpenses: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params || {}).toString();
    return request<any[]>(`/expenses${q ? `?${q}` : ''}`);
  },
  getExpensesSummary: () => request<any>('/expenses/summary'),
  createExpense: (payload: any) => request<any>('/expenses', json('POST', payload)),
  updateExpense: (id: string, payload: any) => request<any>(`/expenses/${id}`, json('PUT', payload)),
  deleteExpense: (id: string) => request<any>(`/expenses/${id}`, json('DELETE')),
};
