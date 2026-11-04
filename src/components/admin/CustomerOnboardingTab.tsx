import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Clock, Copy, Loader2, MessageCircle, Search, Send, UserCheck } from 'lucide-react';
import { api, type BulkInviteResult, type OnboardingCustomer } from '../../api/client';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-SV', { day: '2-digit', month: 'short' });

const STATUS_LABEL: Record<string, string> = {
  SENT: 'enviado', FAILED: 'falló', DISABLED: 'WhatsApp no configurado', INVALID_PHONE: 'teléfono inválido', NOT_SENT: 'solo enlace',
};

const StateBadge: React.FC<{ c: OnboardingCustomer }> = ({ c }) => {
  const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border';
  if (c.hasPortalAccess) return <span className={`${base} bg-emerald-500/10 border-emerald-500/30 text-emerald-300`}><UserCheck className="w-3 h-3" /> Registrado</span>;
  const inv = c.lastInvite;
  if (!inv) return <span className={`${base} bg-slate-700/40 border-slate-600 text-slate-300`}>Sin invitar</span>;
  if (inv.sendStatus !== 'SENT' && inv.sendStatus !== 'NOT_SENT')
    return <span title={inv.sendError ?? ''} className={`${base} bg-rose-500/10 border-rose-500/30 text-rose-300`}><AlertCircle className="w-3 h-3" /> {STATUS_LABEL[inv.sendStatus] ?? inv.sendStatus}</span>;
  if (inv.state === 'PENDING')
    return <span className={`${base} bg-amber-500/10 border-amber-500/30 text-amber-300`}><Clock className="w-3 h-3" /> {inv.sendStatus === 'SENT' ? 'Invitado' : 'Enlace copiado'} · vence {fmtDate(inv.expiresAt)}</span>;
  return <span className={`${base} bg-slate-700/40 border-slate-600 text-slate-300`}>{inv.state === 'EXPIRED' ? 'Invitación vencida' : 'Invitación anulada'}</span>;
};

/** Pestaña "Registro de clientes": envía por WhatsApp el enlace para que el cliente complete sus datos y cree su acceso. */
export const CustomerOnboardingTab: React.FC = () => {
  const qc = useQueryClient();
  const { data = [], isLoading, error } = useQuery({ queryKey: ['onboarding-customers'], queryFn: api.getOnboardingCustomers });
  const [q, setQ] = useState('');
  const [onlyPending, setOnlyPending] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [preview, setPreview] = useState<BulkInviteResult | null>(null);

  const stats = useMemo(() => ({
    total: data.length,
    registered: data.filter((c) => c.hasPortalAccess).length,
    invitable: data.filter((c) => !c.hasPortalAccess && c.validPhone).length,
    noPhone: data.filter((c) => !c.hasPortalAccess && !c.validPhone).length,
  }), [data]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return data.filter((c) => (!onlyPending || !c.hasPortalAccess) && (!s || `${c.code} ${c.fullName} ${c.phone ?? ''}`.toLowerCase().includes(s)));
  }, [data, q, onlyPending]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['onboarding-customers'] });

  const sendOne = async (c: OnboardingCustomer, send: boolean) => {
    if (!send && c.lastInvite?.state === 'PENDING' && !window.confirm('Se generará un enlace nuevo y el anterior dejará de funcionar. ¿Continuar?')) return;
    setBusy(c.id); setMsg(null);
    try {
      const r = await api.sendCustomerInvite(c.id, send);
      if (!send && r.url) {
        await navigator.clipboard.writeText(r.url).catch(() => undefined);
        setMsg({ ok: true, text: `Enlace de ${c.fullName} copiado: ${r.url}` });
      } else if (r.status === 'SENT') setMsg({ ok: true, text: `Invitación enviada por WhatsApp a ${c.fullName}.` });
      else setMsg({ ok: false, text: `No se envió a ${c.fullName}: ${r.reason ?? STATUS_LABEL[r.status]}. Puede copiar el enlace y enviarlo manualmente.` });
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setBusy(null); refresh();
    }
  };

  const simulate = async () => {
    setBusy('bulk'); setMsg(null);
    try { setPreview(await api.sendBulkInvites(true)); } catch (e: any) { setMsg({ ok: false, text: e.message }); } finally { setBusy(null); }
  };

  const sendAll = async () => {
    if (!preview || !window.confirm(`Se enviará la invitación por WhatsApp a ${preview.summary.wouldSend} cliente(s). ¿Enviar ahora?`)) return;
    setBusy('bulk'); setMsg(null);
    try {
      const r = await api.sendBulkInvites(false);
      setPreview(null);
      setMsg({ ok: r.summary.failed === 0, text: `Enviadas: ${r.summary.sent}. Fallidas: ${r.summary.failed}. Omitidas: ${r.summary.skipped}.` });
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setBusy(null); refresh();
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2"><MessageCircle className="w-5 h-5 text-brand-accent" /> Registro de clientes</h3>
            <p className="text-xs text-slate-400">
              Envíe por WhatsApp un enlace personal (válido 7 días) para que el cliente complete su DUI, correo y dirección y cree su
              acceso al portal. Solo se invita a clientes con teléfono y sin acceso.
            </p>
          </div>
          <button onClick={simulate} disabled={busy !== null || stats.invitable === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider btn-brand disabled:opacity-50 cursor-pointer">
            {busy === 'bulk' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Invitar a todos
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[
            ['Clientes', stats.total], ['Registrados', stats.registered], ['Se pueden invitar', stats.invitable], ['Sin teléfono válido', stats.noPhone],
          ].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-3">
              <div className="text-xl font-black text-white">{v}</div>
              <div className="text-[11px] text-slate-400">{l}</div>
            </div>
          ))}
        </div>

        {preview && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
            <p className="text-sm text-amber-200">
              Se enviará a <strong>{preview.summary.wouldSend}</strong> cliente(s); se omiten {preview.summary.skipped} (registrados, sin teléfono
              o con invitación vigente).
            </p>
            <ul className="text-xs text-slate-300 max-h-40 overflow-auto space-y-0.5">
              {preview.results.filter((r) => r.status === 'NOT_SENT').map((r) => <li key={r.customerId}>{r.code} · {r.fullName} · {r.phone}</li>)}
            </ul>
            <div className="flex gap-2">
              <button onClick={sendAll} disabled={busy !== null || preview.summary.wouldSend === 0}
                className="px-4 py-2 rounded-xl text-xs font-bold btn-brand disabled:opacity-50 cursor-pointer">Enviar ahora</button>
              <button onClick={() => setPreview(null)} className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-200 cursor-pointer">Cancelar</button>
            </div>
          </div>
        )}

        {msg && (
          <div role="status" className={`p-3 rounded-xl text-xs flex gap-2 break-all ${msg.ok ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'}`}>
            {msg.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />} <span>{msg.text}</span>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por código, nombre o teléfono"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none" />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} /> Solo sin registrar
          </label>
        </div>

        {isLoading && <div className="py-10 text-center text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin inline" /> Cargando…</div>}
        {error && <div className="py-6 text-center text-rose-300 text-sm">{(error as Error).message}</div>}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-700/60">
                <th className="py-2 pr-3">Cliente</th><th className="py-2 pr-3">Teléfono</th><th className="py-2 pr-3">Faltan</th><th className="py-2 pr-3">Estado</th><th className="py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-slate-800/80">
                  <td className="py-2.5 pr-3"><div className="text-white font-medium">{c.fullName}</div><div className="text-[11px] text-slate-500 font-mono">{c.code}</div></td>
                  <td className="py-2.5 pr-3 text-slate-300 font-mono text-xs">{c.phone ?? <span className="text-slate-500">—</span>}{c.phone && !c.validPhone && <span className="ml-1 text-rose-300">(inválido)</span>}</td>
                  <td className="py-2.5 pr-3 text-xs text-slate-400">{c.missing.length ? c.missing.join(', ') : <span className="text-emerald-400">completo</span>}</td>
                  <td className="py-2.5 pr-3"><StateBadge c={c} /></td>
                  <td className="py-2.5 text-right whitespace-nowrap">
                    {!c.hasPortalAccess && (
                      <div className="inline-flex gap-1.5">
                        <button onClick={() => sendOne(c, true)} disabled={busy !== null || !c.validPhone} title={c.validPhone ? 'Enviar invitación por WhatsApp' : 'Agregue un teléfono válido al cliente'}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold btn-brand disabled:opacity-40 cursor-pointer">
                          {busy === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageCircle className="w-3 h-3" />} WhatsApp
                        </button>
                        <button onClick={() => sendOne(c, false)} disabled={busy !== null} title="Generar el enlace y copiarlo (para enviarlo por otro medio)"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 disabled:opacity-40 cursor-pointer">
                          <Copy className="w-3 h-3" /> Enlace
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!isLoading && rows.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-500 text-sm">No hay clientes para mostrar.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
