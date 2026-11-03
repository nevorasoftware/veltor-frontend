/** Utilidades de fechas de pago (mismo criterio que el backend: finance/engine/dates.ts). */

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

export function addMonths(date: string, months: number, day?: number) {
  const [y, m, d] = date.split('-').map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return iso(ny, nm, Math.min(day ?? d, last));
}

/**
 * Primera cuota para un crédito que vence el día `paymentDay` de cada mes: la ocurrencia más cercana
 * a un mes después del desembolso, con al menos 15 días de plazo.
 */
export function firstDueDateForDay(disbursement: string, paymentDay: number) {
  const target = addMonths(disbursement, 1);
  const monthStart = `${target.slice(0, 7)}-01`;
  return [-1, 0, 1]
    .map((offset) => addMonths(monthStart, offset, paymentDay))
    .filter((c) => daysBetween(disbursement, c) >= 15)
    .reduce((best, c) => (Math.abs(daysBetween(target, c)) < Math.abs(daysBetween(target, best)) ? c : best));
}

/**
 * Lo que falta pagar de una cuota del ledger, en el orden en que el backend aplica los pagos
 * (mora → seguro → interés → capital): cuota total con seguro − lo pagado + mora pendiente.
 */
export function installmentOutstanding(i: any): { due: number; lateFee: number } {
  const n = (v: unknown) => Number(v) || 0;
  const total = i?.totalPayment != null ? n(i.totalPayment) : n(i?.payment) + n(i?.insurance);
  const paid = n(i?.paidPrincipal) + n(i?.paidInterest) + n(i?.paidInsurance);
  const lateFee = Math.max(0, n(i?.lateInterestAccrued) - n(i?.paidLateInterest));
  return { due: Math.max(0, total - paid) + lateFee, lateFee };
}
