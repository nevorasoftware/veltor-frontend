// App instalable (PWA): captura del aviso de instalación de Android/Chrome, detección de plataforma y
// registro del service worker. Se importa en main.tsx antes del primer render para no perder el evento
// beforeinstallprompt, que el navegador dispara una sola vez al cargar.
import { API_URL } from '../config/branding';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // se muestra nuestro propio aviso
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    notify();
  });
  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    });
  }
}

export const subscribeInstall = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const canPromptInstall = () => !!deferred;

/** Abre el diálogo nativo de instalación (Android/Chrome). Devuelve true si el usuario aceptó. */
export async function promptInstall(): Promise<boolean> {
  const ev = deferred;
  if (!ev) return false;
  deferred = null;
  await ev.prompt();
  const { outcome } = await ev.userChoice.catch(() => ({ outcome: 'dismissed' as const }));
  if (outcome === 'accepted') installed = true;
  notify();
  return outcome === 'accepted';
}

export type Platform = 'ios' | 'android' | 'other';

export function detectPlatform(): Platform {
  const ua = navigator.userAgent || '';
  // iPadOS se presenta como Mac con pantalla táctil
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'other';
}

/** ¿Ya se está usando como app instalada? */
export function isStandalone(): boolean {
  return (
    installed ||
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export const isMobile = () => detectPlatform() !== 'other' || !!window.matchMedia?.('(pointer: coarse) and (max-width: 900px)').matches;

/** Safari de iOS (los otros navegadores de iOS también permiten "Agregar a inicio" desde Compartir desde iOS 16.4) */
export const isIosSafari = () => detectPlatform() === 'ios' && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);

// ---- Aviso visible: aparece cada vez que se entra al sitio sin la app instalada. Al cerrarlo solo se
// oculta durante esa visita (sessionStorage); se puede volver a abrir desde el login.
const DISMISS_KEY = 'pwa-install-dismissed';
let forcedOpen = false;
let dismissedThisVisit = false;

export function wasDismissedRecently(): boolean {
  if (dismissedThisVisit) return true;
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissInstall() {
  forcedOpen = false;
  dismissedThisVisit = true;
  try {
    sessionStorage.setItem(DISMISS_KEY, '1');
  } catch {
    /* almacenamiento no disponible */
  }
  notify();
}

export function openInstallHelp() {
  forcedOpen = true;
  notify();
}

export const isForcedOpen = () => forcedOpen;

/** <link rel="manifest"> con el nombre y los colores de la empresa (lo genera la API) y el título de iOS. */
export function applyAppManifest(company: { slug: string; name: string; primaryColor: string }) {
  const href = `${API_URL}/public/manifest.webmanifest?empresa=${encodeURIComponent(company.slug)}&origin=${encodeURIComponent(window.location.origin)}`;
  let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'manifest';
    document.head.appendChild(link);
  }
  if (link.href !== href) link.href = href;

  let title = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
  if (!title) {
    title = document.createElement('meta');
    title.name = 'apple-mobile-web-app-title';
    document.head.appendChild(title);
  }
  title.content = company.name;
}
