import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Car, Calculator, UserCheck, Menu, X, ArrowRight } from 'lucide-react';
import { SECTIONS } from '../config/branding';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { label: SECTIONS.catalog, path: '/catalogo', icon: Car },
    { label: SECTIONS.simulator, path: '/simulador', icon: Calculator },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-700/50 bg-[#0B132B]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo Tipográfico VELTOR */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 border border-slate-600 flex items-center justify-center shadow-lg group-hover:border-slate-400 transition-colors">
              <svg className="w-6 h-6 text-slate-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6l8 12 8-12" />
                <path d="M9 13.5l3 4.5 3-4.5" stroke="#38BDF8" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-widest text-white uppercase font-sans">
                VELTOR
              </span>
              <span className="text-[10px] font-medium tracking-wider text-slate-400 -mt-1 uppercase">
                Financiamiento Vehicular
              </span>
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
                  className={`flex items-center gap-2 text-sm font-semibold tracking-wide transition-colors ${
                    isActive(link.path)
                      ? 'text-white border-b-2 border-slate-300 pb-1'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 text-slate-400" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Acceso a Portal y Panel */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/portal"
              className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-2 rounded-lg border border-slate-700 hover:border-slate-500 transition-all"
            >
              {SECTIONS.clientPortal}
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-900 bg-slate-100 hover:bg-white px-4 py-2.5 rounded-lg transition-all shadow-sm hover:shadow"
            >
              <UserCheck className="w-4 h-4 text-slate-800" />
              <span>Acceso</span>
            </Link>
          </div>

          {/* Botón Móvil */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Menú Móvil */}
      {isOpen && (
        <div className="md:hidden glass-panel border-b border-slate-700 px-4 pt-3 pb-6 space-y-3 bg-[#0B132B]">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive(link.path)
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 text-slate-400" />
                {link.label}
              </Link>
            );
          })}
          <div className="pt-4 border-t border-slate-800 flex flex-col gap-2">
            <Link
              to="/portal"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-slate-300 border border-slate-700"
            >
              <span>{SECTIONS.clientPortal}</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>
            <Link
              to="/login"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold bg-white text-slate-900"
            >
              <UserCheck className="w-4 h-4 text-slate-900" />
              <span>Ingresar al Sistema</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
