import { createContext, useContext } from 'react';
import type { Tenant } from './types';

/** Textos de sección derivados del nombre de la empresa. */
export interface TenantSections {
  catalog: string;
  simulator: string;
  clientPortal: string;
  adminPanel: string;
  loans: string;
}

export interface TenantContextValue {
  tenant: Tenant;
  sections: TenantSections;
  /** URL absoluta del logo o undefined si la empresa no tiene. */
  logoSrc: string | undefined;
  /** El superadmin está operando una empresa como soporte. */
  isSupport: boolean;
  /** Vuelve a cargar la empresa (después de editar la marca). */
  refresh: () => Promise<unknown>;
}

export const TenantContext = createContext<TenantContextValue | null>(null);

export function buildSections(name: string): TenantSections {
  return {
    catalog: 'Vehículos disponibles',
    simulator: 'Simulador de financiamiento',
    clientPortal: `Mi ${name}`,
    adminPanel: `${name} · Administración`,
    loans: 'Créditos y amortización',
  };
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant debe usarse dentro de <TenantProvider>.');
  return ctx;
}
