import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Car, Calculator, UserCheck, Menu, X, ArrowRight, LayoutDashboard, Building2 } from 'lucide-react';
import { useTenant } from '../tenant/TenantContext';
import { getSupportCompany } from '../tenant/tenantStore';
import { getUser, hasValidSession, isCustomer, isSuperAdmin } from '../auth/session';
import { TenantLogo } from './TenantLogo';
import { SupportBanner } from './SupportBanner';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { tenant, sections, logoSrc } = useTenant();

  const navLinks = [
    { label: sections.catalog, path: '/catalogo', icon: Car },
    { label: sections.simulator, path: '/simulador', icon: Calculator },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Se recalcula en cada cambio de ruta (login/logout navegan), así refleja la sesión actual.
  const loggedIn = hasValidSession();
  const user = loggedIn ? getUser() : null;
  const superAdmin = isSuperAdmin(user);
  const showClientPortal = !loggedIn || isCustomer(user);
  const showAdminPanel = loggedIn && !isCustomer(user) && (!superAdmin || !!getSupportCompany());
  const showPlatform = superAdmin;

  return (
    <header className="sticky top-0 z-50 brand-nav border-b border-white/10 backdrop-blur-md">
      <SupportBanner />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Marca de la empresa */}
          <Link to="/" className="flex items-center gap-3 group min-w-0">
            <TenantLogo name={tenant.name} src={logoSrc} />
            <div className="flex flex-col min-w-0">
              <span className="text-xl sm:text-2xl font-black tracking-widest uppercase font-sans truncate">{tenant.name}</span>
              {tenant.tagline && (
                <span className="hidden sm:block text-[10px] font-medium tracking-wider opacity-70 -mt-1 uppercase truncate max-w-[18rem]">
                  {tenant.tagline}
                </span>
              )}
            </div>
          </Link>

          {/* Enlaces Desktop */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 text-sm font-semibold tracking-wide transition-opacity ${
                    isActive(link.path) ? 'opacity-100 border-b-2 border-brand-accent pb-1' : 'opacity-75 hover:opacity-100'
                  }`}
                >
                  <Icon className="w-4 h-4 text-brand-accent" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Acceso a Portal y Panel */}
          <div className="hidden md:flex items-center gap-4">
            {showClientPortal && (
              <Link
                to="/portal"
                className="text-xs font-semibold opacity-80 hover:opacity-100 px-3 py-2 rounded-lg border border-current/30 transition-all"
              >
                {sections.clientPortal}
              </Link>
            )}
            {showPlatform && (
              <Link
                to="/plataforma"
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-lg border border-brand-accent/40 bg-brand-accent/15 hover:bg-brand-accent/25 transition-all"
              >
                <Building2 className="w-4 h-4 text-brand-accent" />
                <span>Plataforma</span>
              </Link>
            )}
            {showAdminPanel && (
              <Link
                to="/admin"
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-lg border border-brand-accent/40 bg-brand-accent/15 hover:bg-brand-accent/25 transition-all"
              >
                <LayoutDashboard className="w-4 h-4 text-brand-accent" />
                <span>Panel Admin</span>
              </Link>
            )}
            {!loggedIn && (
              <Link
                to="/login"
                className="btn-brand flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-lg shadow-sm hover:shadow"
              >
                <UserCheck className="w-4 h-4" />
                <span>Acceso</span>
              </Link>
            )}
          </div>

          {/* Botón Móvil */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg opacity-80 hover:opacity-100 hover:bg-white/10 focus:outline-none"
              aria-label="Abrir o cerrar el menú"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Menú Móvil */}
      {isOpen && (
        <div className="md:hidden border-t border-white/10 px-4 pt-3 pb-6 space-y-3">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive(link.path) ? 'bg-white/10 font-bold' : 'opacity-80 hover:bg-white/5 hover:opacity-100'
                }`}
              >
                <Icon className="w-5 h-5 text-brand-accent" />
                {link.label}
              </Link>
            );
          })}
          <div className="pt-4 border-t border-white/10 flex flex-col gap-2">
            {showClientPortal && (
              <Link
                to="/portal"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-sm opacity-90 border border-current/30"
              >
                <span>{sections.clientPortal}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            {showPlatform && (
              <Link
                to="/plataforma"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold bg-brand-accent/15 border border-brand-accent/40"
              >
                <Building2 className="w-4 h-4 text-brand-accent" />
                <span>Plataforma</span>
              </Link>
            )}
            {showAdminPanel && (
              <Link
                to="/admin"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold bg-brand-accent/15 border border-brand-accent/40"
              >
                <LayoutDashboard className="w-4 h-4 text-brand-accent" />
                <span>Panel Admin</span>
              </Link>
            )}
            {!loggedIn && (
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="btn-brand flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold"
              >
                <UserCheck className="w-4 h-4" />
                <span>Ingresar al Sistema</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
