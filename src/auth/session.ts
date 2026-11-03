// Manejo centralizado de la sesión (token JWT y usuario autenticado)

const TOKEN_KEY = 'veltor_token';
const USER_KEY = 'veltor_user';

export interface SessionCompany {
  id: string;
  slug: string;
  name: string;
}

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  customerId?: string | null;
  mustChangePass?: boolean;
  /** Empresa del usuario; null para el SUPERADMIN de plataforma. */
  companyId?: string | null;
  company?: SessionCompany | null;
}

type Listener = () => void;
const listeners = new Set<Listener>();

/** Avisa a quien dependa de la sesión (p. ej. la empresa activa) que esta cambió. */
export function subscribeSession(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  listeners.forEach((l) => l());
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function saveSession(token: string, user: SessionUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  emit();
}

export function updateUser(patch: Partial<SessionUser>) {
  const user = getUser();
  if (user) localStorage.setItem(USER_KEY, JSON.stringify({ ...user, ...patch }));
  emit();
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  emit();
}

/** Lee la expiración del JWT sin validarlo (la validación real la hace el backend). */
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function hasValidSession(): boolean {
  const token = getToken();
  return !!token && !isTokenExpired(token) && !!getUser();
}

export const isCustomer = (user: SessionUser | null) => user?.role === 'CUSTOMER';
export const isSuperAdmin = (user: SessionUser | null) => user?.role === 'SUPERADMIN';

/** Ruta de inicio según el rol después del login. */
export function homePathFor(user: SessionUser | null): string {
  if (!user) return '/login';
  if (isSuperAdmin(user)) return '/plataforma';
  if (isCustomer(user)) return '/portal';
  return '/admin';
}
