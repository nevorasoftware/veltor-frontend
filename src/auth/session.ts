// Manejo centralizado de la sesión (token JWT y usuario autenticado)

const TOKEN_KEY = 'veltor_token';
const USER_KEY = 'veltor_user';

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  customerId?: string | null;
  mustChangePass?: boolean;
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
}

export function updateUser(patch: Partial<SessionUser>) {
  const user = getUser();
  if (user) localStorage.setItem(USER_KEY, JSON.stringify({ ...user, ...patch }));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
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
