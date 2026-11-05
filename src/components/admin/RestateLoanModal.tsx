import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Eye, Loader2, RefreshCcw, X } from 'lucide-react';
import { api, type RestateLoanPayload, type RestateLoanResult } from '../../api/client';
import { formatDate, formatMoney } from '../../utils/format';

const inputClass =
  'w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-slate-400';
const num = (v: string) => (v.trim() === '' ? undefined : Number(v));
const d10 = (v: unknown) => String(v ?? '').slice(0, 10);

/**
 * Rehacer crédito / actualizar condiciones (solo ADMIN). Siempre se previsualiza primero (dryRun) y se aplica
 * exactamente lo previsualizado; cualquier cambio en el formulario obliga a previsualizar de nuevo.
 */
export const RestateLoanModal: React.FC<{ loan: any; onClose: () => void; onDone: () => void }> = ({ loan, onClose, onDone }) => {
  const [f, setF] = useState({
    vehiclePrice: String(Number(loan.vehiclePrice ?? 0) || ''),
    principal: String(Number(loan.originalPrincipal ?? 0) || ''),
    annualRate: String(+(Number(loan.monthlyRate) * 1200).toFixed(4)),
    termMonths: String(loan.termCount ?? ''),
    firstPaymentDate: d10(loan.firstDueDate),
    insuranceMonthly: loan.insuranceMonthly ? String(Number(loan.insuranceMonthly)) : '',
    payments: 'KEEP' as 'KEEP' | 'REVERSE_ALL',
    markPaidThrough: '',
    reason: '',
  });
  const [preview, setPreview] = useState<RestateLoanResult | null>(null);
  const [busy, setBusy] = useState<'preview' | 'apply' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<RestateLoanResult | null>(null);

  const set = (k: keyof typeof f, v: string) => {
    setF((s) => ({ ...s, [k]: v, ...(k === 'payments' && v === 'KEEP' ? { markPaidThrough: '' } : {}) }));
    setPreview(null);
  };

  // Solo se envía lo que cambió respecto del crédito actual
  const payload = (): RestateLoanPayload => {
    const p: RestateLoanPayload = { reason: f.reason.trim(), payments: f.payments };
    const changed = (a: number | undefined, b: number) => a !== undefined && Math.abs(a - b) > 1e-9;
    const vp = num(f.vehiclePrice), pr = num(f.principal), ar = num(f.annualRate), tm = num(f.termMonths), ins = num(f.insuranceMonthly) ?? 0;
    if (changed(vp, Number(loan.vehiclePrice))) p.vehiclePrice = vp;
    if (changed(pr, Number(loan.originalPrincipal))) p.principal = pr;
    if (changed(ar, Number(loan.monthlyRate) * 1200)) p.annualRate = ar;
    if (changed(tm, Number(loan.termCount))) p.termMonths = tm;
    if (f.firstPaymentDate && f.firstPaymentDate !== d10(loan.firstDueDate)) p.firstPaymentDate = f.firstPaymentDate;
    if (Math.abs(ins - Number(loan.insuranceMonthly ?? 0)) > 1e-9) p.insuranceMonthly = ins > 0 ? ins : null;
    const mp = num(f.markPaidThrough);
    if (f.payments === 'REVERSE_ALL' && mp) p.markPaidThrough = mp;
    return p;
  };

  const run = async (dryRun: boolean) => {
    setError(null);
    if (!f.reason.trim()) return setError('Indique el motivo del cambio (queda en la bitácora).');
    setBusy(dryRun ? 'preview' : 'apply');
    try {
      const r = await api.restateLoan(loan.id, { ...payload(), dryRun });
      if (dryRun) setPreview(r);
      else {
        setDone(r);
        onDone();
      }
    } catch (e: any) {
      setError(e.message || 'No se pudo procesar.');
    } finally {
      setBusy(null);
    }
  };

  const Row: React.FC<{ label: string; a: React.ReactNode; b: React.ReactNode }> = ({ label, a, b }) => (
    <tr className="border-b border-slate-800/80">
      <td className="py-1.5 pr-3 text-slate-400">{label}</td>
      <td className="py-1.5 pr-3 font-mono text-slate-300">{a}</td>
      <td className={`py-1.5 font-mono ${String(a) !== String(b) ? 'text-amber-300 font-bold' : 'text-slate-300'}`}>{b}</td>
    </tr>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-6" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl border border-slate-700 bg-[#0F172A] shadow-2xl"
        onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Rehacer crédito ${loan.code}`}>
        <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-700/70">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-brand-accent flex items-center gap-1.5">
              <RefreshCcw className="w-3.5 h-3.5" /> Rehacer crédito / condiciones · {loan.code}
            </p>
            <h3 className="text-lg font-bold text-white">{loan.customer?.fullName}</h3>
            <p className="text-xs text-slate-400">Corrige monto, tasa, plazo, fechas o seguro y regenera el plan de pagos. Siempre se previsualiza antes de aplicar.</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-auto p-5 space-y-5">
          {done ? (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>
                  {done.message} Cuotas pagadas: <strong>{done.result?.paidInstallments}</strong>. Saldo de capital:{' '}
                  <strong>{formatMoney(done.result?.principalBalance)}</strong>.
                  {done.result?.next && <> Próxima: cuota #{done.result.next.number} el {formatDate(d10(done.result.next.dueDate))}.</>}
                </span>
              </div>
              <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider btn-brand cursor-pointer">Cerrar</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                {([
                  ['vehiclePrice', 'Precio del vehículo', 'number'],
                  ['principal', 'Monto financiado', 'number'],
                  ['annualRate', 'Tasa anual %', 'number'],
                  ['termMonths', 'Plazo (meses)', 'number'],
                  ['firstPaymentDate', 'Primera cuota', 'date'],
                  ['insuranceMonthly', 'Seguro mensual (vacío = sin seguro)', 'number'],
                ] as const).map(([k, label, type]) => (
                  <label key={k} className="block">
                    <span className="block font-semibold text-slate-300 mb-1">{label}</span>
                    <input type={type} step="any" min={0} value={f[k]} onChange={(e) => set(k, e.target.value)} className={inputClass} />
                  </label>
                ))}
              </div>

              <fieldset className="space-y-2 text-xs">
                <legend className="font-semibold text-slate-300 mb-1">Pagos registrados ({loan.payments?.length ?? 'los actuales'})</legend>
                <label className="flex items-start gap-2 text-slate-300 cursor-pointer">
                  <input type="radio" checked={f.payments === 'KEEP'} onChange={() => set('payments', 'KEEP')} className="mt-0.5" />
                  <span><strong>Conservar</strong>: se vuelven a aplicar con las nuevas condiciones (para cambios de tasa, seguro o monto).</span>
                </label>
                <label className="flex items-start gap-2 text-slate-300 cursor-pointer">
                  <input type="radio" checked={f.payments === 'REVERSE_ALL'} onChange={() => set('payments', 'REVERSE_ALL')} className="mt-0.5" />
                  <span><strong>Revertir todos</strong> y rehacer desde cero (queda el historial de reversión).</span>
                </label>
                {f.payments === 'REVERSE_ALL' && (
                  <label className="flex items-center gap-2 pl-6 text-slate-300">
                    Registrar pagadas las cuotas 1 a
                    <input type="number" min={0} value={f.markPaidThrough} onChange={(e) => set('markPaidThrough', e.target.value)} className={`${inputClass} w-24`} />
                    en su fecha de vencimiento (sin mora ni avisos al cliente).
                  </label>
                )}
              </fieldset>

              <label className="block text-xs">
                <span className="block font-semibold text-slate-300 mb-1">Motivo del cambio</span>
                <input value={f.reason} onChange={(e) => set('reason', e.target.value)} placeholder="Ej.: corrección de fecha de inicio según el contrato" className={inputClass} />
              </label>

              {preview && (
                <div className="space-y-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-700/60">
                        <th className="py-1.5 pr-3">Condición</th><th className="py-1.5 pr-3">Actual</th><th className="py-1.5">Nueva</th>
                      </tr>
                    </thead>
                    <tbody>
                      <Row label="Precio" a={formatMoney(preview.before.vehiclePrice)} b={formatMoney(preview.after.vehiclePrice)} />
                      <Row label="Prima" a={formatMoney(preview.before.downPayment)} b={formatMoney(preview.after.downPayment)} />
                      <Row label="Financiado" a={formatMoney(preview.before.principal)} b={formatMoney(preview.after.principal)} />
                      <Row label="Tasa anual" a={`${preview.before.annualRate}%`} b={`${preview.after.annualRate}%`} />
                      <Row label="Plazo" a={preview.before.termMonths} b={preview.after.termMonths} />
                      <Row label="Primera cuota" a={formatDate(preview.before.firstPaymentDate)} b={formatDate(preview.after.firstPaymentDate)} />
                      <Row label="Cuota" a={formatMoney(preview.before.installment)} b={formatMoney(preview.after.installment)} />
                      <Row label="Seguro" a={preview.before.insuranceMonthly ? formatMoney(preview.before.insuranceMonthly) : 'Sin seguro'} b={preview.after.insuranceMonthly ? formatMoney(preview.after.insuranceMonthly) : 'Sin seguro'} />
                    </tbody>
                  </table>
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      {preview.paymentsToReverse.length
                        ? `Se revierten ${preview.paymentsToReverse.length} pago(s). `
                        : `Se conservan ${preview.paymentsKept} pago(s): quedarían ${preview.paidInstallmentsWithKeptPayments} cuota(s) pagadas. `}
                      {preview.paymentsToRegister.length > 0 &&
                        `Se registran pagadas las cuotas 1 a ${preview.paymentsToRegister.length} (${formatDate(preview.paymentsToRegister[0].dueDate)} – ${formatDate(preview.paymentsToRegister.at(-1)!.dueDate)}). `}
                      Último vencimiento: {preview.after.lastDueDate ? formatDate(preview.after.lastDueDate) : '—'}.
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2" role="alert">
                  <AlertCircle className="w-4 h-4 shrink-0" /> <span>{error}</span>
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                <button onClick={() => run(true)} disabled={busy !== null}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 cursor-pointer disabled:opacity-50">
                  {busy === 'preview' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />} Previsualizar
                </button>
                <button onClick={() => run(false)} disabled={busy !== null || !preview}
                  title={preview ? 'Aplicar exactamente lo previsualizado' : 'Previsualice primero'}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider btn-brand cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                  {busy === 'apply' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />} Aplicar cambios
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
