import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getUser, hasValidSession, clearSession, homePathFor, isSuperAdmin } from './session';
import { getSupportCompany } from '../tenant/tenantStore';

interface RequireAuthProps {
  /** 'staff' = personal de la empresa; 'customer' = portal del cliente; 'platform' = superadmin */
  audience: 'staff' | 'customer' | 'platform';
  children: React.ReactElement;
}

export const RequireAuth: React.FC<RequireAuthProps> = ({ audience, children }) => {
  const location = useLocation();

  if (!hasValidSession()) {
    clearSession();
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const user = getUser()!;
  if (user.mustChangePass) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const superAdmin = isSuperAdmin(user);
  const isCustomer = user.role === 'CUSTOMER';

  if (audience === 'platform') return superAdmin ? children : <Navigate to={homePathFor(user)} replace />;
  if (audience === 'customer') return isCustomer ? children : <Navigate to={homePathFor(user)} replace />;

  // Panel de la empresa: el superadmin solo entra en modo soporte
  if (isCustomer) return <Navigate to="/portal" replace />;
  if (superAdmin && !getSupportCompany()) return <Navigate to="/plataforma" replace />;
  return children;
};
