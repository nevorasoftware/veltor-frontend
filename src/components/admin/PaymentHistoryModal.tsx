import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, FileText, History, Loader2, Mail, MessageCircle, X } from 'lucide-react';
import { api, type ReceiptSendResult } from '../../api/client';
import { formatDate, formatMoney } from '../../utils/format';

const KIND: Record<string, string> = { INSTALLMENT: 'Cuota', PRINCIPAL_PREPAYMENT: 'Abono a capital', PAYOFF: 'Cancelación total' };
const METHOD: Record<string, string> = { CASH: 'Efectivo', BANK_TRANSFER: 'Transferencia', BANK_DEPOSIT: 'Depósito', CHECK: 'Cheque', OTHER: 'Otro' };
const EMAIL_MSG: Record<string, string> = { SENT: 'correo enviado', SKIPPED: 'correo no configurado', FAILED: 'falló el correo', NO_RECIPIENT: 'el cliente no tiene correo' };
const WA_MSG: Record<string, string> = { SENT: 'WhatsApp enviado', FAILED: 'falló WhatsApp', DISABLED: 'WhatsApp no configurado', INVALID_PHONE: 'teléfono inválido' };

const coveredInstallments = (p: any): string => {
  const n = [...new Set((p.allocations ?? []).map((a: any) => a.installmentNumber).filter(Boolean))].sort((a: any, b: any) => a - b) as number[];
  if (!n.length) return '—';
  return n.length > 3 ? `${n[0]}–${n[n.length - 1]}` : n.join(', ');
};

/** Historial de pagos de un crédito con su comprobante en PDF y reenvío a demanda por correo o WhatsApp. */
export const PaymentHistoryModal: React.FC<{ loan: any; onClose: () => void }> = ({ loan, onClose }) => {
  const { data, isLoading, error } = useQuery({ queryKey: ['loan-ledger', loan.id], queryFn: () => api.getLoanLedger(loan.id) });
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { ok: boolean; text: string }>>({});

  const customer = data?.loan?.customer ?? loan.customer ?? {};
  const payments = useMemo(
    () => [...(data?.loan?.payments ?? [])].filter((p: any) => !p.isReversed).reverse(),
    [data],
  );

  const send = async (p: any, channel: 'email' | 'whatsapp') => {
    setBusy(`${p.id}:${channel}`);
    try {
      const r: ReceiptSendResult = await api.sendPaymentReceipt(loan.id, p.id, { email: channel === 'email', whatsapp: channel === 'whatsapp' });
      const res = channel === 'email' ? r.email : r.whatsapp;
      const ok = res?.status === 'SENT';
      const label = channel === 'email' ? EMAIL_MSG[res?.status ?? ''] : WA_MSG[res?.status ?? ''];
      setResults((s) => ({ ...s, [p.id]: { ok, text: `${label ?? res?.status}${res?.to ? ` (${res.to})` : ''}${!ok && res?.error ? `: ${res.error}` : ''}` } }));
    } catch (e: any) {
      setResults((s) => ({ ...s, [p.id]: { ok: false, text: e.message } }));
    } finally {
      setBusy(null);
    }
  };

  const openPdf = async (p: any) => {
    try {
      await api.openPaymentReceiptPdf(loan.id, p.id);
    } catch (e: any) {
      setResults((s) => ({ ...s, [p.id]: { ok: false, text: e.message || 'No se pudo generar el comprobante.' } }));
    }
  };

  const btn = 'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-6" onClick={onClose}>
      <div
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-slate-700 bg-[#0F172A] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Historial de pagos ${loan.code}`}
      >
        <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-700/70">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-brand-accent flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" /> Historial de pagos · {loan.code}
            </p>
            <h3 className="text-lg font-bold text-white">{customer.fullName}</h3>
            <p className="text-xs text-slate-400">
              Correo: {customer.email || <span className="text-amber-300">sin correo</span>} · WhatsApp:{' '}
              {customer.phone || <span className="text-amber-300">sin teléfono</span>}
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-auto p-4 sm:p-5">
          {isLoading && (
            <div className="py-12 text-center text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin inline" /> Cargando pagos…
            </div>
          )}
          {error && <div className="py-8 text-center text-rose-300 text-sm">{(error as Error).message}</div>}
          {!isLoading && !error && payments.length === 0 && (
            <div className="py-12 text-center text-slate-500 text-sm">Este crédito todavía no tiene pagos registrados.</div>
          )}

          {payments.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-700/60">
                  <th className="py-2 pr-3">Pago</th>
                  <th className="py-2 pr-3">Cuotas</th>
                  <th className="py-2 pr-3 text-right">Monto</th>
                  <th className="py-2 text-right">Comprobante</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p: any) => (
                  <React.Fragment key={p.id}>
                    <tr className="border-b border-slate-800/80 align-top">
                      <td className="py-2.5 pr-3">
                        <div className="font-mono text-white text-xs">{p.code}</div>
                        <div className="text-[11px] text-slate-400">
                          {formatDate(String(p.effectiveDate).slice(0, 10))} · {KIND[p.kind] ?? p.kind} · {METHOD[p.paymentMethod] ?? p.paymentMethod}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 text-slate-200 font-mono text-xs">{coveredInstallments(p)}</td>
                      <td className="py-2.5 pr-3 text-right font-mono font-bold text-white">
                        {formatMoney(p.amountReceived)}
                        {Number(p.insuranceAmount ?? 0) > 0 && (
                          <div className="text-[11px] font-normal text-slate-400">+ seguro {formatMoney(p.insuranceAmount)}</div>
                        )}
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="inline-flex flex-wrap justify-end gap-1.5">
                          <button onClick={() => openPdf(p)} className={`${btn} bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700`} title="Ver o descargar el comprobante en PDF">
                            <FileText className="w-3 h-3" /> PDF
                          </button>
                          <button
                            onClick={() => send(p, 'email')}
                            disabled={busy !== null || !customer.email}
                            title={customer.email ? `Enviar el comprobante a ${customer.email}` : 'El cliente no tiene correo registrado'}
                            className={`${btn} bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700`}
                          >
                            {busy === `${p.id}:email` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3 text-emerald-400" />} Correo
                          </button>
                          <button
                            onClick={() => send(p, 'whatsapp')}
                            disabled={busy !== null || !customer.phone}
                            title={customer.phone ? `Enviar el comprobante por WhatsApp al ${customer.phone}` : 'El cliente no tiene teléfono registrado'}
                            className={`${btn} btn-brand border-transparent`}
                          >
                            {busy === `${p.id}:whatsapp` ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageCircle className="w-3 h-3" />} WhatsApp
                          </button>
                        </div>
                      </td>
                    </tr>
                    {results[p.id] && (
                      <tr>
                        <td colSpan={4} className="pb-2">
                          <div className={`mt-1 px-3 py-1.5 rounded-lg text-[11px] flex items-center gap-1.5 ${results[p.id].ok ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>
                            {results[p.id].ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                            {p.code}: {results[p.id].text}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
