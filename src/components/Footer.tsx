import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, MapPin, Mail, Phone } from 'lucide-react';
import { useTenant } from '../tenant/TenantContext';
import { countryName, currencyCode } from '../utils/format';
import { TenantLogo } from './TenantLogo';

export const Footer: React.FC = () => {
  const { tenant, sections, logoSrc } = useTenant();
  const country = countryName();
  const currency = currencyCode();
  const location = [country, currency ? `Operaciones en ${currency}` : null].filter(Boolean).join(' · ');
  const hasContact = !!(tenant.contactPhone || tenant.contactEmail || tenant.contactHours);

  return (
    <footer className="brand-footer border-t border-white/10 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Columna Marca */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <TenantLogo name={tenant.name} src={logoSrc} className="w-8 h-8" textClassName="text-base" />
              <span className="text-xl font-black tracking-widest uppercase text-brand-on-primary">{tenant.name}</span>
            </div>
            {tenant.tagline && <p className="text-xs leading-relaxed">{tenant.tagline}</p>}
            {location && (
              <div className="pt-2 flex items-center gap-2 text-xs">
                <MapPin className="w-4 h-4" />
                <span>{location}</span>
              </div>
            )}
          </div>

          {/* Columna Navegación */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-on-primary">Plataforma</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/catalogo" className="hover:text-brand-on-primary transition-colors">
                  {sections.catalog}
                </Link>
              </li>
              <li>
                <Link to="/simulador" className="hover:text-brand-on-primary transition-colors">
                  {sections.simulator}
                </Link>
              </li>
              <li>
                <Link to="/portal" className="hover:text-brand-on-primary transition-colors">
                  {sections.clientPortal}
                </Link>
              </li>
              <li>
                <Link to="/admin" className="hover:text-brand-on-primary transition-colors">
                  {sections.adminPanel}
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna Transparencia y Seguridad */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-on-primary">Seguridad y Confianza</h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Expedientes con almacenamiento privado</span>
              </li>
              <li className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cálculos con precisión decimal garantizada</span>
              </li>
              <li>Tratamiento confidencial de datos personales</li>
            </ul>
          </div>

          {/* Columna Contacto (solo si la empresa la configuró) */}
          {hasContact && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand-on-primary">Atención al Cliente</h4>
              <div className="space-y-2 text-xs">
                {tenant.contactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5" />
                    <a href={`tel:${tenant.contactPhone.replace(/\s/g, '')}`} className="hover:text-brand-on-primary">
                      {tenant.contactPhone}
                    </a>
                  </div>
                )}
                {tenant.contactEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5" />
                    <a href={`mailto:${tenant.contactEmail}`} className="hover:text-brand-on-primary">
                      {tenant.contactEmail}
                    </a>
                  </div>
                )}
                {tenant.contactHours && <p className="text-[11px] pt-1">{tenant.contactHours}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Separador */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <p className="text-center md:text-left font-medium">
            © {new Date().getFullYear()} {tenant.legalName || tenant.name}
          </p>
          <p className="text-[11px] max-w-xl text-center md:text-right">
            Las solicitudes de financiamiento están sujetas a evaluación y condiciones contractuales. Desarrollado por
            Nevora Software.
          </p>
        </div>
      </div>
    </footer>
  );
};
