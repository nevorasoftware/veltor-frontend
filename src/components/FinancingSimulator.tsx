import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calculator,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Info,
  Calendar,
} from 'lucide-react';
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
  initialDownPayment,
  vehicleName,
  onApplyLead,
}) => {
  // 1. Estados principales de entrada
  const [price, setPrice] = useState<number>(initialPrice);
  const [downPayment, setDownPayment] = useState<number>(() => {
    if (initialDownPayment && initialDownPayment > 0) return initialDownPayment;
    return Math.round(initialPrice * 0.15);
  });
  const [termMonths, setTermMonths] = useState<number>(36);

  // 2. Tasa preferencial parametrizable desde backend
  const [monthlyRatePercent, setMonthlyRatePercent] = useState<number>(1.5);
  const [rateLoading, setRateLoading] = useState<boolean>(true);

  // 3. Estados de UI
  const [showSchedule, setShowSchedule] = useState<boolean>(false);
  const [simulationData, setSimulationData] = useState<any>(null);

  // Cargar tasa preferencial vigente desde la API
  useEffect(() => {
    let mounted = true;
    api
      .getPublicSettings()
      .then((settings) => {
        if (mounted && settings?.preferentialMonthlyRate) {
          setMonthlyRatePercent(Number(settings.preferentialMonthlyRate) * 100);
        }
      })
      .catch(() => {
        // Mantiene 1.50% por defecto si no hay conexión
      })
      .finally(() => {
        if (mounted) setRateLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Si cambia initialPrice desde el vehículo seleccionado
  useEffect(() => {
    if (initialPrice && initialPrice > 0) {
      setPrice(initialPrice);
      const defaultDown = initialDownPayment || Math.round(initialPrice * 0.15);
      setDownPayment(defaultDown);
    }
  }, [initialPrice, initialDownPayment]);

  // Porcentaje calculado de la prima
  const downPercent = useMemo(() => {
    if (price <= 0) return 0;
    return Number(((downPayment / price) * 100).toFixed(1));
  }, [price, downPayment]);

  // Manejadores para permitir escribir montos directamente
  const handlePriceChange = (val: number) => {
    const validPrice = Math.max(0, isNaN(val) ? 0 : val);
    setPrice(validPrice);
    // Ajustar prima si excede el nuevo precio o mantener el 15% si era proporcional
    if (downPayment > validPrice) {
      setDownPayment(Math.round(validPrice * 0.15));
    }
  };

  const handleDownPaymentChange = (val: number) => {
    const validDown = Math.max(0, isNaN(val) ? 0 : val);
    // No permitir que la prima supere el precio total
    setDownPayment(Math.min(price, validDown));
  };

  const handleDownPercentChange = (pct: number) => {
    const validPct = Math.max(0, Math.min(100, isNaN(pct) ? 0 : pct));
    setDownPayment(Math.round((price * validPct) / 100));
  };

  // Cálculo de la simulación
  const runSimulation = useCallback(async () => {
    const rateDecimal = (monthlyRatePercent / 100).toFixed(6);
    const principal = Math.max(0, price - downPayment);

    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const firstDueDate = nextMonth.toISOString().split('T')[0];

    const effectiveTerm = Math.max(1, termMonths || 36);

    try {
      const res = await api.simulate({
        vehiclePrice: price.toFixed(2),
        downPayment: downPayment.toFixed(2),
        financedFees: '0.00',
        upfrontFees: '0.00',
        monthlyRate: rateDecimal,
        termCount: effectiveTerm,
        startDate,
        firstDueDate,
        method: 'FRENCH',
        dayCount: 'D30_360',
        frequency: 'MONTHLY',
      });
      setSimulationData(res);
    } catch {
      // Fallback local seguro con fórmula francesa
      const i = monthlyRatePercent / 100;
      const n = effectiveTerm;
      let cuota = 0;
      if (principal > 0) {
        if (i === 0) cuota = principal / n;
        else cuota = (principal * i) / (1 - Math.pow(1 + i, -n));
      }
      const totalPagos = cuota * n;
      const totalInteres = Math.max(0, totalPagos - principal);

      // Generar tabla estimada local
      let saldo = principal;
      const localSchedule = [];
      for (let p = 1; p <= n; p++) {
        const interesCuota = saldo * i;
        const capitalCuota = cuota - interesCuota;
        const saldoFinal = Math.max(0, saldo - capitalCuota);
        const fDate = new Date(today.getFullYear(), today.getMonth() + p, 1);

        localSchedule.push({
          number: p,
          dueDate: fDate.toISOString().split('T')[0],
          openingBalance: saldo.toFixed(2),
          principal: capitalCuota.toFixed(2),
          interest: interesCuota.toFixed(2),
          payment: cuota.toFixed(2),
          closingBalance: saldoFinal.toFixed(2),
        });
        saldo = saldoFinal;
      }

      setSimulationData({
        principal: principal.toFixed(2),
        installment: cuota.toFixed(2),
        totalInterest: totalInteres.toFixed(2),
        totalPayments: totalPagos.toFixed(2),
        totalCost: (downPayment + totalPagos).toFixed(2),
        nominalAnnualRate: (i * 12).toFixed(4),
        effectiveAnnualRate: (Math.pow(1 + i, 12) - 1).toFixed(4),
        disclaimer: 'Cálculo estimado bajo fórmula francesa exacta. Sujeto a evaluación crediticia.',
        schedule: localSchedule,
      });
    }
  }, [price, downPayment, termMonths, monthlyRatePercent]);

  useEffect(() => {
    runSimulation();
  }, [runSimulation]);

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-7 border border-slate-700/80 shadow-2xl bg-[#0F172A]/95 text-slate-100">
      {/* Encabezado del Simulador */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 shrink-0">
            <Calculator className="w-5 h-5 text-slate-300" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Simulador de Financiamiento VELTOR
            </h3>
            <p className="text-xs text-slate-400">
              {vehicleName ? `Cotización para ${vehicleName}` : 'Personaliza montos y condiciones de tu crédito vehicular'}
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold self-start sm:self-auto">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Fórmula Francesa Exacta</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 pt-6">
        {/* Columna Izquierda: Parámetros editables */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Precio del Vehículo (Input directo + Slider) */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label htmlFor="sim-price-input" className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Precio del Vehículo
              </label>
              <div className="relative flex items-center max-w-[200px] w-full">
                <span className="absolute left-3 text-slate-400 font-bold text-sm">$</span>
                <input
                  id="sim-price-input"
                  type="number"
                  min={1000}
                  max={250000}
                  step={100}
                  value={price === 0 ? '' : price}
                  onChange={(e) => handlePriceChange(Number(e.target.value))}
                  placeholder="20,000"
                  className="w-full pl-7 pr-3 py-1.5 bg-slate-900 border border-slate-600 focus:border-white focus:ring-1 focus:ring-white rounded-lg text-right font-mono font-bold text-base text-white outline-none transition-all"
                />
              </div>
            </div>

            <input
              type="range"
              min={3000}
              max={80000}
              step={500}
              value={Math.min(80000, price)}
              onChange={(e) => handlePriceChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-slate-200"
            />

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex gap-1.5">
                {[15000, 25000, 38900, 50000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePriceChange(preset)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono border border-slate-700 transition-colors"
                  >
                    ${preset.toLocaleString()}
                  </button>
                ))}
              </div>
              <span className="text-[10px]">Rango libre</span>
            </div>
          </div>

          {/* 2. Prima Inicial (Monto $ y Porcentaje % editables + Slider) */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label htmlFor="sim-down-input" className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Prima Inicial
              </label>
              <div className="flex items-center gap-2">
                {/* Input de Monto en Dólares */}
                <div className="relative flex items-center w-32">
                  <span className="absolute left-2.5 text-slate-400 font-bold text-xs">$</span>
                  <input
                    id="sim-down-input"
                    type="number"
                    min={0}
                    max={price}
                    step={100}
                    value={downPayment === 0 ? '' : downPayment}
                    onChange={(e) => handleDownPaymentChange(Number(e.target.value))}
                    className="w-full pl-6 pr-2 py-1.5 bg-slate-900 border border-slate-600 focus:border-white focus:ring-1 focus:ring-white rounded-lg text-right font-mono font-bold text-sm text-white outline-none"
                  />
                </div>
                {/* Input de Porcentaje */}
                <div className="relative flex items-center w-20">
                  <input
                    type="number"
                    min={10}
                    max={80}
                    step={1}
                    value={downPercent}
                    onChange={(e) => handleDownPercentChange(Number(e.target.value))}
                    className="w-full pl-2 pr-5 py-1.5 bg-slate-900 border border-slate-600 focus:border-white focus:ring-1 focus:ring-white rounded-lg text-right font-mono font-bold text-sm text-emerald-400 outline-none"
                  />
                  <span className="absolute right-2 text-slate-400 text-xs font-bold">%</span>
                </div>
              </div>
            </div>

            <input
              type="range"
              min={10}
              max={60}
              step={5}
              value={downPercent >= 10 && downPercent <= 60 ? downPercent : 15}
              onChange={(e) => handleDownPercentChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />

            <div className="flex justify-between text-[11px] text-slate-400">
              <span>10% (Mínima sugerida)</span>
              <span>25%</span>
              <span>50%</span>
            </div>
          </div>

          {/* 3. Plazo de Financiamiento (Personalizable + Presets) */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label htmlFor="sim-term-input" className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Plazo de Financiamiento
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Plazo personalizado:</span>
                <div className="relative flex items-center w-32">
                  <input
                    id="sim-term-input"
                    type="number"
                    min={1}
                    max={120}
                    step={1}
                    value={termMonths === 0 ? '' : termMonths}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setTermMonths(isNaN(val) ? 0 : Math.max(0, Math.min(120, val)));
                    }}
                    placeholder="36"
                    className="w-full pl-3 pr-10 py-1.5 bg-slate-900 border border-slate-600 focus:border-white focus:ring-1 focus:ring-white rounded-lg text-right font-mono font-bold text-sm text-white outline-none"
                  />
                  <span className="absolute right-2.5 text-slate-400 text-xs font-bold">meses</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[12, 24, 36, 48, 60, 72].map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setTermMonths(term)}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all border whitespace-nowrap cursor-pointer ${
                    termMonths === term
                      ? 'bg-slate-100 text-slate-950 border-white shadow-md'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-500 hover:text-white'
                  }`}
                >
                  {term} Meses
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-400">
              <span>Elige un plazo sugerido o ingresa una cantidad de meses personalizada libremente.</span>
              <span className="font-mono text-slate-300 font-semibold">{termMonths || 36} cuotas</span>
            </div>
          </div>

          {/* 4. Tasa de Interés Preferencial */}
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Tasa preferencial vigente:</span>
            </div>
            <span className="font-bold text-white text-sm font-mono whitespace-nowrap">
              {rateLoading ? '...' : `${monthlyRatePercent.toFixed(2)}% mensual`} ({(monthlyRatePercent * 12).toFixed(1)}% anual)
            </span>
          </div>
        </div>

        {/* Columna Derecha: Proyección de Cuota y Resumen */}
        <div className="lg:col-span-5 flex flex-col justify-between p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-slate-800/90 to-slate-900 border border-slate-700 shadow-xl space-y-6">
          <div className="space-y-4">
            <span className="text-xs uppercase tracking-wider font-bold text-slate-400 block">
              Proyección de Cuota Mensual
            </span>

            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono">
                {simulationData ? formatUSD(simulationData.installment) : 'Calculando...'}
              </span>
              <span className="text-xs text-slate-400 font-medium">/ mes</span>
            </div>

            <div className="space-y-2.5 pt-3 border-t border-slate-700/80 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Capital a financiar:</span>
                <span className="font-bold text-white font-mono">
                  {simulationData ? formatUSD(simulationData.principal) : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Prima abonada:</span>
                <span className="font-bold text-emerald-400 font-mono">{formatUSD(downPayment)}</span>
              </div>
              <div className="flex justify-between">
                <span>Intereses estimados:</span>
                <span className="font-semibold text-slate-300 font-mono">
                  {simulationData ? formatUSD(simulationData.totalInterest) : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total proyectado a pagar:</span>
                <span className="font-bold text-white font-mono">
                  {simulationData ? formatUSD(simulationData.totalPayments) : '-'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 pt-1 leading-relaxed">
              * Estimación sujeta a aprobación crediticia conforme a políticas de crédito de VELTOR.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={() => {
                if (onApplyLead && simulationData) {
                  onApplyLead({
                    price,
                    down: downPayment,
                    term: termMonths,
                    installment: Number(simulationData.installment),
                  });
                }
              }}
              className="w-full py-3.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-100 hover:bg-white text-slate-950 transition-all shadow-lg hover:shadow-slate-200/10 flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <span>Solicitar este Crédito</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>

            {simulationData?.schedule?.length > 0 && (
              <button
                type="button"
                onClick={() => setShowSchedule(!showSchedule)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 transition-colors cursor-pointer"
              >
                <span>{showSchedule ? 'Ocultar tabla de amortización' : 'Ver tabla de amortización con saldo'}</span>
                {showSchedule ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabla de Amortización con "Saldo a la Fecha" */}
      {showSchedule && simulationData?.schedule?.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-white">
                Tabla de Amortización Proyectada ({termMonths} Cuotas)
              </h4>
              <p className="text-xs text-slate-400">
                Evolución del saldo capital y amortización bajo cuota nivelada francesa
              </p>
            </div>

            {/* Indicador de Saldo a la Fecha */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Saldo a la fecha:</span>
              <span className="font-mono font-bold text-emerald-400">
                {formatUSD(simulationData.principal)}
              </span>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-700/70">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="sticky top-0 bg-slate-800 text-slate-200 uppercase font-bold text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Vencimiento</th>
                  <th className="py-2.5 px-3 text-right">Saldo Inicial</th>
                  <th className="py-2.5 px-3 text-right">Capital</th>
                  <th className="py-2.5 px-3 text-right">Interés</th>
                  <th className="py-2.5 px-3 text-right">Cuota Total</th>
                  <th className="py-2.5 px-3 text-right font-bold text-white">Saldo Restante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/60 font-mono">
                {simulationData.schedule.map((row: any) => (
                  <tr key={row.number} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 font-bold text-slate-400">{row.number}</td>
                    <td className="py-2 px-3 font-sans text-slate-300">{formatDateSV(row.dueDate)}</td>
                    <td className="py-2 px-3 text-right text-slate-400">{formatUSD(row.openingBalance)}</td>
                    <td className="py-2 px-3 text-right text-emerald-400">+{formatUSD(row.principal)}</td>
                    <td className="py-2 px-3 text-right text-slate-400">{formatUSD(row.interest)}</td>
                    <td className="py-2 px-3 text-right font-bold text-white">{formatUSD(row.payment)}</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-200">{formatUSD(row.closingBalance)}</td>
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
