import React, { useState } from 'react';
import { X, CheckCircle, Shield, Send, Car } from 'lucide-react';
import { api } from '../api/client';
import { formatUSD } from '../config/branding';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle?: {
    id: string;
    brand: string;
    model: string;
    year: number;
    salePrice: number;
  };
  initialTerms?: {
    price?: number;
    down?: number;
    term?: number;
    installment?: number;
    monthlyRate?: number;
  };
}

export const LeadModal: React.FC<LeadModalProps> = ({ isOpen, onClose, vehicle, initialTerms }) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(true);
  const [loading, setLoading] = useState(false);
  const [successCode, setSuccessCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privacyAccepted) {
      setErrorMsg('Debe aceptar el aviso de privacidad.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.submitLead({
        fullName,
        phone,
        email,
        message: message || (vehicle ? `Interés en financiar ${vehicle.brand} ${vehicle.model} (${vehicle.year})` : 'Solicitud de financiamiento general'),
        source: vehicle ? 'CATALOG_REQUEST' : 'SIMULATOR_LEAD',
        vehicleId: vehicle?.id,
        estimatedDown: initialTerms?.down,
        termMonths: initialTerms?.term,
        privacyAccepted: true,
      });

      setSuccessCode(res.code || 'PROS-OK');
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocurrió un error al enviar su solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg glass-panel rounded-2xl border border-slate-700 bg-[#0F172A] p-6 sm:p-8 shadow-2xl text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Cerrar ventana"
        >
          <X className="w-5 h-5" />
        </button>

        {successCode ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-white">¡Solicitud Recibida!</h3>
            <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
              Un asesor de crédito de VELTOR se comunicará contigo al número proporcionado para dar seguimiento a tu financiamiento.
            </p>
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 font-mono text-sm text-slate-200">
              Código de trámite: <span className="font-bold text-white">{successCode}</span>
            </div>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-100 hover:bg-white text-slate-900 transition-colors"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                VELTOR · Solicitud de Financiamiento
              </span>
              <h3 className="text-xl font-extrabold text-white">
                {vehicle ? `${vehicle.brand} ${vehicle.model} ${vehicle.year}` : 'Solicita tu Financiamiento'}
              </h3>
              {vehicle ? (
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-300 font-medium">
                  <Car className="w-4 h-4 text-slate-400" />
                  <span>Precio: {formatUSD(vehicle.salePrice)}</span>
                  {initialTerms?.installment && (
                    <span className="text-emerald-400 font-semibold">
                      · Cuota estimada: {formatUSD(initialTerms.installment)}/mes
                    </span>
                  )}
                </div>
              ) : initialTerms ? (
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-300 font-medium">
                  {initialTerms.price && <span>Precio: {formatUSD(initialTerms.price)}</span>}
                  {initialTerms.down !== undefined && <span>· Prima: {formatUSD(initialTerms.down)}</span>}
                  {initialTerms.term && <span>· Plazo: {initialTerms.term} meses</span>}
                  {initialTerms.monthlyRate !== undefined && (
                    <span className="text-cyan-400 font-semibold">
                      · Tasa: {(initialTerms.monthlyRate * 100).toFixed(2)}% m.
                    </span>
                  )}
                  {initialTerms.installment && (
                    <span className="text-emerald-400 font-semibold">
                      · Cuota: {formatUSD(initialTerms.installment)}/mes
                    </span>
                  )}
                </div>
              ) : null}
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej. Roberto Sánchez Martínez"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-400 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Teléfono Móvil (WhatsApp) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej. 7700-1122"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-400 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mensaje u Observaciones (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="¿Deseas consultar sobre una prima específica o programar una llamada?"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-400 transition-colors"
                />
              </div>

              <div className="flex items-start gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="privacy"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  className="mt-1 rounded bg-slate-800 border-slate-700 text-slate-200 focus:ring-0"
                />
                <label htmlFor="privacy" className="text-[11px] text-slate-400 leading-tight">
                  Acepto el tratamiento de mis datos de contacto para la evaluación crediticia y confirmo haber leído el aviso de privacidad de VELTOR.
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-100 hover:bg-white text-slate-900 transition-all shadow-md disabled:opacity-50"
              >
                <Send className="w-4 h-4 text-slate-900" />
                <span>{loading ? 'Enviando Solicitud...' : 'Enviar Solicitud sin Compromiso'}</span>
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-1">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <span>No se requiere pago inicial para cotizar</span>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
