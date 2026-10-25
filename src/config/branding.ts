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
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1',
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

/** Formateador de fecha en formato salvadoreño DD/MM/YYYY */
export function formatDateSV(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  const d = typeof dateInput === 'string' ? new Date(dateInput.includes('T') ? dateInput : `${dateInput}T00:00:00`) : dateInput;
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
