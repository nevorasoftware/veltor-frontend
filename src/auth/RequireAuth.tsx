import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getUser, hasValidSession, clearSession } from './session';

interface RequireAuthProps {
  /** 'staff' = personal interno; 'customer' = portal del cliente */
  audience: 'staff' | 'customer';
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

  const isCustomer = user.role === 'CUSTOMER';
  if (audience === 'staff' && isCustomer) return <Navigate to="/portal" replace />;
  if (audience === 'customer' && !isCustomer) return <Navigate to="/admin" replace />;

  return children;
};
