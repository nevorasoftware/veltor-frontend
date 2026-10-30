import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Car,
  Download,
  ShieldCheck,
  LogOut,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  TrendingDown,
  AlertCircle,
} from 'lucide-react';
import { BRANDING, SECTIONS, formatUSD, formatDateSV } from '../config/branding';
import { api } from '../api/client';
import { clearSession } from '../auth/session';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  BANK_TRANSFER: 'Transferencia Bancaria',
  BANK_DEPOSIT: 'Depósito a Cuenta',
  CHECK: 'Cheque',
  OTHER: 'Otro',
};

const PRINCIPAL_CONCEPTS = ['PRINCIPAL', 'PREPAYMENT_PRINCIPAL'];
const INTEREST_CONCEPTS = ['INTEREST', 'ACCRUED_INTEREST'];

export const ClientPortalPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'schedule' | 'history'>('schedule');
  const [pickedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const meQuery = useQuery({ queryKey: ['portal-me'], queryFn: () => api.getPortalMe() });
  const customer = meQuery.data;

  // Por defecto se muestra el crédito activo más reciente
  const defaultLoan = customer?.loans?.find((l: any) => l.status === 'ACTIVE') || customer?.loans?.[0];
  const selectedLoanId: string | null = pickedLoanId ?? defaultLoan?.id ?? null;

  const loanQuery = useQuery({
    queryKey: ['portal-loan', selectedLoanId],
    queryFn: () => api.getPortalLoan(selectedLoanId!),
    enabled: !!selectedLoanId,
  });
  const detail = loanQuery.data;

  const installments: any[] = detail?.snapshot?.installments || [];
  const nextInstallment = installments.find((i) => ['PENDING', 'PARTIAL', 'OVERDUE'].includes(i.status));
  // Lo que falta pagar de la próxima cuota, incluida la mora acumulada a hoy
  const nextLateFee = nextInstallment
    ? Number(nextInstallment.lateInterestAccrued || 0) - Number(nextInstallment.paidLateInterest || 0)
    : 0;
  const nextDue = nextInstallment
    ? Number(nextInstallment.payment) - Number(nextInstallment.paidPrincipal || 0) - Number(nextInstallment.paidInterest || 0) + nextLateFee
    : 0;
  const paidCount = installments.filter((i) => i.status === 'PAID').length;
  const overdueCount = installments.filter((i) => i.status === 'OVERDUE').length;
  const originalPrincipal = Number(detail?.loan?.originalPrincipal || 0);
  const currentBalance = Number(detail?.snapshot?.principalBalance || 0);
  const amortizedPct = originalPrincipal > 0 ? ((originalPrincipal - currentBalance) / originalPrincipal) * 100 : 0;

  // Historial de pagos con la distribución aplicada y el saldo resultante
  const paymentsHistory = useMemo(() => {
    const running = { balance: originalPrincipal };
    return (detail?.payments || []).map((p: any) => {
      const sumOf = (concepts: string[]) =>
        p.allocations
          .filter((a: any) => concepts.includes(a.concept))
          .reduce((acc: number, a: any) => acc + Number(a.amount), 0);
      const principal = sumOf(PRINCIPAL_CONCEPTS);
      const interest = sumOf(INTEREST_CONCEPTS);
      running.balance = Math.max(0, running.balance - principal);
      return { ...p, principal, interest, resultingBalance: running.balance };
    }).reverse();
  }, [detail, originalPrincipal]);

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  const openPdf = async (kind: 'statement' | 'schedule') => {
    if (!detail) return;
    setPdfError(null);
    try {
      if (kind === 'statement') await api.openLoanStatementPdf(detail.loan.id);
      else await api.openLoanSchedulePdf(detail.loan.id);
    } catch (err: any) {
      setPdfError(err.message || 'No se pudo generar el documento.');
    }
  };

  const header = (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Portal del Cliente</span>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{SECTIONS.clientPortal}</h1>
        {customer && (
          <p className="text-xs text-slate-400">
            Bienvenido, <span className="text-white font-semibold">{customer.fullName}</span>
            {customer.dui ? ` · DUI: ${customer.dui}` : ''}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {customer?.loans?.length > 1 && (
          <select
            value={selectedLoanId || ''}
            onChange={(e) => setSelectedLoanId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
          >
            {customer.loans.map((l: any) => (
              <option key={l.id} value={l.id}>
                {l.code} · {l.vehicle.brand} {l.vehicle.model}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );

  const message = (title: string, body: string, isError = false) => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {header}
      <div className="text-center py-16 glass-panel rounded-2xl border border-slate-800 text-slate-400 space-y-3">
        {isError ? <AlertCircle className="w-10 h-10 mx-auto text-rose-400" /> : <Car className="w-10 h-10 mx-auto text-slate-400" />}
        <h3 className="text-base font-bold text-white">{title}</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">{body}</p>
      </div>
    </div>
  );

  if (meQuery.isLoading || (selectedLoanId && loanQuery.isLoading)) {
    return message('Cargando tu información...', 'Estamos consultando el estado de tu crédito.');
  }
  if (meQuery.isError) {
    return message('No fue posible cargar tu información', (meQuery.error as Error).message, true);
  }
  if (!customer?.loans?.length) {
    return message('Aún no tienes créditos registrados', 'Cuando tu financiamiento sea formalizado podrás consultar aquí tu saldo, cuotas y pagos.');
  }
  if (loanQuery.isError || !detail) {
    return message('No fue posible cargar tu crédito', loanQuery.error ? (loanQuery.error as Error).message : 'Intenta nuevamente.', true);
  }

  const loan = detail.loan;
  const isPaidOff = detail.snapshot.status === 'PAID_OFF';
  const hasPaymentInfo = BRANDING.bankAccounts.length > 0 || BRANDING.paymentsEmail || BRANDING.paymentsWhatsapp;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {header}

      {/* Tarjeta Principal de Crédito y Saldo a la Fecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div
          className={`${hasPaymentInfo ? 'lg:col-span-8' : 'lg:col-span-12'} glass-panel rounded-3xl p-6 sm:p-8 border border-slate-700/80 bg-gradient-to-br from-slate-900 to-[#0F172A] space-y-6 shadow-2xl`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200">
                <Car className="w-6 h-6 text-slate-300" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Vehículo Financiado</span>
                <h3 className="text-xl font-bold text-white">
                  {loan.vehicle.brand} {loan.vehicle.model} ({loan.vehicle.year})
                </h3>
                <p className="text-xs text-slate-400 font-mono">Contrato: {loan.code}</p>
              </div>
            </div>
            {isPaidOff ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Cancelado</span>
              </div>
            ) : overdueCount > 0 ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-bold">
                <AlertCircle className="w-4 h-4" />
                <span>{overdueCount} cuota(s) vencida(s)</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Al día</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-xs">
            <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20">
              <span className="text-emerald-400 block font-bold text-[11px] uppercase tracking-wider">Saldo a la Fecha</span>
              <span className="text-xl sm:text-2xl font-black text-white font-mono mt-0.5 block">{formatUSD(currentBalance)}</span>
              <span className="text-[10px] text-slate-400 block mt-1">Capital pendiente al día de hoy</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60">
              <span className="text-slate-400 block font-medium">Próxima Cuota</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-0.5 block">
                {nextInstallment ? formatUSD(nextDue) : '-'}
              </span>
              <span className={`text-[10px] block mt-1 ${nextLateFee > 0 ? 'text-rose-300 font-semibold' : 'text-slate-400'}`}>
                {nextLateFee > 0
                  ? `Incluye mora de ${formatUSD(nextLateFee)} (${nextInstallment.daysOverdue} días de atraso)`
                  : `Tasa ${(Number(loan.monthlyRate) * 100).toFixed(2)}% mensual`}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60">
              <span className="text-slate-400 block font-medium">Próximo Vencimiento</span>
              <span className="text-sm font-bold text-slate-200 mt-1 block">
                {nextInstallment ? formatDateSV(nextInstallment.dueDate) : '-'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-1">
                {nextInstallment ? `Cuota #${nextInstallment.number} de ${installments.length}` : 'Sin cuotas pendientes'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60">
              <span className="text-slate-400 block font-medium">Avance del Crédito</span>
              <span className="text-sm font-bold text-slate-200 font-mono mt-1 block">
                {paidCount} de {installments.length} cuotas
              </span>
              <span className="text-[10px] text-emerald-400 block mt-1">{Math.round(amortizedPct)}% amortizado</span>
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Capital amortizado: {formatUSD(originalPrincipal - currentBalance)}</span>
              <span className="font-mono">Monto original: {formatUSD(originalPrincipal)}</span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300 rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.max(0, amortizedPct))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Canales de Pago (configurables por entorno) */}
        {hasPaymentInfo && (
          <div className="lg:col-span-4 glass-panel rounded-3xl p-6 sm:p-8 border border-slate-700/80 bg-[#0F172A] space-y-4 shadow-2xl">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-slate-300" />
              <span>Instrucciones de Pago</span>
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Realiza tus pagos mediante transferencia o en ventanilla utilizando tu código de crédito como referencia:
            </p>
            <div className="p-3.5 rounded-xl bg-slate-800/90 border border-slate-700 font-mono text-center">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Referencia</span>
              <span className="text-xl font-black text-white">{loan.code}</span>
            </div>
            {BRANDING.bankAccounts.length > 0 && (
              <div className="text-[11px] text-slate-400 space-y-1 bg-slate-800/30 p-3 rounded-xl border border-slate-700/40">
                {BRANDING.bankAccounts.map((acc: { bank: string; detail: string }) => (
                  <div key={acc.bank + acc.detail}>
                    · <span className="text-slate-300 font-semibold">{acc.bank}:</span> {acc.detail}
                  </div>
                ))}
                {BRANDING.bankAccountHolder && (
                  <div>
                    · <span className="text-slate-300 font-semibold">Titular:</span> {BRANDING.bankAccountHolder}
                  </div>
                )}
              </div>
            )}
            {(BRANDING.paymentsEmail || BRANDING.paymentsWhatsapp) && (
              <p className="text-[11px] text-slate-400">
                Para reportar un comprobante envíalo
                {BRANDING.paymentsEmail && (
                  <>
                    {' '}a <a className="text-slate-200 underline" href={`mailto:${BRANDING.paymentsEmail}?subject=Pago ${loan.code}`}>{BRANDING.paymentsEmail}</a>
                  </>
                )}
                {BRANDING.paymentsEmail && BRANDING.paymentsWhatsapp ? ' o' : ''}
                {BRANDING.paymentsWhatsapp && <> por WhatsApp al {BRANDING.paymentsWhatsapp}</>}.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Tabla de Amortización e Historial */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-700/80 bg-[#0F172A] space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`pb-2 border-b-2 font-bold text-sm transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'schedule' ? 'border-white text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Tabla de Amortización</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-2 border-b-2 font-bold text-sm transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'history' ? 'border-white text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Historial de Pagos</span>
              <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono">{paymentsHistory.length}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => openPdf('statement')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Estado de Cuenta (PDF)</span>
            </button>
            <button
              onClick={() => openPdf('schedule')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Tabla de Amortización (PDF)</span>
            </button>
          </div>
        </div>

        {pdfError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">{pdfError}</div>
        )}

        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-800/80 to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">Corte al día de hoy</span>
              <span className="text-sm font-bold text-white">Saldo Insoluto a la Fecha:</span>
            </div>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">{formatUSD(currentBalance)}</span>
            <span className="text-xs text-slate-400 font-medium">
              ({paidCount} cuotas pagadas de {installments.length})
            </span>
          </div>
        </div>

        {activeTab === 'schedule' && (
          <div className="max-h-[500px] overflow-auto rounded-2xl border border-slate-700/80">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="sticky top-0 bg-slate-800 text-slate-200 uppercase font-bold text-[11px] shadow">
                <tr>
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">Vencimiento</th>
                  <th className="py-3 px-3 text-right">Saldo Inicial</th>
                  <th className="py-3 px-3 text-right">Capital</th>
                  <th className="py-3 px-3 text-right">Intereses</th>
                  <th className="py-3 px-3 text-right font-bold text-white">Cuota</th>
                  <th className="py-3 px-3 text-right font-bold text-emerald-400">Saldo Restante</th>
                  <th className="py-3 px-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/60 font-mono">
                {installments.map((row) => {
                  const isPaid = row.status === 'PAID';
                  const isOverdue = row.status === 'OVERDUE';
                  const isNext = !isPaid && row.number === nextInstallment?.number;
                  return (
                    <tr
                      key={row.number}
                      className={`transition-colors ${
                        isPaid
                          ? 'bg-emerald-950/15 text-slate-200'
                          : isOverdue
                          ? 'bg-rose-500/10 text-white'
                          : isNext
                          ? 'bg-amber-500/10 text-white font-medium'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-bold text-slate-400">{row.number}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-300">{formatDateSV(row.dueDate)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-400">{formatUSD(row.openingBalance)}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">{formatUSD(row.principal)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-400">{formatUSD(row.interest)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-white">{formatUSD(row.payment)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-100">{formatUSD(row.closingBalance)}</td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Pagada</span>
                          </span>
                        ) : isOverdue ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/10 border border-rose-500/20 text-rose-300">
                            Vencida
                          </span>
                        ) : row.status === 'PARTIAL' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 border border-amber-500/20 text-amber-400">
                            Parcial
                          </span>
                        ) : isNext ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 border border-amber-500/20 text-amber-400">
                            <Clock className="w-3 h-3" />
                            <span>Próxima</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-400">Pendiente</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-700/80">
            {paymentsHistory.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400">Aún no hay pagos registrados en este crédito.</p>
            ) : (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800 text-slate-200 uppercase font-bold text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Recibo / Fecha</th>
                    <th className="py-3 px-4">Método de Pago</th>
                    <th className="py-3 px-4 text-right">Monto Recibido</th>
                    <th className="py-3 px-4 text-right">Abono a Capital</th>
                    <th className="py-3 px-4 text-right">Intereses</th>
                    <th className="py-3 px-4 text-right font-bold text-emerald-400">Saldo Resultante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/60 font-mono">
                  {paymentsHistory.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-sans">
                        <span className="font-mono font-bold text-white block">{p.code}</span>
                        <span className="text-slate-400 text-[11px]">{formatDateSV(p.effectiveDate)}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-sans">{PAYMENT_METHOD_LABELS[p.paymentMethod] || p.paymentMethod}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-white">{formatUSD(p.amountReceived)}</td>
                      <td className="py-3.5 px-4 text-right text-emerald-400 font-bold">{formatUSD(p.principal)}</td>
                      <td className="py-3.5 px-4 text-right text-slate-400">{formatUSD(p.interest)}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-white">{formatUSD(p.resultingBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
