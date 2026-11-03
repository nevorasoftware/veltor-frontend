import React, { useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { api, resolveApiAssetUrl } from '../../api/client';
import type { Company, Tenant } from '../../tenant/types';
import {
  CompanyFields,
  companyToForm,
  formToBranding,
  parseDomains,
  validateCompanyForm,
  type CompanyFormState,
  type PendingLogo,
} from '../company/CompanyFields';

interface CompanyEditorProps {
  /** Empresa a editar; sin ella se crea una nueva. */
  company?: Company;
  /** Empresa base de la que se toman colores y formatos iniciales al crear. */
  base: Tenant;
  onCancel: () => void;
  onSaved: (company: Company, message: string) => void;
}

/** Formulario de alta o edición de una empresa (solo SUPERADMIN). */
export const CompanyEditor: React.FC<CompanyEditorProps> = ({ company, base, onCancel, onSaved }) => {
  const isNew = !company;
  const [form, setForm] = useState<CompanyFormState>(() => (company ? companyToForm(company) : companyToForm(base, true)));
  const [pendingLogo, setPendingLogo] = useState<PendingLogo | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problems = validateCompanyForm(form, { withSlug: true, withAdmin: isNew });
    setErrors(problems);
    if (problems.length) return;

    setSaving(true);
    try {
      const branding = formToBranding(form);
      const domains = parseDomains(form.domains);
      let saved: Company;
      if (isNew) {
        saved = await api.createPlatformCompany({
          ...branding,
          slug: form.slug,
          domains,
          adminEmail: form.adminEmail.trim().toLowerCase(),
          adminName: form.adminName.trim(),
        });
      } else {
        saved = await api.updatePlatformCompany(company.id, { ...branding, slug: form.slug, domains });
      }
      if (pendingLogo) {
        try {
          saved = await api.uploadPlatformCompanyLogo(saved.id, pendingLogo.base64, pendingLogo.mime);
        } catch (err: any) {
          // La empresa ya quedó guardada: se avisa del logo sin perder el resto
          onSaved(saved, `La empresa se guardó, pero el logo no: ${err.message}`);
          return;
        }
      }
      onSaved(
        saved,
        isNew
          ? `Empresa "${saved.name}" creada. Se envió la contraseña temporal a ${form.adminEmail.trim()}.`
          : `Empresa "${saved.name}" actualizada.`,
      );
    } catch (err: any) {
      setErrors([err.message || 'No se pudo guardar la empresa.']);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <button type="button" onClick={onCancel} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver a la lista
          </button>
          <h2 className="text-xl font-black text-white mt-1">{isNew ? 'Nueva empresa' : `Editar ${company.name}`}</h2>
        </div>
      </div>

      <CompanyFields
        form={form}
        onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        logoSrc={resolveApiAssetUrl(company?.logoUrl)}
        pendingLogo={pendingLogo}
        onLogoChange={setPendingLogo}
        onError={(msg) => setErrors([msg])}
        platform
        withAdmin={isNew}
        autoSlug={isNew}
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

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="submit"
          disabled={saving}
          className="btn-brand flex-1 py-3 px-6 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{saving ? 'Guardando...' : isNew ? 'Crear empresa y primer administrador' : 'Guardar cambios'}</span>
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="py-3 px-6 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 cursor-pointer"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
};
