// Service worker mínimo de la app instalable (PWA).
// No guarda en caché los datos del sistema (créditos, pagos, sesión): todo va siempre a la red.
// Solo muestra una página sencilla si no hay conexión al abrir la app.
const OFFLINE_HTML = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sin conexión</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0B132B;color:#e2e8f0;font-family:system-ui,sans-serif;text-align:center;padding:24px}
button{margin-top:16px;padding:12px 20px;border:0;border-radius:12px;background:#38bdf8;color:#0f172a;font-weight:700}</style></head>
<body><div><h1 style="font-size:20px">Sin conexión a internet</h1><p style="color:#94a3b8;font-size:14px">Revise su conexión e intente de nuevo.</p>
<button onclick="location.reload()">Reintentar</button></div></body></html>`;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  // Solo la navegación (abrir una página); el resto lo maneja el navegador sin intervenir
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(() => new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })),
  );
});
