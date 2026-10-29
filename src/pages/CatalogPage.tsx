import React, { useState, useEffect, useMemo } from 'react';
import { Search, Car, Check } from 'lucide-react';
import { LeadModal } from '../components/LeadModal';
import { FinancingSimulator } from '../components/FinancingSimulator';
import { SECTIONS, formatUSD } from '../config/branding';
import { api } from '../api/client';
import { usePublicSettings } from '../hooks/usePublicSettings';
import { VehicleImage } from '../components/VehicleImage';
import { TRANSMISSION_LABELS, estimatedInstallment, primaryImageUrl, suggestedDownPayment } from '../utils/vehicles';

export const CatalogPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { data: settings } = usePublicSettings();

  // Modal de detalle y cotización
  const [detailVehicle, setDetailVehicle] = useState<any | null>(null);
  const [leadModalOpen, setLeadModalOpen] = useState<boolean>(false);
  const [simulationSummary, setSimulationSummary] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    api
      .getVehicles('limit=100')
      .then((res) => setVehicles(res?.items || []))
      .catch((err) => setLoadError(err.message || 'No fue posible cargar el catálogo.'))
      .finally(() => setLoading(false));
  }, []);

  // Opciones de filtro derivadas del inventario real
  const brands = useMemo(() => [...new Set(vehicles.map((v) => v.brand))].sort(), [vehicles]);
  const types = useMemo(() => [...new Set(vehicles.map((v) => v.type))].sort(), [vehicles]);
  const priceCeiling = useMemo(() => {
    const top = Math.max(0, ...vehicles.map((v) => Number(v.salePrice) || 0));
    return Math.ceil(top / 1000) * 1000;
  }, [vehicles]);
  const effectiveMaxPrice = maxPrice ?? priceCeiling;

  const filteredVehicles = vehicles.filter((v) => {
    const q = search.trim().toLowerCase();
    const matchSearch = q === '' || `${v.brand} ${v.model}`.toLowerCase().includes(q);
    const matchBrand = selectedBrand === 'all' || v.brand === selectedBrand;
    const matchType = selectedType === 'all' || v.type === selectedType;
    const matchPrice = Number(v.salePrice) <= effectiveMaxPrice;
    return matchSearch && matchBrand && matchType && matchPrice;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Encabezado */}
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Catálogo Oficial
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          {SECTIONS.catalog}
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mt-1">
          Todos los vehículos cuentan con inspección técnica certificada, historial legal transparente y opciones de financiamiento con cuotas niveladas.
        </p>
      </div>

      {/* Barra de Filtros */}
      <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-slate-700/80 bg-[#0F172A]/90 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Búsqueda */}
        <div className="relative">
          <label htmlFor="cat-search" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Buscar
          </label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              id="cat-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Marca o modelo..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-400"
            />
          </div>
        </div>

        {/* Marca */}
        <div>
          <label htmlFor="cat-brand" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Marca
          </label>
          <select
            id="cat-brand"
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-slate-400"
          >
            <option value="all">Todas las marcas</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {/* Tipo */}
        <div>
          <label htmlFor="cat-type" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Tipo de Carrocería
          </label>
          <select
            id="cat-type"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-slate-400"
          >
            <option value="all">Todos los tipos</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Precio Máximo */}
        <div>
          <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            <span>Precio Máx.</span>
            <span className="text-white font-mono">{formatUSD(effectiveMaxPrice)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={priceCeiling}
            step={500}
            disabled={vehicles.length === 0}
            value={effectiveMaxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-300 mt-2"
          />
        </div>
      </div>

      {/* Grid de Vehículos */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 text-sm">
          Cargando vehículos disponibles...
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="text-center py-16 glass-panel rounded-2xl border border-slate-800 text-slate-400 space-y-3">
          <Car className="w-10 h-10 mx-auto text-slate-400" />
          <h3 className="text-base font-bold text-white">
            {loadError ? 'No fue posible cargar el catálogo' : vehicles.length === 0 ? 'Aún no hay vehículos publicados' : 'No se encontraron vehículos'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {loadError
              ? 'Intenta nuevamente en unos minutos.'
              : vehicles.length === 0
              ? 'Pronto publicaremos nuevas unidades. Mientras tanto puedes usar el simulador de financiamiento.'
              : 'Intenta ajustar los filtros de precio, tipo o marca para ver más opciones disponibles.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredVehicles.map((v) => {
            const cuotaEstimada = estimatedInstallment(v, settings);

            return (
              <div
                key={v.id}
                className="glass-panel glass-panel-hover rounded-2xl overflow-hidden border border-slate-700/80 bg-[#0F172A] flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-52 w-full overflow-hidden bg-slate-800">
                    <VehicleImage src={primaryImageUrl(v)} alt={`${v.brand} ${v.model}`} />
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-slate-900/80 backdrop-blur-md text-[11px] font-bold text-white border border-slate-700">
                      {v.type || 'Vehículo'} · {v.year}
                    </div>
                    <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-md bg-emerald-500/90 text-[10px] font-black uppercase text-slate-950 tracking-wider">
                      Disponible
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="text-xl font-bold text-white tracking-wide">
                        {v.brand} {v.model}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                        <span>{Number(v.mileageKm || 0).toLocaleString('es-SV')} km</span>
                        <span>·</span>
                        <span>{v.color}</span>
                        <span>·</span>
                        <span>{TRANSMISSION_LABELS[v.transmission] || v.transmission}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-baseline justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Precio Contado
                        </span>
                        <span className="text-2xl font-black text-white">
                          {formatUSD(v.salePrice)}
                        </span>
                      </div>
                      {cuotaEstimada !== null && (
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Cuota Estimada
                          </span>
                          <span className="text-sm font-extrabold text-emerald-400">
                            {formatUSD(cuotaEstimada)}/mes
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-slate-400 line-clamp-2">
                      {v.description}
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0 flex gap-2">
                  <button
                    onClick={() => setDetailVehicle(v)}
                    className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 transition-colors"
                  >
                    Ver Ficha
                  </button>
                  <button
                    onClick={() => {
                      setDetailVehicle(v);
                      setSimulationSummary(null);
                      setLeadModalOpen(true);
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-100 hover:bg-white text-slate-900 transition-colors shadow"
                  >
                    Solicitar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Detalle de Vehículo y Ficha Técnica */}
      {detailVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-6xl glass-panel rounded-3xl border border-slate-700 bg-[#0F172A] p-5 sm:p-8 shadow-2xl my-6">
            <button
              onClick={() => setDetailVehicle(null)}
              className="absolute top-5 right-5 z-10 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 border border-slate-700 transition-colors"
            >
              ✕
            </button>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 items-start">
              {/* Galería e Info Básica */}
              <div className="xl:col-span-5 space-y-4">
                <div className="h-64 sm:h-72 rounded-2xl overflow-hidden bg-slate-800 border border-slate-700">
                  <VehicleImage src={primaryImageUrl(detailVehicle)} alt={`${detailVehicle.brand} ${detailVehicle.model}`} />
                </div>

                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {detailVehicle.brand} · Año {detailVehicle.year}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white">
                    {detailVehicle.brand} {detailVehicle.model}
                  </h2>
                  <p className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">
                    {formatUSD(detailVehicle.salePrice)}
                  </p>
                </div>

                <div className="space-y-2 text-xs text-slate-300">
                  <h4 className="font-bold uppercase tracking-wider text-slate-400 text-[11px]">
                    Equipamiento y Características
                  </h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(detailVehicle.features || []).map((f: string, i: number) => (
                      <li key={i} className="flex items-center gap-2 bg-slate-800/40 p-2 rounded-lg border border-slate-700/50">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Simulador Integrado para este vehículo */}
              <div className="xl:col-span-7">
                <FinancingSimulator
                  initialPrice={detailVehicle.salePrice}
                  initialDownPayment={suggestedDownPayment(detailVehicle, settings)}
                  vehicleName={`${detailVehicle.brand} ${detailVehicle.model}`}
                  onApplyLead={(summary) => {
                    setSimulationSummary(summary);
                    setLeadModalOpen(true);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Solicitud de Crédito */}
      <LeadModal
        isOpen={leadModalOpen}
        onClose={() => setLeadModalOpen(false)}
        vehicle={detailVehicle}
        initialTerms={simulationSummary}
      />
    </div>
  );
};
