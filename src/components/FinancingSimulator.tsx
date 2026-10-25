import React, { useState, useEffect, useMemo } from 'react';
import { Calculator, ArrowRight, ShieldCheck, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { formatUSD, formatDateSV } from '../config/branding';
import { api } from '../api/client';

interface FinancingSimulatorProps {
  initialPrice?: number;
  initialDownPayment?: number;
  vehicleName?: string;
  onApplyLead?: (summary: { price: number; down: number; term: number; installment: number }) => void;
}

export const FinancingSimulator: React.FC<FinancingSimulatorProps> = ({
  initialPrice = 20000,
  vehicleName,
  onApplyLead,
}) => {
  const [price, setPrice] = useState<number>(initialPrice);
  const [downPercent, setDownPercent] = useState<number>(15);
  const [termMonths, setTermMonths] = useState<number>(36);
  const monthlyRatePercent = 1.5; // 1.5% mensual
  const [showSchedule, setShowSchedule] = useState<boolean>(false);
  const [simulationData, setSimulationData] = useState<any>(null);

  // Calcular prima en dólares según el porcentaje
  const downPayment = useMemo(() => {
    return Math.round((price * downPercent) / 100);
  }, [price, downPercent]);

  // Recalcular proyección llamando a la API de VELTOR o fallback local seguro
  const runSimulation = async () => {
    const rateDecimal = (monthlyRatePercent / 100).toFixed(6);
    const principal = Math.max(0, price - downPayment);

    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const firstDueDate = nextMonth.toISOString().split('T')[0];

    try {
      const res = await api.simulate({
        vehiclePrice: price.toFixed(2),
        downPayment: downPayment.toFixed(2),
        financedFees: '0.00',
        upfrontFees: '0.00',
        monthlyRate: rateDecimal,
        termCount: termMonths,
        startDate,
        firstDueDate,
        method: 'FRENCH',
        dayCount: 'D30_360',
        frequency: 'MONTHLY',
      });
      setSimulationData(res);
    } catch {
      // Fallback de cálculo local
      const i = monthlyRatePercent / 100;
      const n = termMonths;
      let cuota = 0;
      if (principal > 0) {
        if (i === 0) cuota = principal / n;
        else cuota = (principal * i) / (1 - Math.pow(1 + i, -n));
      }
      const totalPagos = cuota * n;
      const totalInteres = Math.max(0, totalPagos - principal);

      setSimulationData({
        principal: principal.toFixed(2),
        installment: cuota.toFixed(2),
        totalInterest: totalInteres.toFixed(2),
        totalPayments: totalPagos.toFixed(2),
        totalCost: (downPayment + totalPagos).toFixed(2),
        nominalAnnualRate: (i * 12).toFixed(4),
        effectiveAnnualRate: (Math.pow(1 + i, 12) - 1).toFixed(4),
        disclaimer: 'Cálculo estimado con fines informativos. Sujeto a evaluación y aprobación crediticia.',
        schedule: [],
      });
    }
  };

  useEffect(() => {
    runSimulation();
  }, [price, downPercent, termMonths]);

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-700/80 shadow-2xl bg-[#0F172A]/90">
      <div className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200">
            <Calculator className="w-5 h-5 text-slate-300" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-wide">
              Simulador de Financiamiento VELTOR
            </h3>
            <p className="text-xs text-slate-400">
              {vehicleName ? `Cotización para ${vehicleName}` : 'Personaliza las condiciones de tu crédito vehicular'}
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>Fórmula Francesa Exacta</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
        {/* Parámetros de Entrada */}
        <div className="lg:col-span-7 space-y-6">
          {/* Precio del Vehículo */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <label htmlFor="sim-vehicle-price" className="font-semibold text-slate-300">Precio del Vehículo</label>
              <span className="font-bold text-white text-base">{formatUSD(price)}</span>
            </div>
            <input
              id="sim-vehicle-price"
              type="range"
              min={5000}
              max={60000}
              step={500}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-300"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>$5,000</span>
              <span>$30,000</span>
              <span>$60,000</span>
            </div>
          </div>

          {/* Prima o Pago Inicial */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <label htmlFor="sim-down-payment" className="font-semibold text-slate-300">
                Prima Inicial ({downPercent}%)
              </label>
              <span className="font-bold text-white text-base">{formatUSD(downPayment)}</span>
            </div>
            <input
              id="sim-down-payment"
              type="range"
              min={10}
              max={60}
              step={5}
              value={downPercent}
              onChange={(e) => setDownPercent(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-300"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>10% (Mínima)</span>
              <span>30%</span>
              <span>60%</span>
            </div>
          </div>

          {/* Plazo en Meses */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-3">
              Plazo de Financiamiento
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[12, 24, 36, 48, 60, 72].map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setTermMonths(term)}
                  className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all border ${
                    termMonths === term
                      ? 'bg-slate-200 text-slate-900 border-white shadow-md'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-500 hover:text-white'
                  }`}
                >
                  {term} Meses
                </button>
              ))}
            </div>
          </div>

          {/* Tasa Mensual */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400" />
              <span>Tasa de interés preferencial estimada:</span>
            </div>
            <span className="font-bold text-white text-sm">
              {monthlyRatePercent.toFixed(2)}% mensual ({(monthlyRatePercent * 12).toFixed(1)}% anual)
            </span>
          </div>
        </div>

        {/* Resultados del Cálculo */}
        <div className="lg:col-span-5 flex flex-col justify-between p-6 rounded-2xl bg-gradient-to-b from-slate-800/90 to-slate-900 border border-slate-700 shadow-xl">
          <div className="space-y-4">
            <span className="text-xs uppercase tracking-wider font-bold text-slate-400">
              Proyección de Cuota Mensual
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white tracking-tight">
                {simulationData ? formatUSD(simulationData.installment) : 'Calculando...'}
              </span>
              <span className="text-xs text-slate-400 font-medium">/ mes</span>
            </div>

            <div className="space-y-2.5 pt-4 border-t border-slate-700 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Capital a financiar:</span>
                <span className="font-semibold text-white">
                  {simulationData ? formatUSD(simulationData.principal) : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Prima abonada:</span>
                <span className="font-semibold text-white">{formatUSD(downPayment)}</span>
              </div>
              <div className="flex justify-between">
                <span>Intereses estimados:</span>
                <span className="font-semibold text-white">
                  {simulationData ? formatUSD(simulationData.totalInterest) : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total estimado a pagar:</span>
                <span className="font-semibold text-white">
                  {simulationData ? formatUSD(simulationData.totalPayments) : '-'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 pt-2 leading-relaxed">
              * Estimación sujeta a evaluación y aprobación conforme a políticas de crédito de VELTOR.
            </p>
          </div>

          <div className="space-y-3 pt-6">
            {onApplyLead && (
              <button
                type="button"
                onClick={() =>
                  onApplyLead({
                    price,
                    down: downPayment,
                    term: termMonths,
                    installment: simulationData ? parseFloat(simulationData.installment) : 0,
                  })
                }
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold uppercase tracking-wider bg-slate-100 hover:bg-white text-slate-900 transition-all shadow-md hover:shadow-lg"
              >
                <span>Solicitar este Crédito</span>
                <ArrowRight className="w-4 h-4 text-slate-900" />
              </button>
            )}

            {simulationData?.schedule?.length > 0 && (
              <button
                type="button"
                onClick={() => setShowSchedule(!showSchedule)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 transition-colors"
              >
                <span>{showSchedule ? 'Ocultar tabla de amortización' : 'Ver tabla de amortización detallada'}</span>
                {showSchedule ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabla de Amortización Expandible */}
      {showSchedule && simulationData?.schedule?.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Tabla de Amortización Proyectada ({termMonths} Cuotas)
            </h4>
            <span className="text-xs text-slate-400">Modalidad Francesa (Cuota Fija)</span>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-700/60">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="sticky top-0 bg-slate-800 text-slate-200 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Vencimiento</th>
                  <th className="py-2.5 px-3 text-right">Saldo Inicial</th>
                  <th className="py-2.5 px-3 text-right">Capital</th>
                  <th className="py-2.5 px-3 text-right">Interés</th>
                  <th className="py-2.5 px-3 text-right">Cuota</th>
                  <th className="py-2.5 px-3 text-right">Saldo Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-900/50">
                {simulationData.schedule.map((row: any) => (
                  <tr key={row.number} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 font-mono font-bold text-slate-400">{row.number}</td>
                    <td className="py-2 px-3">{formatDateSV(row.dueDate)}</td>
                    <td className="py-2 px-3 text-right font-mono">{formatUSD(row.openingBalance)}</td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-400">+{formatUSD(row.principal)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-400">{formatUSD(row.interest)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-white">{formatUSD(row.payment)}</td>
                    <td className="py-2 px-3 text-right font-mono">{formatUSD(row.closingBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
