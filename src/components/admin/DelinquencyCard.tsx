import React from 'react';
import { AlertTriangle, ChevronRight, Loader2, ShieldCheck } from 'lucide-react';
import type { DelinquencySummary } from '../../api/client';
import { formatDate, formatMoney } from '../../utils/format';

interface DelinquencyCardProps {
  data: DelinquencySummary | undefined;
  isLoading: boolean;
  error: Error | null;
  onOpenLoan: (loanId: string, loanCode: string) => void;
}

/** Ficha "Créditos en mora" del resumen: totales y lista corta, calculados por el backend con el ledger. */
export const DelinquencyCard: React.FC<DelinquencyCardProps> = ({ data, isLoading, error, onOpenLoan }) => {
  const items = data?.loans || [];
  const totals = data?.totals;
  const withOverdue = totals?.loansWithOverdue ?? items.length;
  const alert = withOverdue > 0;

  return (
    <section
      aria-label="Créditos en mora"
      className={`rounded-2xl border p-4 sm:p-6 space-y-4 ${
        alert ? 'border-rose-500/40 bg-rose-950/20' : 'border-slate-700/80 bg-[#0F172A]/90'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              alert ? 'bg-rose-500/15 text-rose-300' : 'bg-emerald-500/10 text-emerald-400'
            }`}
          >
            {alert ? <AlertTriangle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white">Créditos en mora</h3>
            <p className="text-[11px] text-slate-400">
              Cuotas vencidas, seguro y mora calculada al {data?.asOf ? formatDate(data.asOf) : 'día de hoy'}
            </p>
          </div>
        </div>
        {totals && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:text-right shrink-0">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">En mora</span>
              <span className={`text-2xl font-black font-mono ${totals.loansDelinquent > 0 ? 'text-rose-300' : 'text-white'}`}>
                {totals.loansDelinquent}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">En gracia</span>
              <span className={`text-2xl font-black font-mono ${totals.loansInGrace > 0 ? 'text-amber-300' : 'text-white'}`}>
                {totals.loansInGrace}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Cuotas vencidas</span>
              <span className="text-2xl font-black font-mono text-white">{totals.overdueInstallments}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total adeudado</span>
              <span className={`text-lg sm:text-2xl font-black font-mono ${alert ? 'text-rose-300' : 'text-white'}`}>
                {formatMoney(totals.totalDue)}
              </span>
            </div>
          </div>
        )}
      </div>

      {totals && alert && (
        <p className="text-[11px] text-slate-400">
          Cuotas {formatMoney(totals.overduePrincipalInterest)} · Seguro {formatMoney(totals.overdueInsurance)} · Mora{' '}
          {formatMoney(totals.lateFees)}
        </p>
      )}

      {isLoading ? (
        <p className="flex items-center gap-2 text-xs text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Calculando la mora a la fecha...
        </p>
      ) : error ? (
        <p className="text-xs text-rose-300">No fue posible calcular la mora: {error.message}</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-emerald-300">Todos los créditos están al día.</p>
      ) : (
        <ul className="max-h-80 overflow-y-auto divide-y divide-rose-500/10 rounded-xl border border-rose-500/20 bg-slate-950/40">
          {items.map((it) => (
            <li key={it.loanId}>
              <button
                type="button"
                onClick={() => onOpenLoan(it.loanId, it.code)}
                className="w-full text-left px-3 sm:px-4 py-3 flex items-center gap-3 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-mono font-bold text-white text-xs">{it.code}</span>
                    <span className="text-xs text-slate-200 font-semibold break-words">{it.customerName}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                        it.inGrace ? 'bg-amber-500/15 text-amber-300' : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {it.inGrace ? 'En gracia' : 'En mora'}
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-200/90">
                    {it.overdueInstallments} cuota(s) vencida(s) · {it.daysOverdue} día(s) de atraso
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">{it.vehicleTitle}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="block font-mono font-black text-sm text-rose-300">{formatMoney(it.totalDue)}</span>
                  {Number(it.lateFees) > 0 && (
                    <span className="block text-[10px] text-slate-400">incl. mora {formatMoney(it.lateFees)}</span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
