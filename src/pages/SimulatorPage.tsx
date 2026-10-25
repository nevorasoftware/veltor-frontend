import React, { useState } from 'react';
import { FinancingSimulator } from '../components/FinancingSimulator';
import { LeadModal } from '../components/LeadModal';
import { SECTIONS } from '../config/branding';
import { ShieldCheck, FileSpreadsheet, Percent } from 'lucide-react';

export const SimulatorPage: React.FC = () => {
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [simulationSummary, setSimulationSummary] = useState<any>(null);

  const handleApply = (summary: any) => {
    setSimulationSummary(summary);
    setLeadModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Encabezado */}
      <div className="max-w-3xl">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Motor Financiero VELTOR
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          {SECTIONS.simulator}
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
          Calcula con total transparencia tu cuota nivelada, los intereses totales y proyecta la amortización completa de tu crédito vehicular utilizando el método francés con precisión decimal bancaria.
        </p>
      </div>

      {/* Componente Simulador */}
      <FinancingSimulator onApplyLead={handleApply} />

      {/* Explicación Técnica y Transparencia Financiera */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
        <div className="p-6 rounded-2xl glass-panel border border-slate-700/80 bg-[#0F172A]/70 space-y-2.5">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200">
            <Percent className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="text-sm font-bold text-white">Método Francés (Cuota Fija)</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            La cuota mensual se mantiene constante durante todo el plazo contractual:
            <code className="block mt-1.5 p-2 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
              Cuota = P × i / (1 - (1 + i)^-n)
            </code>
          </p>
        </div>

        <div className="p-6 rounded-2xl glass-panel border border-slate-700/80 bg-[#0F172A]/70 space-y-2.5">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200">
            <ShieldCheck className="w-5 h-5 text-slate-300" />
          </div>
          <h3 className="text-sm font-bold text-white">Intereses sobre Saldo Insoluto</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Los intereses se calculan únicamente sobre el saldo de capital vivo al corte de cada periodo, asegurando que pagues menos interés a medida que amortizas capital.
          </p>
        </div>

        <div className="p-6 rounded-2xl glass-panel border border-slate-700/80 bg-[#0F172A]/70 space-y-2.5">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200">
            <FileSpreadsheet className="w-5 h-5 text-slate-300" />
          </div>
          <h3 className="text-sm font-bold text-white">Abonos Extraordinarios</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Nuestros contratos permiten aportaciones extraordinarias a capital en cualquier momento, con la opción de reducir el plazo contractual o disminuir el valor de tu cuota mensual.
          </p>
        </div>
      </div>

      <LeadModal
        isOpen={leadModalOpen}
        onClose={() => setLeadModalOpen(false)}
        initialTerms={simulationSummary}
      />
    </div>
  );
};
