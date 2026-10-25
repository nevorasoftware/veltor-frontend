import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Award, Clock, ChevronRight, Sparkles } from 'lucide-react';
import { FinancingSimulator } from '../components/FinancingSimulator';
import { LeadModal } from '../components/LeadModal';
import { BRANDING, SECTIONS, formatUSD } from '../config/branding';
import { api } from '../api/client';

export const HomePage: React.FC = () => {
  const [featuredVehicles, setFeaturedVehicles] = useState<any[]>([]);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

  // Carga de vehículos destacados desde API con fallback a datos locales
  useEffect(() => {
    api.getVehicles('limit=3')
      .then((res) => {
        if (res?.items?.length > 0) {
          setFeaturedVehicles(res.items);
        } else {
          setFallbackVehicles();
        }
      })
      .catch(() => {
        setFallbackVehicles();
      });
  }, []);

  const setFallbackVehicles = () => {
    setFeaturedVehicles([
      {
        id: 'v1',
        brand: 'Toyota',
        model: 'Corolla LE',
        year: 2023,
        type: 'Sedán',
        salePrice: 19800,
        minDownPayment: 2970,
        mileageKm: 24500,
        transmission: 'AUTOMATIC',
        images: [{ url: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=800&q=80' }],
      },
      {
        id: 'v2',
        brand: 'Honda',
        model: 'CR-V EX',
        year: 2022,
        type: 'SUV',
        salePrice: 26500,
        minDownPayment: 3975,
        mileageKm: 38200,
        transmission: 'AUTOMATIC',
        images: [{ url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80' }],
      },
      {
        id: 'v3',
        brand: 'Nissan',
        model: 'Frontier PRO-4X',
        year: 2024,
        type: 'Pickup',
        salePrice: 38900,
        minDownPayment: 5835,
        mileageKm: 9800,
        transmission: 'AUTOMATIC',
        images: [{ url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80' }],
      },
    ]);
  };

  const handleApplyFromSimulator = () => {
    setSelectedVehicle(null);
    setLeadModalOpen(true);
  };

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative pt-12 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1C2541]/40 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-semibold text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-slate-200" />
              <span>Plataforma Oficial VELTOR · El Salvador</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
              {BRANDING.tagline}
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
              Accede a planes de financiamiento vehicular transparentes, con cuotas fijas, amortización matemática verificable y gestión digital de principio a fin.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                to="/catalogo"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs bg-slate-100 hover:bg-white text-slate-900 transition-all shadow-lg hover:shadow-xl"
              >
                <span>Explorar Vehículos</span>
                <ArrowRight className="w-4 h-4 text-slate-900" />
              </Link>
              <Link
                to="/simulador"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs text-slate-200 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition-all"
              >
                <span>{SECTIONS.simulator}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Simulador Interactivo Destacado */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FinancingSimulator onApplyLead={handleApplyFromSimulator} />
      </section>

      {/* Vehículos Disponibles Destacados */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row items-baseline justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Inventario Seleccionado
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {SECTIONS.catalog}
            </h2>
          </div>
          <Link
            to="/catalogo"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white uppercase tracking-wider transition-colors"
          >
            <span>Ver todo el catálogo</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {featuredVehicles.map((v) => {
            const imgUrl = v.images?.[0]?.url || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80';
            const cuotaEstimada = Math.round((v.salePrice - (v.minDownPayment || v.salePrice * 0.15)) * 0.035);

            return (
              <div
                key={v.id}
                className="glass-panel glass-panel-hover rounded-2xl overflow-hidden border border-slate-700/80 bg-[#0F172A] flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-48 w-full overflow-hidden bg-slate-800">
                    <img
                      src={imgUrl}
                      alt={`${v.brand} ${v.model}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-slate-900/80 backdrop-blur-md text-[11px] font-bold text-white border border-slate-700">
                      {v.type || 'Vehículo'} · {v.year}
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div>
                      <h3 className="text-lg font-bold text-white tracking-wide">
                        {v.brand} {v.model}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {v.mileageKm?.toLocaleString()} km · Transmisión automática
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-baseline justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Precio de Venta
                        </span>
                        <span className="text-xl font-extrabold text-white">
                          {formatUSD(v.salePrice)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Cuota Estimada
                        </span>
                        <span className="text-sm font-bold text-emerald-400">
                          desde {formatUSD(cuotaEstimada)}/mes
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <button
                    onClick={() => {
                      setSelectedVehicle(v);
                      setLeadModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 transition-colors"
                  >
                    <span>Cotizar este Vehículo</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Ventajas y Respaldos */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-panel rounded-3xl p-8 sm:p-12 border border-slate-800 bg-[#070D1E]/70">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Transparencia y Precisión
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              ¿Por qué financiar con VELTOR?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3 p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50">
              <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200">
                <Shield className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-white">Aritmética Decimal Exacta</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Sin sorpresas en tus estados de cuenta. Cada centavo, interés diario y abono extraordinario se calcula con precisión matemática bancaria.
              </p>
            </div>

            <div className="space-y-3 p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50">
              <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200">
                <Clock className="w-6 h-6 text-slate-300" />
              </div>
              <h3 className="text-base font-bold text-white">Abonos a Capital Flexibles</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Realiza aportes extraordinarios en cualquier momento. Elige entre reducir el plazo de tu crédito o disminuir tu cuota mensual.
              </p>
            </div>

            <div className="space-y-3 p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50">
              <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200">
                <Award className="w-6 h-6 text-slate-300" />
              </div>
              <h3 className="text-base font-bold text-white">Portal Privado 24/7</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Accede a {SECTIONS.clientPortal} para consultar saldos en tiempo real, descargar recibos, verificar proyecciones y consultar tu historial.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Modal de Solicitud de Información */}
      <LeadModal
        isOpen={leadModalOpen}
        onClose={() => setLeadModalOpen(false)}
        vehicle={selectedVehicle}
      />
    </div>
  );
};
