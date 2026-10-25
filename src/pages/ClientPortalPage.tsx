import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car,
  Download,
  ShieldCheck,
  LogOut,
  FileText,
} from 'lucide-react';
import { SECTIONS, formatUSD, formatDateSV } from '../config/branding';
import { api } from '../api/client';

export const ClientPortalPage: React.FC = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('veltor_user') || '{}');

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
    currentBalance: 14850.25,
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
        amount: 578.43,
        principal: 338.43,
        interest: 240.0,
        late: 0.0,
        status: 'APPLIED',
        method: 'Transferencia Bancaria',
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
      },
    ],
  };

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
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Tarjeta Principal de Próximo Vencimiento */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 glass-panel rounded-3xl p-6 sm:p-8 border border-slate-700/80 bg-gradient-to-br from-slate-900 to-[#0F172A] space-y-6">
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Saldo de Capital</span>
              <span className="text-xl font-extrabold text-white font-mono">
                {formatUSD(loanData.currentBalance)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Cuota Mensual</span>
              <span className="text-xl font-extrabold text-emerald-400 font-mono">
                {formatUSD(loanData.installmentAmount)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Próximo Pago</span>
              <span className="text-sm font-bold text-slate-200">
                {formatDateSV(loanData.nextDueDate)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Avance del Plazo</span>
              <span className="text-sm font-bold text-slate-200 font-mono">
                {loanData.installmentsPaid} de {loanData.termCount} cuotas
              </span>
            </div>
          </div>

          {/* Barra de Progreso del Crédito */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Amortización de Capital</span>
              <span>
                {Math.round(((loanData.originalPrincipal - loanData.currentBalance) / loanData.originalPrincipal) * 100)}% pagado
              </span>
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
        <div className="lg:col-span-4 glass-panel rounded-3xl p-6 sm:p-8 border border-slate-700/80 bg-[#0F172A] space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Instrucciones de Pago
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Puedes realizar tus pagos mediante transferencia bancaria o en ventanilla utilizando tu código de crédito:
            </p>
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 font-mono text-center">
              <span className="text-[10px] text-slate-400 block">Referencia Oficial</span>
              <span className="text-lg font-black text-white">{loanData.code}</span>
            </div>
            <div className="text-[11px] text-slate-400 space-y-1">
              <div>· Banco Agrícola: Cta. Corriente #00300-12849-01</div>
              <div>· Banco Cuscatlán: Cta. Corriente #102-401928-2</div>
              <div>· A nombre de: VELTOR El Salvador</div>
            </div>
          </div>

          <button
            onClick={() => alert('Para reportar un comprobante de transferencia, envía la captura a pagos@veltor.app o vía WhatsApp al +503 2200-8800')}
            className="w-full py-3 rounded-xl bg-slate-100 hover:bg-white text-slate-900 font-bold text-xs uppercase tracking-wider transition-colors shadow"
          >
            Notificar Pago Realizado
          </button>
        </div>
      </div>

      {/* Historial de Pagos y Recibos */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-700/80 bg-[#0F172A] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white">Historial de Movimientos y Pagos</h3>
            <p className="text-xs text-slate-400">Detalle de abonos aplicados con distribución exacta a capital e interés</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => window.open(api.getLoanStatementPdfUrl(loanData.code), '_blank')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
              title="Descargar Estado de Cuenta oficial en PDF"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Estado de Cuenta (PDF)</span>
            </button>
            <button
              onClick={() => window.open(api.getLoanSchedulePdfUrl(loanData.code), '_blank')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
              title="Descargar Tabla de Amortización oficial en PDF"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Tabla de Amortización (PDF)</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-200 uppercase font-bold">
              <tr>
                <th className="py-3 px-4">Recibo / Fecha</th>
                <th className="py-3 px-4">Método</th>
                <th className="py-3 px-4 text-right">Monto Recibido</th>
                <th className="py-3 px-4 text-right">Abono a Capital</th>
                <th className="py-3 px-4 text-right">Intereses Ordinarios</th>
                <th className="py-3 px-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loanData.paymentsHistory.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-white block">{p.code}</span>
                    <span className="text-slate-400 text-[11px]">{formatDateSV(p.date)}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-300">{p.method}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-white">
                    {formatUSD(p.amount)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-400">
                    +{formatUSD(p.principal)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-400">
                    {formatUSD(p.interest)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      Confirmado
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
