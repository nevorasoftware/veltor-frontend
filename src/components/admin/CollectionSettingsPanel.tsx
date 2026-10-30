import React, { useEffect, useState } from 'react';
import { AlertCircle, BellRing, CheckCircle2, ExternalLink, HardDrive, Play } from 'lucide-react';
import { api } from '../../api/client';
import type { CollectionSettings, LateFeeType, StorageStatus } from '../../api/client';

export const LATE_FEE_LABELS: Record<LateFeeType, string> = {
  PER_DAY: 'Mora por días de atraso',
  PER_INSTALLMENT: 'Cuota de mora (monto fijo)',
  NONE: 'Sin mora',
};

const inputClass =
  'w-full px-3 py-2 bg-slate-900 border border-slate-600 focus:border-white focus:ring-1 focus:ring-white rounded-xl text-sm font-mono text-white outline-none';

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <label className="block space-y-1">
    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
    {children}
    {hint && <span className="block text-[11px] text-slate-500">{hint}</span>}
  </label>
);

/** Parámetros de cobranza (recordatorios, días de gracia, mora) y estado del almacenamiento en Google Drive. */
export const CollectionSettingsPanel: React.FC = () => {
  const [form, setForm] = useState<CollectionSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storage, setStorage] = useState<StorageStatus | null>(null);

  useEffect(() => {
    api.getCollectionSettings().then(setForm).catch((err) => setError(err.message));
    api.getStorageStatus().then(setStorage).catch(() => {});
  }, []);

  const set = <K extends keyof CollectionSettings>(key: K, value: CollectionSettings[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));
  const num = (v: string) => (v === '' ? 0 : Number(v));

  const flash = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 6000);
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const res = await api.updateCollectionSettings(form);
      setForm(res);
      flash(res.message);
    } catch (err: any) {
      setError(err.message || 'No se pudieron guardar los parámetros.');
    } finally {
      setSaving(false);
    }
  };

  const runNow = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await api.runCollectionDaemon();
      flash(
        `Revisión ejecutada: ${res.checked} crédito(s), ${res.reminders} recordatorio(s) y ${res.overdueNotices} aviso(s) de mora enviados.`,
      );
    } catch (err: any) {
      setError(err.message || 'No se pudo ejecutar la revisión.');
    } finally {
      setRunning(false);
    }
  };

  if (!form) {
    return error ? (
      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">{error}</div>
    ) : null;
  }

  const example = (() => {
    const day = form.defaultPaymentDay ?? 10;
    const reminder = day - form.reminderDaysBefore;
    const moraFrom = day + form.graceDays + 1;
    return `Ej.: cuota que vence el ${day}: recordatorio el día ${reminder >= 1 ? reminder : `${form.reminderDaysBefore} días antes`}, gracia hasta el ${day + form.graceDays} y mora desde el ${moraFrom} (${LATE_FEE_LABELS.PER_DAY.toLowerCase()}: $${form.lateFeePerDayAmount.toFixed(2)} × día; cuota de mora: $${form.lateFeePerInstallmentAmount.toFixed(2)}).`;
  })();

  return (
    <>
      <div className="space-y-4 p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <BellRing className="w-4 h-4 text-slate-300" />
            <span>Cobranza: Recordatorios, Días de Gracia y Mora</span>
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            Cada día a las 8:00 el sistema revisa los créditos activos: envía el recordatorio de pago antes del vencimiento y,
            al terminar los días de gracia, el aviso de cuota vencida con el saldo de la cuota y la mora acumulada. El día de
            pago y la mora se fijan en cada crédito al formalizarlo; aquí se definen los valores sugeridos.
          </p>
        </div>

        {feedback && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Recordatorio (n días antes)" hint="0 = el mismo día del vencimiento">
            <input type="number" min={0} max={30} value={form.reminderDaysBefore} onChange={(e) => set('reminderDaysBefore', num(e.target.value))} className={inputClass} />
          </Field>
          <Field label="Días de gracia (m)" hint="Sin mora durante estos días; aplica a créditos nuevos">
            <input type="number" min={0} max={30} value={form.graceDays} onChange={(e) => set('graceDays', num(e.target.value))} className={inputClass} />
          </Field>
          <Field label="Repetir aviso de mora cada" hint="Días; 0 = enviar el aviso una sola vez">
            <input type="number" min={0} max={30} value={form.overdueReminderEveryDays} onChange={(e) => set('overdueReminderEveryDays', num(e.target.value))} className={inputClass} />
          </Field>
          <Field label="Día de pago sugerido" hint="1 a 28; vacío = mismo día del desembolso">
            <input
              type="number"
              min={1}
              max={28}
              value={form.defaultPaymentDay ?? ''}
              onChange={(e) => set('defaultPaymentDay', e.target.value === '' ? null : Number(e.target.value))}
              placeholder="Ej. 10"
              className={inputClass}
            />
          </Field>
          <Field label="Mora por día de atraso (USD)">
            <input type="number" min={0} step="0.01" value={form.lateFeePerDayAmount} onChange={(e) => set('lateFeePerDayAmount', num(e.target.value))} className={inputClass} />
          </Field>
          <Field label="Cuota de mora (USD)" hint="Monto fijo por cada cuota vencida">
            <input type="number" min={0} step="0.01" value={form.lateFeePerInstallmentAmount} onChange={(e) => set('lateFeePerInstallmentAmount', num(e.target.value))} className={inputClass} />
          </Field>
          <Field label="Tipo de mora sugerido" hint="Se puede cambiar en cada crédito">
            <select value={form.defaultLateFeeType} onChange={(e) => set('defaultLateFeeType', e.target.value as LateFeeType)} className={inputClass}>
              {(Object.keys(LATE_FEE_LABELS) as LateFeeType[]).map((k) => (
                <option key={k} value={k}>
                  {LATE_FEE_LABELS[k]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <p className="text-[11px] text-slate-400">{example}</p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex-1 py-3 px-6 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-100 hover:bg-white text-slate-950 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>{saving ? 'Guardando...' : 'Guardar Parámetros de Cobranza'}</span>
            <CheckCircle2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={runNow}
            disabled={running}
            className="py-3 px-6 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            <span>{running ? 'Revisando...' : 'Ejecutar revisión ahora'}</span>
          </button>
        </div>
      </div>

      {storage && (
        <div className="space-y-2 p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-slate-300" />
            <span>Almacenamiento de Fotos y Documentos</span>
          </h4>
          {storage.enabled && !storage.error ? (
            <p className="text-xs text-slate-400">
              Google Drive activo. Carpeta <span className="font-mono text-slate-200">{storage.rootFolder}</span> con
              subcarpetas <span className="font-mono text-slate-200">Vehiculos</span>,{' '}
              <span className="font-mono text-slate-200">Creditos/&lt;número de crédito&gt;</span> y{' '}
              <span className="font-mono text-slate-200">Clientes</span>.{' '}
              {storage.rootFolderUrl && (
                <a href={storage.rootFolderUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-400 hover:underline">
                  Abrir en Drive <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </p>
          ) : storage.enabled ? (
            <p className="text-xs text-rose-300">Google Drive configurado pero sin acceso: {storage.error}</p>
          ) : (
            <p className="text-xs text-amber-300">
              Google Drive no está activo: los archivos se guardan en el servidor. Para activarlo configure
              STORAGE_DRIVER=gdrive y un token de Google con permiso de Drive.
            </p>
          )}
        </div>
      )}
    </>
  );
};
