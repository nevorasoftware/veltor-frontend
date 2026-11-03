import React, { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { api, ApiError, resolveApiAssetUrl } from '../api/client';
import { TenantContext, buildSections, type TenantContextValue } from './TenantContext';
import {
  captureTenantSlugFromUrl,
  clearRequestedSlug,
  getRequestedSlug,
  getSupportCompany,
  setCurrentTenant,
  subscribeTenant,
  tenantKey,
} from './tenantStore';
import { applyBrandColors, applyFavicon, initialFavicon } from './theme';
import type { Tenant } from './types';

// El slug de ?empresa=slug se guarda antes del primer render
captureTenantSlugFromUrl();

const FullScreen: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen flex items-center justify-center px-4 bg-[#0B132B] text-slate-100">
    <div className="max-w-md w-full text-center space-y-4">{children}</div>
  </div>
);

/**
 * Carga la empresa (GET /public/tenant), aplica sus colores como variables CSS, el título y el favicon,
 * y la expone con useTenant(). En modo soporte usa la empresa elegida por el superadmin.
 */
export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const key = useSyncExternalStore(subscribeTenant, tenantKey);
  // key cambia cuando se entra o se sale del modo soporte, o cuando cambia la sesión
  const support = useMemo(() => (key ? getSupportCompany() : null), [key]);

  const query = useQuery<Tenant>({
    queryKey: ['tenant', key],
    queryFn: () => api.getTenant(),
    enabled: !support,
    staleTime: 5 * 60 * 1000,
    retry: (count, err) => !(err instanceof ApiError && err.status === 404) && count < 2,
    // Mientras se resuelve la nueva empresa (p. ej. justo después del login) se mantiene la anterior
    placeholderData: (previous) => previous,
  });

  const tenant: Tenant | undefined = support ?? query.data;
  // Los formateadores (moneda, fecha, zona horaria) leen la empresa activa de forma síncrona
  if (tenant) setCurrentTenant(tenant);

  const logoSrc = resolveApiAssetUrl(tenant?.logoUrl);

  // Al cambiar de empresa, los datos en caché (parámetros, vehículos, etc.) eran de la anterior
  const tenantId = tenant?.id;
  const previousTenantId = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!tenantId) return;
    if (previousTenantId.current && previousTenantId.current !== tenantId) {
      queryClient.resetQueries({ predicate: (q) => q.queryKey[0] !== 'tenant' && q.queryKey[0] !== 'platform-companies' });
    }
    previousTenantId.current = tenantId;
  }, [tenantId, queryClient]);

  useEffect(() => {
    if (!tenant) return;
    applyBrandColors(tenant);
    applyFavicon(logoSrc || initialFavicon(tenant.name, tenant.accentColor));
    document.title = tenant.tagline ? `${tenant.name} — ${tenant.tagline}` : tenant.name;
    document.documentElement.lang = tenant.locale?.split('-')[0] || document.documentElement.lang;
  }, [tenant, logoSrc]);

  const value = useMemo<TenantContextValue | null>(
    () =>
      tenant
        ? {
            tenant,
            sections: buildSections(tenant.name),
            logoSrc,
            isSupport: !!support,
            refresh: () => queryClient.invalidateQueries({ queryKey: ['tenant'] }),
          }
        : null,
    [tenant, logoSrc, support, queryClient],
  );

  if (value) return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;

  if (query.isError) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    const requested = getRequestedSlug();
    return (
      <FullScreen>
        <AlertCircle className="w-10 h-10 mx-auto text-rose-400" />
        <h1 className="text-lg font-bold text-white">
          {notFound ? 'Empresa no disponible' : 'No fue posible cargar el sitio'}
        </h1>
        <p className="text-sm text-slate-400">
          {notFound
            ? 'La empresa solicitada no existe o no está activa en este momento.'
            : (query.error as Error)?.message || 'Intenta nuevamente en unos minutos.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            onClick={() => query.refetch()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reintentar
          </button>
          {notFound && requested && (
            <button
              onClick={() => {
                clearRequestedSlug();
                const url = new URL(window.location.href);
                url.searchParams.delete('empresa');
                window.history.replaceState(null, '', url.toString());
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-900 text-xs font-bold hover:bg-white cursor-pointer"
            >
              Ir al sitio principal
            </button>
          )}
        </div>
      </FullScreen>
    );
  }

  return (
    <FullScreen>
      <Loader2 className="w-8 h-8 mx-auto animate-spin text-slate-400" />
    </FullScreen>
  );
};
