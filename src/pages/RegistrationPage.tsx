import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, Camera, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { api, type RegistrationFiles, type RegistrationInfo, type RegistrationPayload } from '../api/client';
import { API_URL } from '../config/branding';
import { TenantLogo } from '../components/TenantLogo';
import { brandCssVars } from '../tenant/theme';
import { PASSWORD_MIN_LENGTH } from './PasswordRecoveryPages';

const DEPARTMENTS = [
  'Ahuachapán', 'Cabañas', 'Chalatenango', 'Cuscatlán', 'La Libertad', 'La Paz', 'La Unión',
  'Morazán', 'San Miguel', 'San Salvador', 'San Vicente', 'Santa Ana', 'Sonsonate', 'Usulután',
];

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-400 transition-colors';

/** 012345678 → 01234567-8 mientras se escribe */
const formatDui = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 9);
  return d.length > 8 ? `${d.slice(0, 8)}-${d.slice(8)}` : d;
};

/** Mismo límite y tipos que el backend (documents.constants) */
const MAX_FILE_MB = 10;
const FILE_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';
const PHOTOS: { key: keyof RegistrationFiles; label: string }[] = [
  { key: 'duiFront', label: 'DUI (frente)' },
  { key: 'duiBack', label: 'DUI (reverso)' },
  { key: 'license', label: 'Licencia de conducir' },
];

const PhotoInput: React.FC<{ id: string; label: string; file?: File; onChange: (f?: File) => void }> = ({ id, label, file, onChange }) => (
  <label htmlFor={id}
    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border border-dashed cursor-pointer transition-colors ${file ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-600 bg-slate-800/60 hover:border-slate-400'}`}>
    {file ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" /> : <Camera className="w-5 h-5 shrink-0 text-slate-400" />}
    <span className="min-w-0">
      <span className="block text-xs font-semibold text-slate-200">{label}</span>
      <span className="block text-[11px] text-slate-500 truncate">{file ? file.name : 'Tomar foto o elegir archivo'}</span>
    </span>
    <input id={id} type="file" accept={FILE_ACCEPT} className="sr-only" onChange={(e) => onChange(e.target.files?.[0])} />
  </label>
);

const Field: React.FC<{ label: string; htmlFor: string; hint?: string; optional?: boolean; children: React.ReactNode }> = ({
  label, htmlFor, hint, optional, children,
}) => (
  <div>
    <label htmlFor={htmlFor} className="block text-xs font-semibold text-slate-300 mb-1.5">
      {label} {optional && <span className="font-normal text-slate-500">(opcional)</span>}
    </label>
    {children}
    {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
  </div>
);

interface FormState {
  dui: string;
  nit: string;
  email: string;
  birthDate: string;
  address: string;
  municipality: string;
  department: string;
  economicActivity: string;
  employerName: string;
  monthlyIncome: string;
  password: string;
  confirm: string;
  privacyAccepted: boolean;
}

/**
 * Página pública del enlace de registro enviado por WhatsApp: el cliente completa sus datos y crea su
 * acceso al portal. La marca sale de la empresa dueña del enlace (no del dominio), porque el enlace de la
 * plantilla de WhatsApp es el mismo para todas las empresas.
 */
export const RegistrationPage: React.FC = () => {
  const { token = '' } = useParams();
  const [info, setInfo] = useState<RegistrationInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    dui: '', nit: '', email: '', birthDate: '', address: '', municipality: '', department: 'San Salvador',
    economicActivity: '', employerName: '', monthlyIncome: '', password: '', confirm: '', privacyAccepted: false,
  });
  const [photos, setPhotos] = useState<Partial<RegistrationFiles>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [doneEmail, setDoneEmail] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .getRegistration(token)
      .then((r) => {
        if (!alive) return;
        setInfo(r);
        setForm((f) => ({
          ...f,
          email: r.customer.email ?? '',
          address: r.customer.address ?? '',
          municipality: r.customer.municipality ?? '',
          department: r.customer.department || f.department,
        }));
      })
      .catch((e) => alive && setLoadError(e.message || 'El enlace de registro no es válido.'));
    return () => {
      alive = false;
    };
  }, [token]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{8}-\d$/.test(form.dui)) return setError('El DUI debe tener el formato 00000000-0.');
    const missingPhotos = PHOTOS.filter((p) => !photos[p.key]).map((p) => p.label);
    if (missingPhotos.length) return setError(`Adjunte la foto de: ${missingPhotos.join(', ')}.`);
    const big = PHOTOS.find((p) => photos[p.key]!.size > MAX_FILE_MB * 1024 * 1024);
    if (big) return setError(`${big.label}: el archivo pesa más de ${MAX_FILE_MB} MB.`);
    if (form.password.length < PASSWORD_MIN_LENGTH) return setError(`La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`);
    if (form.password !== form.confirm) return setError('Las contraseñas no coinciden.');
    if (!form.privacyAccepted) return setError('Debe aceptar el aviso de privacidad para continuar.');
    const payload: RegistrationPayload = {
      dui: form.dui,
      nit: form.nit.trim() || undefined,
      email: form.email.trim(),
      birthDate: form.birthDate || undefined,
      address: form.address.trim(),
      municipality: form.municipality.trim(),
      department: form.department,
      economicActivity: form.economicActivity.trim() || undefined,
      employerName: form.employerName.trim() || undefined,
      monthlyIncome: form.monthlyIncome.trim() ? Number(form.monthlyIncome) : undefined,
      password: form.password,
      privacyAccepted: true,
    };
    setSaving(true);
    try {
      const r = await api.completeRegistration(token, payload, photos as RegistrationFiles);
      setDoneEmail(r.email);
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar. Intente de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const company = info?.company;
  const style = company ? (brandCssVars(company) as React.CSSProperties) : undefined;
  const logo = company?.hasLogo ? `${API_URL}/public/companies/${company.slug}/logo?v=${company.logoVersion}` : undefined;

  return (
    <div className="min-h-[80vh] flex items-start sm:items-center justify-center px-4 py-10" style={style}>
      <div className="w-full max-w-xl glass-panel rounded-3xl border border-slate-700/80 bg-[#0F172A]/90 p-6 sm:p-10 shadow-2xl space-y-7">
        {!info && !loadError && (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Cargando…
          </div>
        )}

        {loadError && (
          <div className="space-y-5 text-center py-6">
            <AlertCircle className="w-10 h-10 mx-auto text-amber-400" />
            <h2 className="text-xl font-black text-white">No se puede usar este enlace</h2>
            <p className="text-sm text-slate-300">{loadError}</p>
            <Link to="/login" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider btn-brand">
              Ir al inicio de sesión <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {info && company && (
          <>
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <TenantLogo name={company.name} src={logo} className="w-14 h-14" textClassName="text-2xl" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-brand-accent">{company.name}</p>
              <h1 className="text-2xl font-black text-white tracking-tight">
                {doneEmail ? '¡Registro completado!' : 'Complete sus datos'}
              </h1>
              {!doneEmail && (
                <p className="text-xs text-slate-400">
                  Hola <span className="text-slate-200 font-semibold">{info.customer.fullName}</span>. Complete su expediente y cree su
                  contraseña para consultar sus cuotas y pagos en el portal de clientes.
                </p>
              )}
            </div>

            {doneEmail ? (
              <div className="space-y-5">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex gap-2">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>
                    Sus datos quedaron registrados. Ingrese al portal con su correo <strong>{doneEmail}</strong> y la contraseña que acaba
                    de crear.
                  </span>
                </div>
                <Link
                  to={`/login?empresa=${encodeURIComponent(company.slug)}`}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider btn-brand"
                >
                  Ingresar al portal <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-6" noValidate>
                <fieldset className="space-y-4">
                  <legend className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Identificación</legend>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="DUI" htmlFor="rg-dui">
                      <input id="rg-dui" inputMode="numeric" required placeholder="00000000-0" value={form.dui}
                        onChange={(e) => set('dui', formatDui(e.target.value))} className={inputClass} />
                    </Field>
                    <Field label="NIT" htmlFor="rg-nit" optional>
                      <input id="rg-nit" placeholder="0000-000000-000-0" value={form.nit}
                        onChange={(e) => set('nit', e.target.value)} className={inputClass} />
                    </Field>
                    <Field label="Fecha de nacimiento" htmlFor="rg-birth" optional>
                      <input id="rg-birth" type="date" value={form.birthDate}
                        onChange={(e) => set('birthDate', e.target.value)} className={inputClass} />
                    </Field>
                    <Field label="Teléfono" htmlFor="rg-phone" hint="Si cambió de número, avísenos por WhatsApp.">
                      <input id="rg-phone" disabled value={info.customer.phoneMasked ?? '—'} className={`${inputClass} opacity-60`} />
                    </Field>
                  </div>
                </fieldset>

                <fieldset className="space-y-3">
                  <legend className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Documentos</legend>
                  <p className="text-[11px] text-slate-500">Fotos claras y legibles del DUI (ambos lados) y de la licencia de conducir. Son obligatorias.</p>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {PHOTOS.map((p) => (
                      <PhotoInput key={p.key} id={`rg-${p.key}`} label={p.label} file={photos[p.key]}
                        onChange={(f) => setPhotos((s) => ({ ...s, [p.key]: f }))} />
                    ))}
                  </div>
                </fieldset>

                <fieldset className="space-y-4">
                  <legend className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Dirección</legend>
                  <Field label="Dirección" htmlFor="rg-address">
                    <input id="rg-address" required autoComplete="street-address" placeholder="Colonia, calle, número de casa"
                      value={form.address} onChange={(e) => set('address', e.target.value)} className={inputClass} />
                  </Field>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Municipio" htmlFor="rg-mun">
                      <input id="rg-mun" required value={form.municipality}
                        onChange={(e) => set('municipality', e.target.value)} className={inputClass} />
                    </Field>
                    <Field label="Departamento" htmlFor="rg-dep">
                      <select id="rg-dep" value={form.department} onChange={(e) => set('department', e.target.value)} className={inputClass}>
                        {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                      </select>
                    </Field>
                  </div>
                </fieldset>

                <fieldset className="space-y-4">
                  <legend className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Trabajo</legend>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Ocupación o actividad" htmlFor="rg-act" optional>
                      <input id="rg-act" value={form.economicActivity}
                        onChange={(e) => set('economicActivity', e.target.value)} className={inputClass} />
                    </Field>
                    <Field label="Lugar de trabajo" htmlFor="rg-emp" optional>
                      <input id="rg-emp" value={form.employerName}
                        onChange={(e) => set('employerName', e.target.value)} className={inputClass} />
                    </Field>
                    <Field label="Ingreso mensual (USD)" htmlFor="rg-inc" optional>
                      <input id="rg-inc" type="number" min={0} step="0.01" inputMode="decimal" value={form.monthlyIncome}
                        onChange={(e) => set('monthlyIncome', e.target.value)} className={inputClass} />
                    </Field>
                  </div>
                </fieldset>

                <fieldset className="space-y-4">
                  <legend className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Acceso al portal</legend>
                  <Field label="Correo electrónico" htmlFor="rg-email" hint="Con este correo ingresará al portal y recibirá sus avisos.">
                    <input id="rg-email" type="email" required autoComplete="email" value={form.email}
                      onChange={(e) => set('email', e.target.value)} className={inputClass} />
                  </Field>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label={`Contraseña (mínimo ${PASSWORD_MIN_LENGTH})`} htmlFor="rg-pass">
                      <input id="rg-pass" type="password" required minLength={PASSWORD_MIN_LENGTH} autoComplete="new-password"
                        value={form.password} onChange={(e) => set('password', e.target.value)} className={inputClass} />
                    </Field>
                    <Field label="Confirmar contraseña" htmlFor="rg-confirm">
                      <input id="rg-confirm" type="password" required autoComplete="new-password"
                        value={form.confirm} onChange={(e) => set('confirm', e.target.value)} className={inputClass} />
                    </Field>
                  </div>
                </fieldset>

                <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={form.privacyAccepted} onChange={(e) => set('privacyAccepted', e.target.checked)}
                    className="mt-0.5 accent-current" />
                  <span>
                    Autorizo a <strong>{company.name}</strong> a tratar mis datos personales para administrar mi crédito y enviarme
                    avisos de cobro por WhatsApp y correo.
                  </span>
                </label>

                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2" role="alert">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button type="submit" disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider btn-brand shadow-md disabled:opacity-50 cursor-pointer">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>{saving ? 'Guardando…' : 'Guardar mis datos y crear acceso'}</span>
                </button>
                <p className="text-[11px] text-center text-slate-500">
                  Enlace personal, válido hasta el {new Date(info.expiresAt).toLocaleDateString('es-SV')}.
                  {company.contactPhone && <> ¿Dudas? Llame o escriba al {company.contactPhone}.</>}
                </p>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};
