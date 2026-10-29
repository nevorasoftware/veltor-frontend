import { levelPayment } from '../config/branding';
import type { PublicSettings } from '../hooks/usePublicSettings';

export const TRANSMISSION_LABELS: Record<string, string> = {
  AUTOMATIC: 'Automático',
  MANUAL: 'Manual',
};

export const FUEL_LABELS: Record<string, string> = {
  GASOLINE: 'Gasolina',
  DIESEL: 'Diésel',
  HYBRID: 'Híbrido',
  ELECTRIC: 'Eléctrico',
};

export const VEHICLE_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Disponible',
  RESERVED: 'Reservado',
  SOLD: 'Vendido',
  MAINTENANCE: 'En mantenimiento',
  UNPUBLISHED: 'No publicado',
};

/** Prima sugerida: la mínima del vehículo o el porcentaje mínimo del producto. */
export function suggestedDownPayment(vehicle: any, settings?: PublicSettings | null): number {
  const price = Number(vehicle.salePrice) || 0;
  const minDown = Number(vehicle.minDownPayment) || 0;
  const pct = settings?.minDownPercent ?? 0;
  return Math.max(minDown, Math.round((price * pct) / 100));
}

/** Cuota mensual estimada con la tasa y el plazo oficiales; null si el producto no está configurado. */
export function estimatedInstallment(vehicle: any, settings?: PublicSettings | null): number | null {
  if (!settings?.preferentialMonthlyRate || !settings.defaultTermMonths) return null;
  const principal = (Number(vehicle.salePrice) || 0) - suggestedDownPayment(vehicle, settings);
  return levelPayment(principal, settings.preferentialMonthlyRate, settings.defaultTermMonths);
}

export const primaryImageUrl = (vehicle: any): string | undefined => vehicle?.images?.[0]?.url;
