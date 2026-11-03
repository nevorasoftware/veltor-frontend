import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Building2, CheckCircle2, Loader2 } from 'lucide-react';
import { api, resolveApiAssetUrl } from '../../api/client';
import { useTenant } from '../../tenant/TenantContext';
import { setSupportCompany } from '../../tenant/tenantStore';
import type { Company } from '../../tenant/types';
import {
  CompanyFields,
  companyToForm,
  formToBranding,
  validateCompanyForm,
  type CompanyFormState,
  type PendingLogo,
} from '../company/CompanyFields';

/** Pestaña "Mi empresa": el ADMIN edita la marca, el logo y los contactos de su empresa. */
export const MyCompanyTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { refresh, isSupport } = useTenant();
  const companyQuery = useQuery<Company>({ queryKey: ['my-company'], queryFn: () => api.getMyCompany() });

  const [form, setForm] = useState<CompanyFormState | null>(null);
  const [pendingLogo, setPendingLogo] = useState<PendingLogo | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (companyQuery.data) setForm(companyToForm(companyQuery.data));
  }, [companyQuery.data]);

  if (companyQuery.isLoading || (!form && !companyQuery.isError)) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400 p-6">
        <Loader2 className="w-4 h-4 animate-spin" /> Cargando los datos de la empresa...
      </div>
    );
  }
  if (companyQuery.isError || !form) {
    return (
      <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
        <AlertCircle className="w-4 h-4 shrink-0" />
        {(companyQuery.error as Error)?.message || 'No fue posible cargar la empresa.'}
      </div>
    );
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const problems = validateCompanyForm(form);
    setErrors(problems);
    if (problems.length) return;

    setSaving(true);
    try {
      // La empresa no puede cambiar su slug, su estado ni sus dominios: solo marca y contactos
      let updated = await api.updateMyCompany(formToBranding(form));
      if (pendingLogo) updated = await api.uploadMyCompanyLogo(pendingLogo.base64, pendingLogo.mime);
      setPendingLogo(null);
      queryClient.setQueryData(['my-company'], updated);
      if (isSupport && updated) setSupportCompany(updated);
      await refresh();
      setFeedback('Los datos de la empresa se guardaron. El sitio ya muestra la nueva marca.');
    } catch (err: any) {
      setErrors([err.message || 'No se pudieron guardar los cambios.']);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="glass-panel rounded-2xl border border-slate-700/80 bg-[#0F172A]/90 p-6 sm:p-8 space-y-6 max-w-5xl">
      <div className="pb-4 border-b border-slate-800">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Building2 className="w-5 h-5 text-brand-accent" />
          <span>Mi empresa</span>
        </h3>
        <p className="text-xs text-slate-400">
          Marca, logo, colores y datos de contacto que ven tus clientes en el sitio, el portal y los documentos.
        </p>
      </div>

      <CompanyFields
        form={form}
        onChange={(patch) => setForm((f) => (f ? { ...f, ...patch } : f))}
        logoSrc={resolveApiAssetUrl(companyQuery.data?.logoUrl)}
        pendingLogo={pendingLogo}
        onLogoChange={setPendingLogo}
        onError={(msg) => setErrors([msg])}
      />

      {errors.length > 0 && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
          {errors.map((m) => (
            <p key={m} className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {m}
            </p>
          ))}
        </div>
      )}
      {feedback && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {feedback}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="btn-brand w-full py-3 px-6 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
        <span>{saving ? 'Guardando...' : 'Guardar cambios de la empresa'}</span>
      </button>
    </form>
  );
};
