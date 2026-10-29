import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export interface PublicSettings {
  configured: boolean;
  preferentialMonthlyRate: number | null;
  preferentialAnnualRate: number | null;
  minMonthlyRate: number | null;
  maxMonthlyRate: number | null;
  minDownPercent: number | null;
  minTermMonths: number | null;
  maxTermMonths: number | null;
  defaultTermMonths: number | null;
  productName: string | null;
}

/** Parámetros públicos del producto financiero (tasa, plazos, prima mínima). */
export function usePublicSettings() {
  return useQuery<PublicSettings>({
    queryKey: ['public-settings'],
    queryFn: () => api.getPublicSettings(),
    staleTime: 5 * 60 * 1000,
  });
}
