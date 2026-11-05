import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, Check, CheckCheck, Clock, FileText, Loader2, MessageCircle, Paperclip, Search, Send, User } from 'lucide-react';
import { api, type WaConversation, type WaMessage } from '../../api/client';

const POLL_MS = 15_000;
const time = (iso: string) => new Date(iso).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' });
const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date(Date.now() - 864e5);
  if (d.toDateString() === today.toDateString()) return 'Hoy';
  if (d.toDateString() === yest.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-SV', { day: '2-digit', month: 'short', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
};
const shortWhen = (iso: string) => (dayLabel(iso) === 'Hoy' ? time(iso) : dayLabel(iso));
const fmtPhone = (p: string) => (p.startsWith('503') && p.length === 11 ? `+503 ${p.slice(3, 7)}-${p.slice(7)}` : `+${p}`);
const TYPE_LABEL: Record<string, string> = { image: '📷 Foto', document: '📄 Documento', audio: '🎤 Audio', video: '🎬 Video', sticker: 'Sticker', location: '📍 Ubicación' };
const preview = (m: { type: string; body: string | null }) => m.body?.trim() || TYPE_LABEL[m.type] || `[${m.type}]`;
const who = (c: { customer: WaConversation['customer']; profileName?: string | null; phone: string }) =>
  c.customer?.fullName ?? c.profileName ?? fmtPhone(c.phone);

/** Adjunto: se descarga con la sesión y se muestra (foto) o se abre (PDF, audio…). */
const Attachment: React.FC<{ m: WaMessage }> = ({ m }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const isImage = (m.mediaMime ?? '').startsWith('image/');
  useEffect(() => {
    if (!isImage) return;
    let alive = true;
    let made: string | null = null;
    api.getWhatsappMediaUrl(m.id).then((u) => (alive ? setUrl((made = u)) : URL.revokeObjectURL(u))).catch((e) => alive && setErr(e.message));
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [m.id, isImage]);
  const open = async () => {
    try {
      window.open(await api.getWhatsappMediaUrl(m.id), '_blank');
    } catch (e: any) {
      setErr(e.message);
    }
  };
  if (err) return <p className="text-[11px] text-rose-300">Adjunto no disponible: {err}</p>;
  if (isImage)
    return url ? (
      <button onClick={open} className="block cursor-zoom-in"><img src={url} alt="Foto enviada por el cliente" className="max-h-60 rounded-lg" /></button>
    ) : (
      <div className="w-40 h-28 rounded-lg bg-slate-700/50 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-slate-400" /></div>
    );
  return (
    <button onClick={open} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/20 text-xs hover:bg-black/30 cursor-pointer">
      {m.type === 'document' ? <FileText className="w-3.5 h-3.5" /> : <Paperclip className="w-3.5 h-3.5" />}
      {m.mediaName || TYPE_LABEL[m.type] || 'Abrir adjunto'}
    </button>
  );
};

const OutStatus: React.FC<{ m: WaMessage }> = ({ m }) => {
  if (m.status === 'FAILED') return <span title={m.error ?? ''}><AlertCircle className="w-3 h-3 text-rose-300 inline" /></span>;
  if (m.status === 'READ') return <CheckCheck className="w-3 h-3 text-sky-300 inline" />;
  if (m.status === 'DELIVERED') return <CheckCheck className="w-3 h-3 inline" />;
  return <Check className="w-3 h-3 inline" />;
};

/** Pestaña "Mensajes": conversaciones de WhatsApp de los clientes con el número de la plataforma. */
export const WhatsappInboxTab: React.FC = () => {
  const qc = useQueryClient();
  const { data: convs = [], isLoading, error } = useQuery({ queryKey: ['wa-conversations'], queryFn: api.getWhatsappConversations, refetchInterval: POLL_MS });
  const [selected, setSelected] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const thread = useQuery({
    queryKey: ['wa-thread', selected],
    queryFn: () => api.getWhatsappThread(selected!),
    enabled: !!selected,
    refetchInterval: POLL_MS,
  });
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  // Al abrir una conversación sus mensajes quedan leídos: se refresca la lista y el contador de la pestaña
  useEffect(() => {
    if (thread.data) {
      qc.invalidateQueries({ queryKey: ['wa-conversations'] });
      qc.invalidateQueries({ queryKey: ['wa-unread'] });
    }
  }, [thread.data?.messages.length, selected]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => bottom.current?.scrollIntoView({ block: 'end' }), [thread.data?.messages.length, selected]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? convs.filter((c) => `${who(c)} ${c.phone} ${c.customer?.code ?? ''}`.toLowerCase().includes(t)) : convs;
  }, [convs, q]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !text.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      await api.replyWhatsapp(selected, text.trim());
      setText('');
      await qc.invalidateQueries({ queryKey: ['wa-thread', selected] });
      qc.invalidateQueries({ queryKey: ['wa-conversations'] });
    } catch (err: any) {
      setSendError(err.message || 'No se pudo enviar.');
    } finally {
      setSending(false);
    }
  };

  const t = thread.data;
  const conv = convs.find((c) => c.phone === selected);
  let lastDay = '';

  return (
    <div className="glass-panel rounded-2xl border border-slate-700/80 bg-[#0F172A]/90 overflow-hidden">
      <div className="grid md:grid-cols-[320px_1fr] h-[72vh] min-h-[480px]">
        {/* Lista de conversaciones */}
        <aside className={`border-r border-slate-800 flex flex-col min-h-0 ${selected ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-400" /> Mensajes de WhatsApp
            </h3>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente o teléfono"
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-slate-400" />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {isLoading && <p className="p-6 text-center text-xs text-slate-400"><Loader2 className="w-4 h-4 animate-spin inline" /> Cargando…</p>}
            {error && <p className="p-6 text-center text-xs text-rose-300">{(error as Error).message}</p>}
            {!isLoading && !error && list.length === 0 && (
              <p className="p-6 text-center text-xs text-slate-500">
                {convs.length ? 'Sin resultados.' : 'Todavía no hay mensajes. Aquí aparecerá lo que los clientes escriban al WhatsApp.'}
              </p>
            )}
            {list.map((c) => (
              <button key={c.phone} onClick={() => { setSelected(c.phone); setSendError(null); }}
                className={`w-full text-left px-4 py-3 border-b border-slate-800/70 flex gap-3 items-start cursor-pointer transition-colors ${selected === c.phone ? 'bg-slate-800' : 'hover:bg-slate-800/50'}`}>
                <div className="w-9 h-9 shrink-0 rounded-full bg-slate-700 flex items-center justify-center"><User className="w-4 h-4 text-slate-300" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2">
                    <span className={`text-sm truncate ${c.unread ? 'font-bold text-white' : 'font-semibold text-slate-200'}`}>{who(c)}</span>
                    <span className="text-[10px] text-slate-500 shrink-0">{shortWhen(c.last.at)}</span>
                  </div>
                  <div className="flex justify-between gap-2 items-center">
                    <span className="text-xs text-slate-400 truncate">{c.last.direction === 'OUT' && 'Usted: '}{preview(c.last)}</span>
                    {c.unread > 0 && <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-emerald-500 text-[10px] font-bold text-white flex items-center justify-center">{c.unread}</span>}
                  </div>
                  {!c.customer && <span className="text-[10px] text-amber-300">No es cliente registrado</span>}
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Conversación */}
        <section className={`flex flex-col min-h-0 ${selected ? 'flex' : 'hidden md:flex'}`}>
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-500 p-6 text-center">Seleccione una conversación.</div>
          ) : (
            <>
              <header className="px-4 py-3 border-b border-slate-800 flex items-center gap-3">
                <button onClick={() => setSelected(null)} className="md:hidden p-1 text-slate-400 hover:text-white cursor-pointer" aria-label="Volver"><ArrowLeft className="w-4 h-4" /></button>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{conv ? who(conv) : t?.customer?.fullName ?? fmtPhone(selected)}</p>
                  <p className="text-[11px] text-slate-400">{fmtPhone(selected)}{t?.customer && ` · ${t.customer.code}`}</p>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-slate-950/40">
                {thread.isLoading && <p className="text-center text-xs text-slate-400"><Loader2 className="w-4 h-4 animate-spin inline" /> Cargando…</p>}
                {thread.error && <p className="text-center text-xs text-rose-300">{(thread.error as Error).message}</p>}
                {t?.messages.map((m) => {
                  const day = dayLabel(m.timestamp);
                  const sep = day !== lastDay ? ((lastDay = day), true) : false;
                  const out = m.direction === 'OUT';
                  return (
                    <React.Fragment key={m.id}>
                      {sep && <div className="text-center"><span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">{day}</span></div>}
                      <div className={`flex ${out ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm space-y-1 ${out ? (m.type === 'template' || m.type === 'auto' ? 'bg-slate-700 text-slate-200' : 'bg-emerald-700 text-white') : 'bg-slate-800 text-slate-100'}`}>
                          {m.type === 'auto' && <p className="text-[10px] uppercase tracking-wider text-slate-400">Respuesta automática</p>}
                          {m.type === 'template' && <p className="text-[10px] uppercase tracking-wider text-slate-400">Aviso del sistema</p>}
                          {m.mediaId && <Attachment m={m} />}
                          {m.body && <p className="whitespace-pre-wrap break-words">{m.type === 'template' ? m.body.replace(/^\[Plantilla [^\]]+\]\s*/, '') : m.body}</p>}
                          {!m.body && !m.mediaId && <p className="italic text-slate-400">{preview(m)}</p>}
                          {m.documentId && <p className="text-[10px] text-emerald-300">Guardado en el expediente</p>}
                          <p className="text-[10px] text-right opacity-70 space-x-1">{time(m.timestamp)} {out && <OutStatus m={m} />}</p>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
                <div ref={bottom} />
              </div>

              <form onSubmit={send} className="border-t border-slate-800 p-3 space-y-2">
                {t && !t.canReply ? (
                  <p className="text-xs text-amber-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Pasaron más de 24 horas desde el último mensaje del cliente: WhatsApp no permite responder con texto libre hasta que vuelva a escribir.
                  </p>
                ) : (
                  t?.replyUntil && <p className="text-[10px] text-slate-500">Puede responder hasta {dayLabel(t.replyUntil).toLowerCase()} a las {time(t.replyUntil)}.</p>
                )}
                {sendError && <p className="text-xs text-rose-300 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> {sendError}</p>}
                <div className="flex gap-2">
                  <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} disabled={!t?.canReply || sending}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement).requestSubmit(); } }}
                    placeholder={t?.canReply ? 'Escriba su respuesta… (Enter envía, Shift+Enter nueva línea)' : ''}
                    className="flex-1 resize-none px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-slate-400 disabled:opacity-50" />
                  <button type="submit" disabled={!t?.canReply || sending || !text.trim()}
                    className="self-end px-4 py-2.5 rounded-xl btn-brand text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Enviar
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
};
