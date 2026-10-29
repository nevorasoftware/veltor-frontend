import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calculator,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Calendar,
  Percent,
} from 'lucide-react';
import { formatUSD, formatDateSV, todayLocalISO, addMonthsISO, levelPayment } from '../config/branding';
import { api } from '../api/client';
import { usePublicSettings } from '../hooks/usePublicSettings';

interface FinancingSimulatorProps {
  // La API serializa los montos decimales como texto, por eso se aceptan ambos tipos
  initialPrice?: number | string;
  initialDownPayment?: number | string;
  vehicleName?: string;
  onApplyLead?: (summary: { price: number; down: number; term: number; installment: number; monthlyRate?: number }) => void;
}

const DEFAULT_SIMULATION_PRICE = 20000;

export const FinancingSimulator: React.FC<FinancingSimulatorProps> = ({
  initialPrice,
  initialDownPayment,
  vehicleName,
  onApplyLead,
}) => {
  const { data: settings } = usePublicSettings();
  const minDownPercent = settings?.minDownPercent ?? 15;
  const basePrice = Number(initialPrice) > 0 ? Number(initialPrice) : DEFAULT_SIMULATION_PRICE;
  const baseDown = Number(initialDownPayment) > 0 ? Number(initialDownPayment) : Math.round((basePrice * minDownPercent) / 100);

  // 1. Estados principales de entrada
  const [price, setPrice] = useState<number>(basePrice);
  const [downPayment, setDownPayment] = useState<number>(baseDown);
  const [termMonths, setTermMonths] = useState<number>(36);

  // 2. Tasa de interés mensual parametrizable (por defecto toma la tasa oficial del sistema)
  const [monthlyRatePercent, setMonthlyRatePercent] = useState<number>(1.5);
  const [defaultSystemRate, setDefaultSystemRate] = useState<number>(1.5);

  // 3. Estados de UI
  const [showSchedule, setShowSchedule] = useState<boolean>(false);
  const [simulationData, setSimulationData] = useState<any>(null);

  // Aplicar tasa y plazo oficiales cuando llegan desde la API
  useEffect(() => {
    if (settings?.preferentialMonthlyRate) {
      const r = Number((settings.preferentialMonthlyRate * 100).toFixed(4));
      setMonthlyRatePercent(r);
      setDefaultSystemRate(r);
    }
    if (settings?.defaultTermMonths) setTermMonths(settings.defaultTermMonths);
  }, [settings?.preferentialMonthlyRate, settings?.defaultTermMonths]);

  // Si cambia el vehículo seleccionado
  useEffect(() => {
    setPrice(basePrice);
    setDownPayment(baseDown);
  }, [basePrice, baseDown]);

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
      setDownPayment(Math.round((validPrice * minDownPercent) / 100));
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

    // Mismas fechas que usa la formalización real: primera cuota un mes después del desembolso
    const startDate = todayLocalISO();
    const firstDueDate = addMonthsISO(startDate, 1);

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
      // Si la API no responde se muestra una estimación local con la misma fórmula francesa
      const i = monthlyRatePercent / 100;
      const n = effectiveTerm;
      const cuota = levelPayment(principal, i, n);
      const totalPagos = cuota * n;
      const totalInteres = Math.max(0, totalPagos - principal);

      // Generar tabla estimada local
      let saldo = principal;
      const localSchedule = [];
      for (let p = 1; p <= n; p++) {
        const interesCuota = saldo * i;
        const capitalCuota = cuota - interesCuota;
        const saldoFinal = Math.max(0, saldo - capitalCuota);
        localSchedule.push({
          number: p,
          dueDate: addMonthsISO(startDate, p),
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

  const inputBase =
    'w-full py-1.5 bg-slate-900 border border-slate-600 focus:ring-1 rounded-lg text-right font-mono font-bold text-sm outline-none transition-all';

  return (
    <div className="@container w-full max-w-5xl mx-auto glass-panel rounded-2xl border border-slate-700/80 shadow-2xl bg-[#0F172A]/95 text-slate-100">
      {/* Encabezado compacto */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 @xl:px-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
            <Calculator className="w-4 h-4 text-slate-300" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm @xl:text-base font-bold text-white tracking-tight truncate">
              Simulador de Financiamiento VELTOR
            </h3>
            <p className="text-[11px] text-slate-400 truncate">
              {vehicleName ? `Cotización para ${vehicleName}` : 'Ajusta los valores y mira tu cuota al instante'}
            </p>
          </div>
        </div>
        <div className="hidden @md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold shrink-0">
          <ShieldCheck className="w-3 h-3" />
          <span>Fórmula Francesa</span>
        </div>
      </div>

      {/* En pantallas angostas: parámetros → cuota (fija abajo al hacer scroll) → detalle.
          En pantallas anchas: parámetros a la izquierda, cuota y detalle a la derecha. */}
      <div className="grid grid-cols-1 @3xl:grid-cols-[minmax(0,1fr)_300px] gap-x-6 gap-y-4 p-4 @xl:p-5">
        {/* Parámetros editables */}
        <div className="@3xl:row-span-2 divide-y divide-slate-800">
          {/* 1. Precio del vehículo */}
          <div className="pb-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="sim-price-input" className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Precio del vehículo
              </label>
              <div className="relative flex items-center w-36">
                <span className="absolute left-2.5 text-slate-400 font-bold text-xs">$</span>
                <input
                  id="sim-price-input"
                  type="number"
                  inputMode="numeric"
                  min={1000}
                  max={250000}
                  step={100}
                  value={price === 0 ? '' : price}
                  onChange={(e) => handlePriceChange(Number(e.target.value))}
                  placeholder="20000"
                  className={`${inputBase} pl-6 pr-2.5 text-white focus:border-white focus:ring-white`}
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
              aria-label="Precio del vehículo"
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-200"
            />
          </div>

          {/* 2. Prima inicial ($ y %) */}
          <div className="py-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="sim-down-input" className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Prima inicial
              </label>
              <div className="flex items-center gap-1.5">
                <div className="relative flex items-center w-28">
                  <span className="absolute left-2.5 text-slate-400 font-bold text-xs">$</span>
                  <input
                    id="sim-down-input"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={price}
                    step={100}
                    value={downPayment === 0 ? '' : downPayment}
                    onChange={(e) => handleDownPaymentChange(Number(e.target.value))}
                    className={`${inputBase} pl-6 pr-2 text-white focus:border-white focus:ring-white`}
                  />
                </div>
                <div className="relative flex items-center w-16">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={10}
                    max={80}
                    step={1}
                    value={downPercent}
                    onChange={(e) => handleDownPercentChange(Number(e.target.value))}
                    aria-label="Porcentaje de prima"
                    className={`${inputBase} pl-1.5 pr-5 text-emerald-400 focus:border-white focus:ring-white`}
                  />
                  <span className="absolute right-1.5 text-slate-400 text-xs font-bold">%</span>
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
              aria-label="Porcentaje de prima"
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
          </div>

          {/* 3. Plazo */}
          <div className="py-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="sim-term-input" className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Plazo
              </label>
              <div className="relative flex items-center w-28">
                <input
                  id="sim-term-input"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={120}
                  step={1}
                  value={termMonths === 0 ? '' : termMonths}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setTermMonths(isNaN(val) ? 0 : Math.max(0, Math.min(120, val)));
                  }}
                  placeholder="36"
                  className={`${inputBase} pl-2 pr-12 text-white focus:border-white focus:ring-white`}
                />
                <span className="absolute right-2.5 text-slate-400 text-xs font-bold">meses</span>
              </div>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {[12, 24, 36, 48, 60, 72].map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setTermMonths(term)}
                  className={`py-1.5 rounded-lg text-xs font-bold font-mono transition-all border cursor-pointer ${
                    termMonths === term
                      ? 'bg-slate-100 text-slate-950 border-white'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-500 hover:text-white'
                  }`}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Tasa de interés mensual */}
          <div className="pt-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="sim-rate-input" className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-300">
                <Percent className="w-3.5 h-3.5 text-cyan-400" />
                Tasa mensual
              </label>
              <div className="relative flex items-center w-24">
                <input
                  id="sim-rate-input"
                  type="number"
                  inputMode="decimal"
                  min={0.1}
                  max={10.0}
                  step={0.05}
                  value={monthlyRatePercent}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setMonthlyRatePercent(isNaN(val) ? 0 : Math.max(0, Math.min(25, val)));
                  }}
                  className={`${inputBase} pl-2 pr-6 text-cyan-300 focus:border-cyan-400 focus:ring-cyan-400`}
                />
                <span className="absolute right-2 text-slate-400 text-xs font-bold">%</span>
              </div>
            </div>
            <input
              type="range"
              min={0.5}
              max={4.0}
              step={0.05}
              value={monthlyRatePercent}
              onChange={(e) => setMonthlyRatePercent(parseFloat(e.target.value))}
              aria-label="Tasa mensual"
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-slate-400 font-mono">
              <span>
                Anual {(monthlyRatePercent * 12).toFixed(2)}% · TEA{' '}
                <span className="text-emerald-400">
                  {((Math.pow(1 + monthlyRatePercent / 100, 12) - 1) * 100).toFixed(2)}%
                </span>
              </span>
              {monthlyRatePercent !== defaultSystemRate ? (
                <button
                  type="button"
                  onClick={() => setMonthlyRatePercent(defaultSystemRate)}
                  className="font-sans text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Usar tasa oficial ({defaultSystemRate.toFixed(2)}%)
                </button>
              ) : (
                <span className="font-sans text-cyan-400/80">Tasa oficial</span>
              )}
            </div>
          </div>
        </div>

        {/* Cuota mensual + solicitud: se queda fija abajo en celular mientras se ajustan los parámetros */}
        <div className="sticky bottom-2 z-10 @3xl:static p-4 rounded-xl bg-slate-800/95 @3xl:bg-gradient-to-b @3xl:from-slate-800/90 @3xl:to-slate-900 border border-slate-700 shadow-xl backdrop-blur">
          <div className="flex items-center justify-between gap-3 @3xl:flex-col @3xl:items-stretch">
            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                Cuota mensual · {termMonths || 36} meses
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl @3xl:text-3xl font-black text-white tracking-tight font-mono truncate">
                  {simulationData ? formatUSD(simulationData.installment) : '...'}
                </span>
                <span className="text-xs text-slate-400">/mes</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (onApplyLead && simulationData) {
                  onApplyLead({
                    price,
                    down: downPayment,
                    term: termMonths,
                    installment: Number(simulationData.installment),
                    monthlyRate: monthlyRatePercent / 100,
                  });
                }
              }}
              className="shrink-0 py-2.5 @3xl:py-3 px-4 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-100 hover:bg-white text-slate-950 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <span>Solicitar</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>

        {/* Resumen del crédito */}
        <div className="space-y-3">
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <dt className="text-[10px] text-slate-400">Capital a financiar</dt>
              <dd className="font-bold text-white font-mono">
                {simulationData ? formatUSD(simulationData.principal) : '-'}
              </dd>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <dt className="text-[10px] text-slate-400">Prima</dt>
              <dd className="font-bold text-emerald-400 font-mono">{formatUSD(downPayment)}</dd>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <dt className="text-[10px] text-slate-400">Intereses estimados</dt>
              <dd className="font-semibold text-slate-300 font-mono">
                {simulationData ? formatUSD(simulationData.totalInterest) : '-'}
              </dd>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <dt className="text-[10px] text-slate-400">Total a pagar</dt>
              <dd className="font-bold text-white font-mono">
                {simulationData ? formatUSD(simulationData.totalPayments) : '-'}
              </dd>
            </div>
          </dl>

          {simulationData?.schedule?.length > 0 && (
            <button
              type="button"
              onClick={() => setShowSchedule(!showSchedule)}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 transition-colors cursor-pointer"
            >
              <span>{showSchedule ? 'Ocultar tabla de amortización' : 'Ver tabla de amortización'}</span>
              {showSchedule ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}

          <p className="text-[10px] text-slate-500 leading-relaxed">
            * Estimación sujeta a aprobación crediticia conforme a políticas de crédito de VELTOR.
          </p>
        </div>
      </div>

      {/* Tabla de Amortización con "Saldo a la Fecha" */}
      {showSchedule && simulationData?.schedule?.length > 0 && (
        <div className="px-4 pb-4 @xl:px-5 @xl:pb-5 pt-4 border-t border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Amortización ({termMonths} cuotas)
            </h4>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Saldo a la fecha:</span>
              <span className="font-mono font-bold text-emerald-400">{formatUSD(simulationData.principal)}</span>
            </div>
          </div>

          <div className="max-h-72 overflow-auto rounded-xl border border-slate-700/70">
            <table className="w-full text-left text-[11px] @xl:text-xs text-slate-300 whitespace-nowrap">
              <thead className="sticky top-0 bg-slate-800 text-slate-200 uppercase font-bold text-[10px]">
                <tr>
                  <th className="py-2 px-2.5">#</th>
                  <th className="py-2 px-2.5">Vence</th>
                  <th className="hidden @2xl:table-cell py-2 px-2.5 text-right">Saldo Inicial</th>
                  <th className="py-2 px-2.5 text-right">Capital</th>
                  <th className="py-2 px-2.5 text-right">Interés</th>
                  <th className="hidden @xl:table-cell py-2 px-2.5 text-right">Cuota</th>
                  <th className="py-2 px-2.5 text-right text-white">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/60 font-mono">
                {simulationData.schedule.map((row: any) => (
                  <tr key={row.number} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-1.5 px-2.5 font-bold text-slate-400">{row.number}</td>
                    <td className="py-1.5 px-2.5 font-sans text-slate-300">{formatDateSV(row.dueDate)}</td>
                    <td className="hidden @2xl:table-cell py-1.5 px-2.5 text-right text-slate-400">{formatUSD(row.openingBalance)}</td>
                    <td className="py-1.5 px-2.5 text-right text-emerald-400">{formatUSD(row.principal)}</td>
                    <td className="py-1.5 px-2.5 text-right text-slate-400">{formatUSD(row.interest)}</td>
                    <td className="hidden @xl:table-cell py-1.5 px-2.5 text-right font-bold text-white">{formatUSD(row.payment)}</td>
                    <td className="py-1.5 px-2.5 text-right font-bold text-slate-200">{formatUSD(row.closingBalance)}</td>
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
