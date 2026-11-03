import React, { useMemo, useState } from 'react';
import { ImagePlus, Plus, Trash2, X } from 'lucide-react';
import type { BankAccount, Company, CompanyBrandingInput, Tenant } from '../../tenant/types';
import { brandCssVars, isHexColor } from '../../tenant/theme';

// -----------------------------------------------------------------------------
// Estado del formulario de empresa (compartido por /plataforma y "Mi empresa")
// -----------------------------------------------------------------------------

export interface CompanyFormState {
  name: string;
  slug: string;
  legalName: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  contactPhone: string;
  contactEmail: string;
  contactHours: string;
  paymentsEmail: string;
  paymentsWhatsapp: string;
  bankAccounts: BankAccount[];
  bankAccountHolder: string;
  locale: string;
  currency: string;
  timezone: string;
  /** Dominios separados por coma (solo plataforma). */
  domains: string;
  /** Primer administrador (solo al crear). */
  adminName: string;
  adminEmail: string;
}

export interface PendingLogo {
  base64: string;
  mime: string;
  previewUrl: string;
}

export const LOGO_MAX_BYTES = 1024 * 1024;
export const LOGO_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

/** Formulario a partir de una empresa existente (o de la empresa base para una nueva). */
export function companyToForm(c: Partial<Company> | Tenant | null | undefined, blankIdentity = false): CompanyFormState {
  const company = (c || {}) as Partial<Company>;
  return {
    name: blankIdentity ? '' : company.name || '',
    slug: blankIdentity ? '' : company.slug || '',
    legalName: blankIdentity ? '' : company.legalName || '',
    tagline: blankIdentity ? '' : company.tagline || '',
    primaryColor: company.primaryColor || '',
    secondaryColor: company.secondaryColor || '',
    accentColor: company.accentColor || '',
    contactPhone: blankIdentity ? '' : company.contactPhone || '',
    contactEmail: blankIdentity ? '' : company.contactEmail || '',
    contactHours: blankIdentity ? '' : company.contactHours || '',
    paymentsEmail: blankIdentity ? '' : company.paymentsEmail || '',
    paymentsWhatsapp: blankIdentity ? '' : company.paymentsWhatsapp || '',
    bankAccounts: blankIdentity ? [] : Array.isArray(company.bankAccounts) ? company.bankAccounts.map((a) => ({ ...a })) : [],
    bankAccountHolder: blankIdentity ? '' : company.bankAccountHolder || '',
    locale: company.locale || '',
    currency: company.currency || '',
    timezone: company.timezone || '',
    domains: blankIdentity ? '' : (company.domains || []).join(', '),
    adminName: '',
    adminEmail: '',
  };
}

const opt = (v: string) => (v.trim() === '' ? null : v.trim());

/** Campos de marca y contactos listos para la API (vacío → null). */
export function formToBranding(f: CompanyFormState): CompanyBrandingInput {
  return {
    name: f.name.trim(),
    legalName: opt(f.legalName),
    tagline: opt(f.tagline),
    primaryColor: f.primaryColor,
    secondaryColor: f.secondaryColor,
    accentColor: f.accentColor,
    contactPhone: opt(f.contactPhone),
    contactEmail: opt(f.contactEmail),
    contactHours: opt(f.contactHours),
    paymentsEmail: opt(f.paymentsEmail),
    paymentsWhatsapp: opt(f.paymentsWhatsapp),
    bankAccounts: f.bankAccounts
      .map((a) => ({ bank: a.bank.trim(), detail: a.detail.trim() }))
      .filter((a) => a.bank || a.detail),
    bankAccountHolder: opt(f.bankAccountHolder),
    locale: f.locale.trim(),
    currency: f.currency.trim().toUpperCase(),
    timezone: f.timezone.trim(),
  };
}

export const parseDomains = (value: string) =>
  value
    .split(/[\s,;]+/)
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

export const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

export const isValidSlug = (slug: string) => /^[a-z0-9-]{3,40}$/.test(slug);

/** Errores de validación del formulario (vacío = válido). */
export function validateCompanyForm(f: CompanyFormState, opts: { withSlug?: boolean; withAdmin?: boolean } = {}): string[] {
  const errors: string[] = [];
  if (!f.name.trim()) errors.push('El nombre de la empresa es obligatorio.');
  if (opts.withSlug && !isValidSlug(f.slug)) errors.push('El identificador (slug) debe tener de 3 a 40 caracteres: minúsculas, números y guiones.');
  (['primaryColor', 'secondaryColor', 'accentColor'] as const).forEach((k) => {
    if (!isHexColor(f[k])) errors.push('Los colores deben tener el formato #RRGGBB.');
  });
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (f.contactEmail.trim() && !emailRe.test(f.contactEmail.trim())) errors.push('El correo de contacto no es válido.');
  if (f.paymentsEmail.trim() && !emailRe.test(f.paymentsEmail.trim())) errors.push('El correo de pagos no es válido.');
  if (!f.locale.trim() || !f.currency.trim() || !f.timezone.trim()) errors.push('Locale, moneda y zona horaria son obligatorios.');
  if (f.currency.trim()) {
    try {
      new Intl.NumberFormat(f.locale.trim() || undefined, { style: 'currency', currency: f.currency.trim().toUpperCase() });
    } catch {
      errors.push('La moneda o el locale no son válidos.');
    }
  }
  if (opts.withAdmin) {
    if (!f.adminName.trim()) errors.push('El nombre del primer administrador es obligatorio.');
    if (!emailRe.test(f.adminEmail.trim())) errors.push('El correo del primer administrador no es válido.');
  }
  return [...new Set(errors)];
}

/** Lee el logo elegido y lo valida (png/jpeg/webp/svg, máximo 1 MB). Devuelve el base64 sin el prefijo data:. */
export function readLogoFile(file: File): Promise<PendingLogo> {
  return new Promise((resolve, reject) => {
    if (!LOGO_MIME_TYPES.includes(file.type)) {
      reject(new Error('El logo debe ser PNG, JPG, WEBP o SVG.'));
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      reject(new Error('El logo no puede pesar más de 1 MB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      resolve({ base64: dataUrl.slice(dataUrl.indexOf(',') + 1), mime: file.type, previewUrl: dataUrl });
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo del logo.'));
    reader.readAsDataURL(file);
  });
}

// -----------------------------------------------------------------------------
// Componentes de formulario
// -----------------------------------------------------------------------------

export const companyInputClass =
  'w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white outline-none focus:border-white placeholder-slate-500';

export const FormField: React.FC<{ label: string; hint?: string; children: React.ReactNode; className?: string }> = ({
  label,
  hint,
  children,
  className = '',
}) => (
  <label className={`block space-y-1 ${className}`}>
    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
    {children}
    {hint && <span className="block text-[11px] text-slate-500">{hint}</span>}
  </label>
);

export const FormSection: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({
  title,
  description,
  children,
}) => (
  <section className="space-y-4 p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60">
    <div>
      <h4 className="text-sm font-bold text-white">{title}</h4>
      {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
    </div>
    {children}
  </section>
);

const ColorField: React.FC<{ label: string; hint: string; value: string; onChange: (v: string) => void }> = ({
  label,
  hint,
  value,
  onChange,
}) => {
  const [text, setText] = useState(value);
  // Sincroniza el texto cuando el color cambia desde el selector
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setText(value);
  }
  return (
    <FormField label={label} hint={hint}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={isHexColor(value) ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="h-10 w-12 shrink-0 rounded-lg border border-slate-700 bg-slate-900 cursor-pointer p-0.5"
        />
        <input
          type="text"
          value={text}
          maxLength={7}
          onChange={(e) => {
            const v = e.target.value.trim();
            setText(v);
            if (isHexColor(v)) onChange(v.toLowerCase());
          }}
          placeholder="#RRGGBB"
          className={`${companyInputClass} font-mono ${text && !isHexColor(text) ? 'border-rose-500' : ''}`}
        />
      </div>
    </FormField>
  );
};

/** Vista previa en vivo de los colores y el logo. */
export const BrandPreview: React.FC<{ form: CompanyFormState; logoSrc?: string }> = ({ form, logoSrc }) => {
  const style = useMemo(() => brandCssVars(form) as React.CSSProperties, [form]);
  const name = form.name.trim() || 'Nombre de la empresa';
  return (
    <div style={style} className="rounded-2xl overflow-hidden border border-slate-700 bg-[#0B132B]" aria-label="Vista previa">
      <div className="brand-nav flex items-center gap-3 px-4 py-3">
        {logoSrc ? (
          <img src={logoSrc} alt="" className="w-8 h-8 rounded-lg object-contain bg-white/5" />
        ) : (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black bg-brand-accent text-brand-on-accent">
            {name[0].toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <div className="text-sm font-black uppercase tracking-widest truncate">{name}</div>
          {form.tagline && <div className="text-[10px] opacity-70 truncate">{form.tagline}</div>}
        </div>
      </div>
      <div className="p-4 space-y-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-brand-accent">Encabezado de sección</span>
        <div className="rounded-xl p-3 bg-brand-secondary text-brand-on-secondary text-xs">
          Tarjeta con el color secundario
        </div>
        <div className="flex gap-2">
          <span className="btn-brand px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider">Botón principal</span>
          <span className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-brand-accent/50 bg-brand-accent/15 text-white">
            Pestaña activa
          </span>
        </div>
      </div>
    </div>
  );
};

/** Selector de logo con vista previa. */
export const LogoPicker: React.FC<{
  currentSrc?: string;
  pending: PendingLogo | null;
  onChange: (logo: PendingLogo | null) => void;
  onError: (message: string) => void;
}> = ({ currentSrc, pending, onChange, onError }) => {
  const shown = pending?.previewUrl || currentSrc;
  return (
    <div className="flex items-center gap-4">
      <div className="w-20 h-20 rounded-2xl border border-slate-700 bg-slate-900 flex items-center justify-center overflow-hidden shrink-0">
        {shown ? <img src={shown} alt="Logo" className="w-full h-full object-contain" /> : <ImagePlus className="w-6 h-6 text-slate-500" />}
      </div>
      <div className="space-y-2">
        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-slate-200 cursor-pointer">
          <ImagePlus className="w-4 h-4" />
          <span>{shown ? 'Cambiar logo' : 'Subir logo'}</span>
          <input
            type="file"
            accept={LOGO_MIME_TYPES.join(',')}
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              try {
                onChange(await readLogoFile(file));
              } catch (err: any) {
                onError(err.message);
              }
            }}
          />
        </label>
        {pending && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-3 h-3" /> Descartar logo nuevo
          </button>
        )}
        <p className="text-[11px] text-slate-500">PNG, JPG, WEBP o SVG. Máximo 1 MB. Se guarda en la base de datos.</p>
      </div>
    </div>
  );
};

const BankAccountsEditor: React.FC<{ value: BankAccount[]; onChange: (v: BankAccount[]) => void }> = ({ value, onChange }) => (
  <div className="space-y-2">
    {value.length === 0 && <p className="text-xs text-slate-500">Sin cuentas registradas.</p>}
    {value.map((acc, i) => (
      <div key={i} className="flex flex-col sm:flex-row gap-2">
        <input
          value={acc.bank}
          onChange={(e) => onChange(value.map((a, j) => (j === i ? { ...a, bank: e.target.value } : a)))}
          placeholder="Banco"
          aria-label={`Banco de la cuenta ${i + 1}`}
          className={`${companyInputClass} sm:w-48`}
        />
        <input
          value={acc.detail}
          onChange={(e) => onChange(value.map((a, j) => (j === i ? { ...a, detail: e.target.value } : a)))}
          placeholder="Tipo y número de cuenta"
          aria-label={`Detalle de la cuenta ${i + 1}`}
          className={companyInputClass}
        />
        <button
          type="button"
          onClick={() => onChange(value.filter((_, j) => j !== i))}
          aria-label={`Quitar la cuenta ${i + 1}`}
          className="p-2 rounded-xl text-rose-300 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 cursor-pointer self-start sm:self-auto"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    ))}
    <button
      type="button"
      onClick={() => onChange([...value, { bank: '', detail: '' }])}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-slate-200 cursor-pointer"
    >
      <Plus className="w-3.5 h-3.5" /> Agregar cuenta
    </button>
  </div>
);

const supported = (key: 'timeZone' | 'currency'): string[] => {
  try {
    return (Intl as any).supportedValuesOf?.(key) ?? [];
  } catch {
    return [];
  }
};

interface CompanyFieldsProps {
  form: CompanyFormState;
  onChange: (patch: Partial<CompanyFormState>) => void;
  logoSrc?: string;
  pendingLogo: PendingLogo | null;
  onLogoChange: (logo: PendingLogo | null) => void;
  onError: (message: string) => void;
  /** Muestra slug y dominios (solo el superadmin). */
  platform?: boolean;
  /** Muestra los datos del primer administrador (solo al crear). */
  withAdmin?: boolean;
  /** El slug se genera a partir del nombre mientras no se edite a mano. */
  autoSlug?: boolean;
}

/** Campos de marca, colores, logo, contactos, cuentas y formatos de una empresa. */
export const CompanyFields: React.FC<CompanyFieldsProps> = ({
  form,
  onChange,
  logoSrc,
  pendingLogo,
  onLogoChange,
  onError,
  platform = false,
  withAdmin = false,
  autoSlug = false,
}) => {
  const [slugTouched, setSlugTouched] = useState(!autoSlug);
  const timeZones = useMemo(() => supported('timeZone'), []);
  const currencies = useMemo(() => supported('currency'), []);
  const text = (key: keyof CompanyFormState) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange({ [key]: e.target.value } as Partial<CompanyFormState>),
  });

  return (
    <div className="space-y-5">
      <FormSection title="Identidad" description="Nombre comercial, razón social y lema que se muestran en el sitio.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Nombre comercial *">
            <input
              value={form.name}
              onChange={(e) =>
                onChange({ name: e.target.value, ...(platform && !slugTouched ? { slug: slugify(e.target.value) } : {}) })
              }
              className={companyInputClass}
              required
            />
          </FormField>
          {platform && (
            <FormField label="Identificador (slug) *" hint="Se usa en ?empresa=slug y en las carpetas de Drive.">
              <input
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  onChange({ slug: e.target.value.toLowerCase() });
                }}
                className={`${companyInputClass} font-mono`}
                required
              />
            </FormField>
          )}
          <FormField label="Razón social">
            <input {...text('legalName')} className={companyInputClass} />
          </FormField>
          <FormField label="Lema" className={platform ? '' : 'sm:col-span-2'}>
            <input {...text('tagline')} className={companyInputClass} />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Logo y colores" description="Se aplican al sitio público, al panel y al portal del cliente.">
        <LogoPicker currentSrc={logoSrc} pending={pendingLogo} onChange={onLogoChange} onError={onError} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-4">
            <ColorField label="Color primario" hint="Barra de navegación y pie de página" value={form.primaryColor} onChange={(v) => onChange({ primaryColor: v })} />
            <ColorField label="Color secundario" hint="Superficies y tarjetas de marca" value={form.secondaryColor} onChange={(v) => onChange({ secondaryColor: v })} />
            <ColorField label="Color de acento" hint="Botones principales, pestañas y encabezados" value={form.accentColor} onChange={(v) => onChange({ accentColor: v })} />
          </div>
          <BrandPreview form={form} logoSrc={pendingLogo?.previewUrl || logoSrc} />
        </div>
      </FormSection>

      <FormSection title="Contacto" description="Se muestra en el pie de página. Los campos vacíos no se muestran.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Teléfono">
            <input {...text('contactPhone')} type="tel" className={companyInputClass} />
          </FormField>
          <FormField label="Correo">
            <input {...text('contactEmail')} type="email" className={companyInputClass} />
          </FormField>
          <FormField label="Horario de atención">
            <input {...text('contactHours')} className={companyInputClass} />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Instrucciones de pago" description="Aparecen en el portal del cliente.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Correo para comprobantes">
            <input {...text('paymentsEmail')} type="email" className={companyInputClass} />
          </FormField>
          <FormField label="WhatsApp para comprobantes">
            <input {...text('paymentsWhatsapp')} type="tel" className={companyInputClass} />
          </FormField>
          <FormField label="Titular de las cuentas" className="sm:col-span-2">
            <input {...text('bankAccountHolder')} className={companyInputClass} />
          </FormField>
        </div>
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Cuentas bancarias</span>
          <BankAccountsEditor value={form.bankAccounts} onChange={(bankAccounts) => onChange({ bankAccounts })} />
        </div>
      </FormSection>

      <FormSection title="Formatos" description="Locale (p. ej. es-SV), moneda ISO 4217 y zona horaria IANA para montos y fechas.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Locale *">
            <input {...text('locale')} className={`${companyInputClass} font-mono`} />
          </FormField>
          <FormField label="Moneda *">
            <input {...text('currency')} list="company-currencies" className={`${companyInputClass} font-mono uppercase`} />
            <datalist id="company-currencies">
              {currencies.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </FormField>
          <FormField label="Zona horaria *">
            <input {...text('timezone')} list="company-timezones" className={`${companyInputClass} font-mono`} />
            <datalist id="company-timezones">
              {timeZones.map((tz) => (
                <option key={tz} value={tz} />
              ))}
            </datalist>
          </FormField>
        </div>
      </FormSection>

      {platform && (
        <FormSection title="Dominios" description="Hostnames que abren directamente esta empresa (sin ?empresa=). Separe con comas.">
          <input {...text('domains')} className={`${companyInputClass} font-mono`} />
        </FormSection>
      )}

      {withAdmin && (
        <FormSection
          title="Primer administrador"
          description="Recibirá por correo una contraseña temporal y deberá cambiarla al ingresar."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Nombre completo *">
              <input {...text('adminName')} className={companyInputClass} required />
            </FormField>
            <FormField label="Correo *">
              <input {...text('adminEmail')} type="email" className={companyInputClass} required />
            </FormField>
          </div>
        </FormSection>
      )}
    </div>
  );
};
