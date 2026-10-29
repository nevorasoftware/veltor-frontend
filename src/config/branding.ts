// =============================================================================
// VELTOR — Identidad del Producto y Configuración Central
// Desarrollado y respaldado por Nevora Software
// =============================================================================

export const BRANDING = {
  name: import.meta.env.VITE_PRODUCT_NAME || 'VELTOR',
  company: import.meta.env.VITE_PRODUCT_COMPANY || 'Nevora Software',
  tagline: import.meta.env.VITE_PRODUCT_TAGLINE || 'Financiamiento inteligente. Movilidad a tu alcance.',
  footerNote: 'VELTOR — Una solución tecnológica de Nevora Software',
  locale: import.meta.env.VITE_APP_LOCALE || 'es-SV',
  currency: import.meta.env.VITE_APP_CURRENCY || 'USD',
  timezone: import.meta.env.VITE_APP_TIMEZONE || 'America/El_Salvador',
  apiUrl: import.meta.env.VITE_API_URL || 'https://veltor-backend-production.up.railway.app/api/v1',
  // Datos de contacto y pago: se muestran solo si están configurados en el entorno
  contactPhone: import.meta.env.VITE_CONTACT_PHONE || '',
  contactEmail: import.meta.env.VITE_CONTACT_EMAIL || '',
  contactHours: import.meta.env.VITE_CONTACT_HOURS || '',
  paymentsEmail: import.meta.env.VITE_PAYMENTS_EMAIL || '',
  paymentsWhatsapp: import.meta.env.VITE_PAYMENTS_WHATSAPP || '',
  /** Cuentas bancarias separadas por ";" — formato "Banco|Detalle", p. ej. "Banco X|Cta. Corriente #123" */
  bankAccounts: (import.meta.env.VITE_BANK_ACCOUNTS || '')
    .split(';')
    .map((entry: string) => entry.trim())
    .filter(Boolean)
    .map((entry: string) => {
      const [bank, ...detail] = entry.split('|');
      return { bank: bank.trim(), detail: detail.join('|').trim() };
    }),
  bankAccountHolder: import.meta.env.VITE_BANK_ACCOUNT_HOLDER || '',
};

export const SECTIONS = {
  publicSite: 'VELTOR',
  catalog: 'Vehículos disponibles',
  simulator: 'Simulador de financiamiento VELTOR',
  adminPanel: 'VELTOR Administración',
  clientPortal: 'Mi VELTOR',
  customers: 'Gestión de clientes',
  loans: 'Créditos y amortización',
  collections: 'Pagos y cobranza',
  reports: 'Informes financieros',
  docs: 'VELTOR — Desarrollado por Nevora Software',
};

/** Formateador de moneda oficial en USD */
export function formatUSD(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/** Fecha local de hoy en formato YYYY-MM-DD (toISOString usa UTC y puede adelantar el día). */
export function todayLocalISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Suma meses a una fecha YYYY-MM-DD conservando el día (ajustado al último día del mes). */
export function addMonthsISO(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(y, m - 1 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d, lastDay));
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
}

/** Cuota nivelada francesa estimada. */
export function levelPayment(principal: number, monthlyRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  if (monthlyRate === 0) return principal / months;
  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
}

/** Formateador de fecha en formato salvadoreño DD/MM/YYYY */
export function formatDateSV(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  // Las fechas contables (YYYY-MM-DD o medianoche UTC) se muestran tal cual, sin convertir de zona horaria
  if (typeof dateInput === 'string') {
    const m = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  }
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
