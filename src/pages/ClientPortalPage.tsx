import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { SECTIONS, formatUSD, formatDateSV } from '../config/branding';
import { api } from '../api/client';

export const ClientPortalPage: React.FC = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('veltor_user') || '{}');
  const [activeTab, setActiveTab] = useState<'schedule' | 'history'>('schedule');

  // Datos del crédito activo del cliente
  const loanData = {
    code: 'CRE-2026-0001',
    customerName: user.fullName || 'Alejandro Morales Rivera',
    dui: '04829104-5',
    vehicle: {
      brand: 'Toyota',
      model: 'Corolla LE',
      year: 2023,
      vin: '4T1B11HK5PU102941',
      plate: 'P 849-201',
      price: 19800.0,
      downPayment: 3800.0,
    },
    originalPrincipal: 16000.0,
    currentBalance: 14850.25, // Saldo a la fecha al día de hoy
    monthlyRate: 0.015,
    termCount: 36,
    installmentsPaid: 2,
    installmentAmount: 578.43,
    nextDueDate: '2026-03-01',
    paymentsHistory: [
      {
        id: 'p-1',
        code: 'PAG-000102',
        date: '2026-02-01',
        amount: 1051.40,
        principal: 816.40,
        interest: 235.00,
        late: 0.0,
        status: 'APPLIED',
        method: 'Transferencia Bancaria',
        resultingBalance: 14850.25, // Saldo a la fecha
      },
      {
        id: 'p-2',
        code: 'PAG-000041',
        date: '2026-01-01',
        amount: 578.43,
        principal: 333.35,
        interest: 245.08,
        late: 0.0,
        status: 'APPLIED',
        method: 'Depósito a Cuenta',
        resultingBalance: 15666.65,
      },
    ],
  };

  // Generación matemática de la tabla de amortización completa (36 cuotas) con saldo a la fecha
  const amortizationSchedule = useMemo(() => {
    const list = [];
    const monthlyRate = loanData.monthlyRate;
    const installment = loanData.installmentAmount;

    // Cuota 1 (Pagada)
    list.push({
      number: 1,
      dueDate: '2026-01-01',
      openingBalance: 16000.0,
      principal: 333.35,
      interest: 245.08,
      payment: 578.43,
      closingBalance: 15666.65,
      status: 'PAID',
    });

    // Cuota 2 (Pagada - con abono extraordinario)
    list.push({
      number: 2,
      dueDate: '2026-02-01',
      openingBalance: 15666.65,
      principal: 816.40,
      interest: 235.00,
      payment: 1051.40,
      closingBalance: 14850.25, // Saldo a la fecha
      status: 'PAID',
    });

    // Cuotas 3 a 36 proyectadas desde el Saldo a la Fecha actual ($14,850.25)
    let balance = 14850.25;
    const startDate = new Date(2026, 2, 1); // Marzo 2026

    for (let i = 3; i <= 36; i++) {
      const interest = Number((balance * monthlyRate).toFixed(2));
      let principal = Number((installment - interest).toFixed(2));
      let closing = Number((balance - principal).toFixed(2));

      if (i === 36 || closing < 0) {
        principal = balance;
        closing = 0;
      }

      const d = new Date(startDate.getFullYear(), startDate.getMonth() + (i - 3), 1);
      const dueDate = d.toISOString().split('T')[0];

      list.push({
        number: i,
        dueDate,
        openingBalance: balance,
        principal,
        interest,
        payment: Number((principal + interest).toFixed(2)),
        closingBalance: closing,
        status: i === 3 ? 'NEXT' : 'PENDING',
      });

      balance = closing;
      if (balance <= 0) break;
    }

    return list;
  }, [loanData]);

  const handleLogout = () => {
    localStorage.removeItem('veltor_token');
    localStorage.removeItem('veltor_user');
    navigate('/login');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Encabezado del Portal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Portal del Cliente
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {SECTIONS.clientPortal}
          </h1>
          <p className="text-xs text-slate-400">
            Bienvenido, <span className="text-white font-semibold">{loanData.customerName}</span> · DUI: {loanData.dui}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Tarjeta Principal de Crédito y Saldo a la Fecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 glass-panel rounded-3xl p-6 sm:p-8 border border-slate-700/80 bg-gradient-to-br from-slate-900 to-[#0F172A] space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200">
                <Car className="w-6 h-6 text-slate-300" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Vehículo Financiado
                </span>
                <h3 className="text-xl font-bold text-white">
                  {loanData.vehicle.brand} {loanData.vehicle.model} ({loanData.vehicle.year})
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Placa: {loanData.vehicle.plate} · Contrato: {loanData.code}
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Al día</span>
            </div>
          </div>

          {/* KPI destacando Saldo a la Fecha */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-xs">
            <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20">
              <span className="text-emerald-400 block font-bold text-[11px] uppercase tracking-wider">
                Saldo a la Fecha
              </span>
              <span className="text-xl sm:text-2xl font-black text-white font-mono mt-0.5 block">
                {formatUSD(loanData.currentBalance)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-1">Capital pendiente al día de hoy</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60">
              <span className="text-slate-400 block font-medium">Cuota Mensual</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-0.5 block">
                {formatUSD(loanData.installmentAmount)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-1">Cuota nivelada francesa</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60">
              <span className="text-slate-400 block font-medium">Próximo Vencimiento</span>
              <span className="text-sm font-bold text-slate-200 mt-1 block">
                {formatDateSV(loanData.nextDueDate)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-1">Cuota #3 de 36</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60">
              <span className="text-slate-400 block font-medium">Avance del Crédito</span>
              <span className="text-sm font-bold text-slate-200 font-mono mt-1 block">
                {loanData.installmentsPaid} de {loanData.termCount} cuotas
              </span>
              <span className="text-[10px] text-emerald-400 block mt-1">
                {Math.round(((loanData.originalPrincipal - loanData.currentBalance) / loanData.originalPrincipal) * 100)}% amortizado
              </span>
            </div>
          </div>

          {/* Barra de Progreso del Crédito */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Amortización de Capital: {formatUSD(loanData.originalPrincipal - loanData.currentBalance)} pagados</span>
              <span className="font-mono">Monto original: {formatUSD(loanData.originalPrincipal)}</span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                style={{
                  width: `${((loanData.originalPrincipal - loanData.currentBalance) / loanData.originalPrincipal) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Canales de Pago Autorizados */}
        <div className="lg:col-span-4 glass-panel rounded-3xl p-6 sm:p-8 border border-slate-700/80 bg-[#0F172A] space-y-4 flex flex-col justify-between shadow-2xl">
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-slate-300" />
              <span>Instrucciones de Pago</span>
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Puedes realizar tus pagos mediante transferencia bancaria o en ventanilla utilizando tu código de crédito:
            </p>
            <div className="p-3.5 rounded-xl bg-slate-800/90 border border-slate-700 font-mono text-center">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Referencia Oficial</span>
              <span className="text-xl font-black text-white">{loanData.code}</span>
            </div>
            <div className="text-[11px] text-slate-400 space-y-1 bg-slate-800/30 p-3 rounded-xl border border-slate-700/40">
              <div>· <span className="text-slate-300 font-semibold">Banco Agrícola:</span> Cta. Corriente #00300-12849-01</div>
              <div>· <span className="text-slate-300 font-semibold">Banco Cuscatlán:</span> Cta. Corriente #102-401928-2</div>
              <div>· <span className="text-slate-300 font-semibold">Titular:</span> VELTOR El Salvador</div>
            </div>
          </div>

          <button
            onClick={() => alert('Para reportar un comprobante de transferencia, envía la captura a pagos@veltor.app o vía WhatsApp al +503 2200-8800')}
            className="w-full py-3 rounded-xl bg-slate-100 hover:bg-white text-slate-900 font-bold text-xs uppercase tracking-wider transition-colors shadow cursor-pointer"
          >
            Notificar Pago Realizado
          </button>
        </div>
      </div>

      {/* Sección Unificada: Tabla de Amortización con Saldo a la Fecha e Historial */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-700/80 bg-[#0F172A] space-y-6 shadow-2xl">
        {/* Selector de Pestañas y Acciones PDF */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`pb-2 border-b-2 font-bold text-sm transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'schedule'
                  ? 'border-white text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Tabla de Amortización</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold">
                Saldo: {formatUSD(loanData.currentBalance)}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-2 border-b-2 font-bold text-sm transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'history'
                  ? 'border-white text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Historial de Pagos Recibidos</span>
              <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono">
                {loanData.paymentsHistory.length}
              </span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => window.open(api.getLoanStatementPdfUrl(loanData.code), '_blank')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              title="Descargar Estado de Cuenta oficial en PDF"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Estado de Cuenta (PDF)</span>
            </button>
            <button
              onClick={() => window.open(api.getLoanSchedulePdfUrl(loanData.code), '_blank')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              title="Descargar Tabla de Amortización oficial en PDF"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Tabla de Amortización (PDF)</span>
            </button>
          </div>
        </div>

        {/* Banner Informativo de Saldo a la Fecha */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-800/80 to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                Corte Contable Oficial al Día de Hoy
              </span>
              <span className="text-sm font-bold text-white">
                Saldo Insoluto a la Fecha:
              </span>
            </div>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
              {formatUSD(loanData.currentBalance)}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              (2 cuotas pagadas de 36)
            </span>
          </div>
        </div>

        {/* TAB 1: TABLA DE AMORTIZACIÓN COMPLETA */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-2">
              <p>
                Proyección de cuota nivelada francesa con distribución detallada a capital e intereses.
              </p>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span>Pagada</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span>Próxima Cuota</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                  <span>Pendiente</span>
                </span>
              </div>
            </div>

            <div className="max-h-[500px] overflow-y-auto rounded-2xl border border-slate-700/80">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="sticky top-0 bg-slate-800 text-slate-200 uppercase font-bold text-[11px] shadow">
                  <tr>
                    <th className="py-3 px-3">#</th>
                    <th className="py-3 px-3">Fecha Vencimiento</th>
                    <th className="py-3 px-3 text-right">Saldo Inicial</th>
                    <th className="py-3 px-3 text-right">Abono Capital</th>
                    <th className="py-3 px-3 text-right">Intereses</th>
                    <th className="py-3 px-3 text-right font-bold text-white">Cuota Mensual</th>
                    <th className="py-3 px-3 text-right font-bold text-emerald-400">Saldo Restante</th>
                    <th className="py-3 px-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/60 font-mono">
                  {amortizationSchedule.map((row) => {
                    const isPaid = row.status === 'PAID';
                    const isNext = row.status === 'NEXT';

                    return (
                      <React.Fragment key={row.number}>
                        {/* Fila separadora indicando el Corte Actual al Día de Hoy */}
                        {row.number === 3 && (
                          <tr className="bg-emerald-950/40 border-y-2 border-emerald-500/40 font-sans">
                            <td colSpan={8} className="py-2.5 px-4 text-center">
                              <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400">
                                <Clock className="w-3.5 h-3.5" />
                                <span>CORTE ACTUAL AL DÍA DE HOY — Saldo insoluto a la fecha: {formatUSD(loanData.currentBalance)}</span>
                              </div>
                            </td>
                          </tr>
                        )}

                        <tr
                          className={`transition-colors ${
                            isPaid
                              ? 'bg-emerald-950/15 text-slate-200'
                              : isNext
                              ? 'bg-amber-500/10 text-white font-medium'
                              : 'hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="py-2.5 px-3 font-bold text-slate-400">{row.number}</td>
                          <td className="py-2.5 px-3 font-sans text-slate-300">
                            {formatDateSV(row.dueDate)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-400">
                            {formatUSD(row.openingBalance)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                            +{formatUSD(row.principal)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-400">
                            {formatUSD(row.interest)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-white">
                            {formatUSD(row.payment)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-100">
                            {formatUSD(row.closingBalance)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-sans">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Pagada</span>
                              </span>
                            ) : isNext ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                <Clock className="w-3 h-3" />
                                <span>Próxima</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-400">
                                Pendiente
                              </span>
                            )}
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: HISTORIAL DE PAGOS APLICADOS */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Detalle cronológico de los abonos recibidos, comprobantes y saldo de capital resultante a la fecha de cada pago.
            </p>

            <div className="overflow-x-auto rounded-2xl border border-slate-700/80">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800 text-slate-200 uppercase font-bold text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Recibo / Fecha</th>
                    <th className="py-3 px-4">Método de Pago</th>
                    <th className="py-3 px-4 text-right">Monto Recibido</th>
                    <th className="py-3 px-4 text-right">Abono a Capital</th>
                    <th className="py-3 px-4 text-right">Intereses Ordinarios</th>
                    <th className="py-3 px-4 text-right font-bold text-emerald-400">Saldo a la Fecha</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/60 font-mono">
                  {loanData.paymentsHistory.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-sans">
                        <span className="font-mono font-bold text-white block">{p.code}</span>
                        <span className="text-slate-400 text-[11px]">{formatDateSV(p.date)}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-sans">{p.method}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-white">
                        {formatUSD(p.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-emerald-400 font-bold">
                        +{formatUSD(p.principal)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-400">
                        {formatUSD(p.interest)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-white">
                        {formatUSD(p.resultingBalance)}
                      </td>
                      <td className="py-3.5 px-4 text-center font-sans">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Confirmado</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
