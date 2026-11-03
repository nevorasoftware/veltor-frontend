import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Edit3,
  LifeBuoy,
  Loader2,
  LogOut,
  Plus,
  Power,
  UserPlus,
  X,
} from 'lucide-react';
import { api, resolveApiAssetUrl } from '../api/client';
import { clearSession, getUser } from '../auth/session';
import { setSupportCompany } from '../tenant/tenantStore';
import { useTenant } from '../tenant/TenantContext';
import type { Company } from '../tenant/types';
import { TenantLogo } from '../components/TenantLogo';
import { CompanyEditor } from '../components/platform/CompanyEditor';
import { companyInputClass, FormField } from '../components/company/CompanyFields';
import { formatDate } from '../utils/format';
import { brandCssVars } from '../tenant/theme';

type View = { kind: 'list' } | { kind: 'create' } | { kind: 'edit'; company: Company };

/** Diálogo para registrar otro administrador en una empresa. */
const AddAdminDialog: React.FC<{ company: Company; onClose: () => void; onDone: (msg: string) => void }> = ({
  company,
  onClose,
  onDone,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.createPlatformCompanyAdmin(company.id, { fullName: fullName.trim(), email: email.trim().toLowerCase() });
      onDone(`Administrador ${email.trim()} creado en ${company.name}. Se le envió la contraseña temporal por correo.`);
    } catch (err: any) {
      setError(err.message || 'No se pudo crear el administrador.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-[#0F172A] p-6 space-y-4 shadow-2xl">
        <button type="button" onClick={onClose} aria-label="Cerrar" className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer">
          <X className="w-4 h-4" />
        </button>
        <div>
          <h3 className="text-base font-bold text-white">Nuevo administrador</h3>
          <p className="text-xs text-slate-400">{company.name}: recibirá una contraseña temporal por correo.</p>
        </div>
        <FormField label="Nombre completo *">
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} required className={companyInputClass} />
        </FormField>
        <FormField label="Correo *">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={companyInputClass} />
        </FormField>
        {error && <p className="text-xs text-rose-300">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="btn-brand w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          <span>{saving ? 'Creando...' : 'Crear administrador'}</span>
        </button>
      </form>
    </div>
  );
};

/** Panel de plataforma del SUPERADMIN: empresas, marca, estado, administradores y modo soporte. */
export const PlatformPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { tenant } = useTenant();
  const user = getUser();
  const [view, setView] = useState<View>({ kind: 'list' });
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adminFor, setAdminFor] = useState<Company | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const companiesQuery = useQuery<Company[]>({ queryKey: ['platform-companies'], queryFn: () => api.getPlatformCompanies() });
  const companies = companiesQuery.data || [];

  const toggleStatus = async (company: Company) => {
    const action = company.isActive ? 'desactivar' : 'activar';
    if (
      company.isActive &&
      !window.confirm(`¿Desactivar ${company.name}? Su sitio dejará de responder y sus usuarios no podrán iniciar sesión.`)
    ) {
      return;
    }
    setTogglingId(company.id);
    setError(null);
    try {
      await api.setPlatformCompanyStatus(company.id, !company.isActive);
      await companiesQuery.refetch();
      setNotice(`Empresa ${company.name} ${company.isActive ? 'desactivada' : 'activada'}.`);
    } catch (err: any) {
      setError(err.message || `No se pudo ${action} la empresa.`);
    } finally {
      setTogglingId(null);
    }
  };

  const enterSupport = (company: Company) => {
    setSupportCompany(company);
    navigate('/admin');
  };

  const logout = () => {
    clearSession();
    navigate('/login');
  };

  if (view.kind !== 'list') {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CompanyEditor
          company={view.kind === 'edit' ? view.company : undefined}
          base={tenant}
          onCancel={() => setView({ kind: 'list' })}
          onSaved={(_, message) => {
            setNotice(message);
            setView({ kind: 'list' });
            companiesQuery.refetch();
            queryClient.invalidateQueries({ queryKey: ['tenant'] });
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-brand-accent">Plataforma</span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Empresas</h1>
          <p className="text-xs text-slate-400">
            Sesión: <span className="text-slate-200 font-semibold">{user?.fullName}</span> ({user?.email})
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setNotice(null);
              setView({ kind: 'create' });
            }}
            className="btn-brand flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva empresa</span>
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {notice}
          </span>
          <button onClick={() => setNotice(null)} className="font-semibold hover:text-white cursor-pointer">
            Cerrar
          </button>
        </div>
      )}
      {(error || companiesQuery.isError) && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error || (companiesQuery.error as Error)?.message}
        </div>
      )}

      {companiesQuery.isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-xs text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando empresas...
        </div>
      ) : companies.length === 0 && !companiesQuery.isError ? (
        <div className="text-center py-16 glass-panel rounded-2xl border border-slate-800 space-y-3">
          <Building2 className="w-10 h-10 mx-auto text-slate-400" />
          <h3 className="text-base font-bold text-white">Aún no hay empresas registradas</h3>
          <p className="text-xs text-slate-400">Crea la primera empresa con su marca y su administrador.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {companies.map((c) => (
            <article
              key={c.id}
              className={`rounded-2xl border bg-[#0F172A]/90 overflow-hidden ${c.isActive ? 'border-slate-700/80' : 'border-rose-500/30 opacity-80'}`}
            >
              {/* Franja con los colores de la empresa */}
              <div className="flex h-1.5" aria-hidden="true">
                <span className="flex-1" style={{ background: c.primaryColor }} />
                <span className="flex-1" style={{ background: c.secondaryColor }} />
                <span className="flex-1" style={{ background: c.accentColor }} />
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div style={brandCssVars(c) as React.CSSProperties}>
                    <TenantLogo name={c.name} src={resolveApiAssetUrl(c.logoUrl)} className="w-12 h-12" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-white truncate">{c.name}</h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          c.isActive
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        }`}
                      >
                        {c.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                      {c.isDefault && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border border-slate-600 text-slate-300">
                          Por defecto
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-mono truncate">
                      {c.slug}
                      {c.domains?.length ? ` · ${c.domains.join(', ')}` : ''}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {[c.legalName, c.contactEmail, c.locale, c.currency].filter(Boolean).join(' · ')}
                      {c.createdAt ? ` · Alta ${formatDate(c.createdAt)}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setNotice(null);
                      setView({ kind: 'edit', company: c });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button
                    onClick={() => setAdminFor(c)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Agregar admin
                  </button>
                  <button
                    onClick={() => toggleStatus(c)}
                    disabled={togglingId === c.id || (c.isDefault && c.isActive)}
                    title={c.isDefault && c.isActive ? 'La empresa por defecto no se puede desactivar' : undefined}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      c.isActive
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                    }`}
                  >
                    {togglingId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
                    {c.isActive ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    onClick={() => enterSupport(c)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-semibold cursor-pointer"
                  >
                    <LifeBuoy className="w-3.5 h-3.5" /> Entrar como soporte
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {adminFor && (
        <AddAdminDialog
          company={adminFor}
          onClose={() => setAdminFor(null)}
          onDone={(msg) => {
            setAdminFor(null);
            setNotice(msg);
          }}
        />
      )}
    </div>
  );
};
