import { API_URL } from '../config/branding';
import { clearSession, getToken, getUser, isSuperAdmin } from '../auth/session';
import { getRequestedSlug, getSupportCompany } from '../tenant/tenantStore';
import type { Company, CreateCompanyInput, CreateCompanyResult, Tenant, UpdateCompanyInput } from '../tenant/types';

const API_BASE = API_URL;

export interface ApiErrorResponse {
  message: string | string[];
  statusCode?: number;
  error?: string;
}

/** Error de la API con el código HTTP (p. ej. 404 cuando la empresa no existe o está inactiva). */
export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export type LateFeeType = 'NONE' | 'PER_DAY' | 'PER_INSTALLMENT';

/** Parámetros de cobranza: recordatorios, gracia, día de pago y mora */
export interface CollectionSettings {
  reminderDaysBefore: number;
  graceDays: number;
  overdueReminderEveryDays: number;
  defaultPaymentDay: number | null;
  defaultLateFeeType: LateFeeType;
  lateFeePerDayAmount: number;
  lateFeePerInstallmentAmount: number;
}

export interface StorageStatus {
  enabled: boolean;
  driver: string;
  rootFolder?: string;
  rootFolderUrl?: string;
  message?: string;
  error?: string;
}

/** Las fotos guardadas en Google Drive se publican por la API con una ruta relativa (media/...) */
export const resolveMediaUrl = (url?: string | null) =>
  url && url.startsWith('media/') ? `${API_BASE}/${url}` : url || undefined;

/** Rutas absolutas de la API (p. ej. el logo /api/v1/public/companies/:slug/logo) se resuelven contra su origen. */
export const resolveApiAssetUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  if (/^(https?:|data:|blob:)/.test(url)) return url;
  if (url.startsWith('media/')) return `${API_BASE}/${url}`;
  try {
    return new URL(url, API_BASE).toString();
  } catch {
    return url;
  }
};

/** Cuando el backend rechaza el token se cierra la sesión y se envía al login. */
function handleUnauthorized(endpoint: string) {
  if (/^\/auth\/(login|forgot-password|reset-password)/.test(endpoint)) return;
  clearSession();
  if (!window.location.pathname.startsWith('/login')) {
    window.location.assign('/login?expired=1');
  }
}

/** Token de sesión y empresa: X-Tenant (slug) y, en modo soporte del superadmin, X-Company-Id. */
function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const slug = getRequestedSlug();
  if (slug) headers['X-Tenant'] = slug;
  const support = getSupportCompany();
  if (support && isSuperAdmin(getUser())) headers['X-Company-Id'] = support.id;
  return headers;
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
    throw new ApiError(await parseError(res), res.status);
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
  // Recuperación de contraseña (públicas; la respuesta de forgot siempre es neutra)
  forgotPassword: (email: string) => request<{ message?: string }>('/auth/forgot-password', json('POST', { email })),
  resetPassword: (token: string, newPassword: string) =>
    request<{ message?: string }>('/auth/reset-password', json('POST', { token, newPassword })),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<any>('/auth/change-password', json('POST', { currentPassword, newPassword })),

  // Reportes y Dashboard
  getDashboardMetrics: () => request<any>('/reports/dashboard'),
  getLoansSummary: () => request<any[]>('/reports/loans'),
  /** Créditos con cuotas vencidas y mora a hoy, calculado con el ledger en el backend. */
  getDelinquencySummary: () => request<DelinquencySummary>('/reports/delinquency'),

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
  getNotificationSettings: () => request<any>('/settings/notifications'),
  updateStaffEmails: (staffEmails: string[]) =>
    request<any>('/settings/notifications', json('PATCH', { staffEmails })),
  getCollectionSettings: () => request<CollectionSettings>('/settings/collections'),
  updateCollectionSettings: (payload: Partial<CollectionSettings>) =>
    request<CollectionSettings & { message: string }>('/settings/collections', json('PATCH', payload)),
  runCollectionDaemon: () => request<any>('/notifications/payment-reminders/run', { method: 'POST' }),

  // Almacenamiento en Google Drive
  getStorageStatus: () => request<StorageStatus>('/storage/status'),
  archiveLoanToDrive: (loanId: string) => request<any>(`/finance/loans/${loanId}/drive/archive`, { method: 'POST' }),

  // Control de Gastos y Contabilidad
  getExpenses: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params || {}).toString();
    return request<any[]>(`/expenses${q ? `?${q}` : ''}`);
  },
  getExpensesSummary: () => request<any>('/expenses/summary'),
  createExpense: (payload: any) => request<any>('/expenses', json('POST', payload)),
  updateExpense: (id: string, payload: any) => request<any>(`/expenses/${id}`, json('PUT', payload)),
  deleteExpense: (id: string) => request<any>(`/expenses/${id}`, json('DELETE')),

  // Empresa resuelta (pública): marca, contactos y formatos
  getTenant: () => request<Tenant>('/public/tenant'),

  // Mi empresa (ADMIN de la empresa)
  getMyCompany: () => request<Company>('/company'),
  updateMyCompany: (payload: UpdateCompanyInput) => request<Company>('/company', json('PATCH', payload)),
  uploadMyCompanyLogo: (base64: string, mime: string) =>
    request<Company>('/company/logo', json('PUT', { base64, mime })),

  // Plataforma (solo SUPERADMIN)
  getPlatformCompanies: () => request<Company[]>('/platform/companies'),
  getPlatformCompany: (id: string) => request<Company>(`/platform/companies/${id}`),
  createPlatformCompany: (payload: CreateCompanyInput) =>
    request<CreateCompanyResult>('/platform/companies', json('POST', payload)),
  updatePlatformCompany: (id: string, payload: UpdateCompanyInput) =>
    request<Company>(`/platform/companies/${id}`, json('PATCH', payload)),
  uploadPlatformCompanyLogo: (id: string, base64: string, mime: string) =>
    request<Company>(`/platform/companies/${id}/logo`, json('PUT', { base64, mime })),
  setPlatformCompanyStatus: (id: string, isActive: boolean) =>
    request<Company>(`/platform/companies/${id}/status`, json('PATCH', { isActive })),
  createPlatformCompanyAdmin: (id: string, payload: { email: string; fullName: string }) =>
    request<any>(`/platform/companies/${id}/admins`, json('POST', payload)),
  /** Borra la empresa y todos sus datos; confirmSlug debe ser igual a su slug. */
  deletePlatformCompany: (id: string, confirmSlug: string) =>
    request<any>(`/platform/companies/${id}`, json('DELETE', { confirmSlug })),
};

/** Resumen de mora (GET /reports/delinquency), calculado con el ledger a la fecha. Montos como texto con 2 decimales. */
export interface DelinquencyItem {
  loanId: string;
  code: string;
  customerId: string;
  customerName: string;
  vehicleTitle: string;
  overdueInstallments: number;
  oldestDueDate: string;
  daysOverdue: number;
  graceDays: number;
  /** Vencido pero todavía dentro de los días de gracia (sin mora). */
  inGrace: boolean;
  overduePrincipalInterest: string;
  overdueInsurance: string;
  lateFees: string;
  totalDue: string;
}

export interface DelinquencySummary {
  asOf: string;
  timezone: string;
  currency: string;
  totals: {
    loansWithOverdue: number;
    loansDelinquent: number;
    loansInGrace: number;
    overdueInstallments: number;
    overduePrincipalInterest: string;
    overdueInsurance: string;
    lateFees: string;
    totalDue: string;
  };
  loans: DelinquencyItem[];
}
