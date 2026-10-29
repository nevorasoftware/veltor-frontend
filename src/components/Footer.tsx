import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, MapPin, Mail, Phone } from 'lucide-react';
import { BRANDING, SECTIONS } from '../config/branding';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800 bg-[#070D1E] text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Columna Marca */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-600 flex items-center justify-center">
                <span className="text-white font-black text-lg">V</span>
              </div>
              <span className="text-xl font-black tracking-widest text-white uppercase">
                {BRANDING.name}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {BRANDING.tagline}
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs text-slate-400">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span>El Salvador · Operaciones en USD</span>
            </div>
          </div>

          {/* Columna Navegación */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Plataforma
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/catalogo" className="hover:text-white transition-colors">
                  {SECTIONS.catalog}
                </Link>
              </li>
              <li>
                <Link to="/simulador" className="hover:text-white transition-colors">
                  {SECTIONS.simulator}
                </Link>
              </li>
              <li>
                <Link to="/portal" className="hover:text-white transition-colors">
                  {SECTIONS.clientPortal}
                </Link>
              </li>
              <li>
                <Link to="/admin" className="hover:text-white transition-colors">
                  {SECTIONS.adminPanel}
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna Transparencia y Seguridad */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Seguridad y Confianza
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
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

          {/* Columna Contacto (solo si está configurada) */}
          {(BRANDING.contactPhone || BRANDING.contactEmail) && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Atención al Cliente
              </h4>
              <div className="space-y-2 text-xs text-slate-400">
                {BRANDING.contactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <a href={`tel:${BRANDING.contactPhone.replace(/\s/g, '')}`} className="hover:text-white">
                      {BRANDING.contactPhone}
                    </a>
                  </div>
                )}
                {BRANDING.contactEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <a href={`mailto:${BRANDING.contactEmail}`} className="hover:text-white">
                      {BRANDING.contactEmail}
                    </a>
                  </div>
                )}
                {BRANDING.contactHours && <p className="text-[11px] text-slate-400 pt-1">{BRANDING.contactHours}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Separador */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p className="text-center md:text-left font-medium text-slate-400">
            {BRANDING.footerNote}
          </p>
          <p className="text-[11px] text-slate-400 max-w-xl text-center md:text-right">
            Nevora Software actúa como desarrollador y respaldo tecnológico de la plataforma VELTOR. Las solicitudes de financiamiento están sujetas a evaluación y condiciones contractuales.
          </p>
        </div>
      </div>
    </footer>
  );
};
