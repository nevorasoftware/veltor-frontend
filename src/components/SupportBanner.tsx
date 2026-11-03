import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LifeBuoy, LogOut } from 'lucide-react';
import { useTenant } from '../tenant/TenantContext';
import { setSupportCompany } from '../tenant/tenantStore';

/** Aviso visible mientras el superadmin opera una empresa como soporte. */
export const SupportBanner: React.FC = () => {
  const { tenant, isSupport } = useTenant();
  const navigate = useNavigate();
  if (!isSupport) return null;

  const exit = () => {
    setSupportCompany(null);
    navigate('/plataforma');
  };

  return (
    <div role="status" className="bg-amber-500 text-slate-950 text-xs font-semibold">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <LifeBuoy className="w-4 h-4 shrink-0" />
          Modo soporte: estás operando la empresa <strong className="font-black">{tenant.name}</strong> ({tenant.slug}). Los
          cambios afectan sus datos reales.
        </span>
        <button
          onClick={exit}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950 text-amber-300 hover:bg-slate-800 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Salir del modo soporte
        </button>
      </div>
    </div>
  );
};
