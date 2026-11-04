import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, MoreVertical, PlusSquare, Share, X } from 'lucide-react';
import { useTenant } from '../tenant/TenantContext';
import {
  canPromptInstall,
  detectPlatform,
  dismissInstall,
  isForcedOpen,
  isIosSafari,
  isMobile,
  isStandalone,
  promptInstall,
  subscribeInstall,
  wasDismissedRecently,
} from '../pwa/install';

const snapshot = () => `${canPromptInstall()}|${isForcedOpen()}|${isStandalone()}|${wasDismissedRecently()}`;

/**
 * Aviso para instalar el sistema como app (acceso directo) en el teléfono.
 * Android/Chrome: botón "Instalar" con el diálogo nativo. iPhone/iPad: pasos de Compartir → Agregar a inicio.
 * Otros navegadores Android: pasos desde el menú ⋮. No aparece en computadora ni dentro de la app instalada.
 * Se muestra en cada visita mientras no esté instalada; cerrarlo lo oculta solo durante esa visita.
 */
export const InstallAppBanner: React.FC = () => {
  const { tenant, logoSrc } = useTenant();
  const location = useLocation();
  useSyncExternalStore(subscribeInstall, snapshot);
  // Se muestra unos segundos después de cargar para no tapar el contenido de entrada
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 2500);
    return () => clearTimeout(t);
  }, []);

  const forced = isForcedOpen();
  const hiddenRoute = location.pathname.startsWith('/registro');
  if (isStandalone() || !isMobile() || (!forced && (!ready || wasDismissedRecently() || hiddenRoute))) return null;

  const platform = detectPlatform();
  const canPrompt = canPromptInstall();

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4 pointer-events-none" role="dialog" aria-label="Instalar la aplicación">
      <div className="pwa-card pointer-events-auto mx-auto max-w-md rounded-2xl p-4 space-y-3">
        <div className="flex items-start gap-3">
          <img
            src={logoSrc || '/pwa/icon-192.png'}
            alt=""
            className="pwa-icon w-12 h-12 rounded-xl object-contain bg-white/5 shrink-0 shadow-lg"
            onError={(e) => ((e.target as HTMLImageElement).src = '/pwa/icon-192.png')}
          />
          <div className="flex-1 min-w-0">
            <span className="pwa-badge inline-block mb-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
              App disponible
            </span>
            <p className="text-base font-extrabold text-white leading-tight">Instale {tenant.name} en su teléfono</p>
            <p className="mt-0.5 text-xs text-slate-300">Acceso directo en su pantalla de inicio para entrar más rápido, como una app.</p>
          </div>
          <button onClick={dismissInstall} aria-label="Cerrar" className="p-1 -m-1 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {canPrompt ? (
          <button
            onClick={() => promptInstall()}
            className="pwa-shine w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-extrabold uppercase tracking-wider btn-brand shadow-lg cursor-pointer"
          >
            <Download className="w-4 h-4" /> Instalar app
          </button>
        ) : platform === 'ios' ? (
          <ol className="text-[13px] text-slate-200 space-y-2">
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full pwa-badge text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
              <span>
                Toque <Share className="inline w-4 h-4 -mt-0.5 text-sky-400" /> <b>Compartir</b>{' '}
                {isIosSafari() ? 'en la barra inferior de Safari' : 'en el menú del navegador'}.
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full pwa-badge text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
              <span>
                Elija <PlusSquare className="inline w-4 h-4 -mt-0.5 text-sky-400" /> <b>Agregar a pantalla de inicio</b> (deslice hacia abajo si no lo ve).
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full pwa-badge text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
              <span>Toque <b>Agregar</b>.</span>
            </li>
          </ol>
        ) : (
          <ol className="text-[13px] text-slate-200 space-y-2">
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full pwa-badge text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
              <span>
                Abra el menú <MoreVertical className="inline w-4 h-4 -mt-0.5 text-sky-400" /> del navegador.
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full pwa-badge text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
              <span>
                Elija <b>Instalar aplicación</b> o <b>Agregar a pantalla principal</b>.
              </span>
            </li>
          </ol>
        )}
      </div>
    </div>
  );
};
