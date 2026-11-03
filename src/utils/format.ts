// Formatos de moneda, número y fecha según la empresa activa (locale, moneda y zona horaria).

import { getCurrentTenant } from '../tenant/tenantStore';

const locale = () => getCurrentTenant()?.locale || undefined;
const currency = () => getCurrentTenant()?.currency || undefined;
const timeZone = () => getCurrentTenant()?.timezone || undefined;

const toNumber = (amount: number | string | null | undefined) =>
  typeof amount === 'string' ? parseFloat(amount) || 0 : Number(amount) || 0;

/** Monto en la moneda de la empresa, con dos decimales. */
export function formatMoney(amount: number | string | null | undefined): string {
  const num = toNumber(amount);
  const cur = currency();
  try {
    return new Intl.NumberFormat(locale(), {
      ...(cur ? { style: 'currency', currency: cur } : {}),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return num.toFixed(2);
  }
}

/** Número con separadores de miles según la empresa. */
export function formatNumber(value: number | string | null | undefined, maximumFractionDigits = 0): string {
  try {
    return new Intl.NumberFormat(locale(), { maximumFractionDigits }).format(toNumber(value));
  } catch {
    return String(toNumber(value));
  }
}

/** Símbolo de la moneda de la empresa (p. ej. "$"). */
export function currencySymbol(): string {
  const cur = currency();
  if (!cur) return '';
  try {
    return (
      new Intl.NumberFormat(locale(), { style: 'currency', currency: cur })
        .formatToParts(0)
        .find((p) => p.type === 'currency')?.value || cur
    );
  } catch {
    return cur;
  }
}

/** Código de la moneda de la empresa (p. ej. "USD"). */
export function currencyCode(): string {
  return currency() || '';
}

/** Nombre del país según la región del locale de la empresa (es-SV → "El Salvador"). */
export function countryName(): string | null {
  const loc = locale();
  const region = loc?.split('-')[1];
  if (!loc || !region) return null;
  try {
    return new Intl.DisplayNames([loc], { type: 'region' }).of(region.toUpperCase()) || null;
  } catch {
    return null;
  }
}

const datePartsIn = (date: Date, tz?: string) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '';
  return { y: get('year'), m: get('month'), d: get('day') };
};

/** Fecha de hoy (YYYY-MM-DD) en la zona horaria de la empresa. */
export function todayLocalISO(): string {
  try {
    const { y, m, d } = datePartsIn(new Date(), timeZone());
    return `${y}-${m}-${d}`;
  } catch {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
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

/** Fecha corta según el locale de la empresa. Las fechas contables (YYYY-MM-DD) no se convierten de zona. */
export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
  try {
    if (typeof dateInput === 'string') {
      const m = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
      // Medianoche UTC o fecha sin hora: es una fecha contable, se muestra tal cual
      if (m && (dateInput.length === 10 || /T00:00:00(\.000)?Z$/.test(dateInput))) {
        return new Intl.DateTimeFormat(locale(), { ...opts, timeZone: 'UTC' }).format(
          new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))),
        );
      }
    }
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat(locale(), { ...opts, timeZone: timeZone() }).format(d);
  } catch {
    return '-';
  }
}
