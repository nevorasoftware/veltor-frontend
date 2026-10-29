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

          {/* 4. Tasa de Interés Mensual Parametrizable */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/70 space-y-3 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-cyan-400" />
                <label htmlFor="sim-rate-input" className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Tasa de Interés Parametrizable
                </label>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Tasa mensual:</span>
                <div className="relative flex items-center w-28">
                  <input
                    id="sim-rate-input"
                    type="number"
                    min={0.1}
                    max={10.0}
                    step={0.05}
                    value={monthlyRatePercent}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setMonthlyRatePercent(isNaN(val) ? 0 : Math.max(0, Math.min(25, val)));
                    }}
                    className="w-full pl-3 pr-7 py-1.5 bg-slate-900 border border-slate-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-lg text-right font-mono font-bold text-sm text-cyan-300 outline-none"
                  />
                  <span className="absolute right-2 text-slate-400 text-xs font-bold">%</span>
                </div>
              </div>
            </div>

            {/* Slider de Tasa */}
            <div className="space-y-1">
              <input
                type="range"
                min={0.5}
                max={4.0}
                step={0.05}
                value={monthlyRatePercent}
                onChange={(e) => setMonthlyRatePercent(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>0.5% (Mínima)</span>
                <span>2.0% (Media)</span>
                <span>4.0% (Máxima)</span>
              </div>
            </div>

            {/* Chips de selección rápida de tasas */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {[0.99, 1.25, 1.5, 1.75, 2.0].map((rateVal) => (
                <button
                  key={rateVal}
                  type="button"
                  onClick={() => setMonthlyRatePercent(rateVal)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                    monthlyRatePercent === rateVal
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/60 shadow-sm'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200 hover:border-slate-600'
                  }`}
                >
                  {rateVal.toFixed(2)}% {rateVal === defaultSystemRate ? '(Oficial)' : ''}
                </button>
              ))}
              {monthlyRatePercent !== defaultSystemRate && (
                <button
                  type="button"
                  onClick={() => setMonthlyRatePercent(defaultSystemRate)}
                  className="px-2 py-0.5 rounded text-[10px] text-slate-400 hover:text-white underline ml-auto cursor-pointer"
                >
                  Restablecer oficial ({defaultSystemRate.toFixed(2)}%)
                </button>
              )}
            </div>

            {/* Equivalencias Financieras en tiempo real */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-700/60 text-[11px]">
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-center">
                <span className="text-slate-400 block text-[10px]">Tasa Mensual</span>
                <span className="font-mono font-bold text-white text-xs">{monthlyRatePercent.toFixed(2)}%</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-center">
                <span className="text-slate-400 block text-[10px]">Tasa Nominal Anual</span>
                <span className="font-mono font-bold text-cyan-300 text-xs">{(monthlyRatePercent * 12).toFixed(2)}%</span>
              </div>
              <div className="col-span-2 sm:col-span-1 p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-center">
                <span className="text-slate-400 block text-[10px]">TEA Estimada</span>
                <span className="font-mono font-bold text-emerald-400 text-xs">
                  {((Math.pow(1 + monthlyRatePercent / 100, 12) - 1) * 100).toFixed(2)}%
                </span>
              </div>
            </div>
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
                <span>Tasa aplicada:</span>
                <span className="font-bold text-cyan-400 font-mono">
                  {monthlyRatePercent.toFixed(2)}% mensual ({(monthlyRatePercent * 12).toFixed(1)}% anual)
                </span>
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
                    monthlyRate: monthlyRatePercent / 100,
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
