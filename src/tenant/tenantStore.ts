// Estado de la empresa activa fuera de React: lo usan el cliente HTTP (headers) y los formateadores.

import { getUser, hasValidSession, isSuperAdmin, subscribeSession } from '../auth/session';
import type { Company, Tenant } from './types';

const SLUG_KEY = 'veltor_tenant_slug';
const SUPPORT_KEY = 'veltor_support_company';

let currentTenant: Tenant | null = null;

type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());
subscribeSession(emit);

const safeSession = {
  get(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string | null) {
    try {
      if (value === null) sessionStorage.removeItem(key);
      else sessionStorage.setItem(key, value);
    } catch {
      /* almacenamiento no disponible */
    }
  },
};

export function subscribeTenant(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Empresa cargada actualmente (para formatos de moneda, fecha y zona horaria). */
export function getCurrentTenant(): Tenant | null {
  return currentTenant;
}

export function setCurrentTenant(tenant: Tenant | null) {
  currentTenant = tenant;
}

/** Guarda el slug que llega en ?empresa=slug para las siguientes peticiones de la pestaña. */
export function captureTenantSlugFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('empresa');
  if (slug === null) return;
  const clean = slug.trim().toLowerCase();
  safeSession.set(SLUG_KEY, /^[a-z0-9-]{3,40}$/.test(clean) ? clean : null);
}

export function clearRequestedSlug() {
  safeSession.set(SLUG_KEY, null);
  emit();
}

/** Empresa a la que el superadmin entró como soporte (o null). */
export function getSupportCompany(): Company | null {
  if (!hasValidSession() || !isSuperAdmin(getUser())) return null;
  try {
    const raw = safeSession.get(SUPPORT_KEY);
    return raw ? (JSON.parse(raw) as Company) : null;
  } catch {
    return null;
  }
}

export function setSupportCompany(company: Company | null) {
  safeSession.set(SUPPORT_KEY, company ? JSON.stringify(company) : null);
  emit();
}

/**
 * Slug que se envía en X-Tenant, en este orden: empresa en soporte, empresa del usuario autenticado
 * y por último ?empresa=slug. Sin slug el backend resuelve por dominio o usa la empresa por defecto.
 */
export function getRequestedSlug(): string | null {
  const support = getSupportCompany();
  if (support) return support.slug;
  const user = hasValidSession() ? getUser() : null;
  if (user?.company?.slug) return user.company.slug;
  return safeSession.get(SLUG_KEY);
}

/** Llave que cambia cuando debe volver a resolverse la empresa. */
export function tenantKey(): string {
  return `${getRequestedSlug() ?? ''}|${getSupportCompany()?.id ?? ''}`;
}

// Al cerrar sesión se sale también del modo soporte
subscribeSession(() => {
  if (!hasValidSession()) safeSession.set(SUPPORT_KEY, null);
});
