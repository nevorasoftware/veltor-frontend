import React from 'react';
import { Navigate } from 'react-router-dom';
import { getUser, hasValidSession, homePathFor } from '../auth/session';

/**
 * Punto de entrada de la app instalada (start_url del manifiesto): con sesión abierta va directo a su
 * panel o portal; sin sesión, al inicio de sesión.
 */
export const AppStartPage: React.FC = () => {
  const user = hasValidSession() ? getUser() : null;
  if (user && !user.mustChangePass) return <Navigate to={homePathFor(user)} replace />;
  return <Navigate to="/login" replace />;
};
