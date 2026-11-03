# VELTOR — Frontend & Portal Digital

> **Financiamiento inteligente. Movilidad a tu alcance.**  
> Plataforma web de gestión, catálogo y financiamiento digital de vehículos desarrollada y respaldada por **Nevora Software**.

---

## 1. Identidad de Marca y Diseño

- **Nombre comercial:** VELTOR
- **Empresa desarrolladora:** Nevora Software
- **Mercado:** El Salvador (Moneda: USD, Fechas: Formato `es-SV`)
- **Pie de página oficial:** *"VELTOR — Una solución tecnológica de Nevora Software"*
- **Repositorio oficial:** `https://github.com/nevorasoftware/veltor-frontend.git`

### Paleta Visual y Estilo
- **Azul Noche (`#0B132B`):** Estructura principal, headers y navegación.
- **Grafito (`#1E293B`):** Fondos secundarios y tarjetas glassmorphism.
- **Plata y Blanco (`#E2E8F0` / `#FFFFFF`):** Textos y datos numéricos de alta legibilidad.
- **Gris Neutro (`#64748B`):** Subtítulos, metadatos y divisores sutiles.
- **Estados funcionales:** Esmeralda (Al día/Aprobado), Ámbar (En revisión/Pendiente) y Carmesí (Mora/Rechazado).

---

## 2. Módulos y Experiencia de Usuario

| Módulo | Ruta | Descripción |
|---|---|---|
| **Página de Inicio** | `/` | Hero interactivo con llamada a la acción, beneficios, flota destacada y calculadora integrada |
| **Catálogo de Flota** | `/catalogo` | Explorador de inventario con filtros por marca, tipo de carrocería, transmisión y rango de precio |
| **Simulador Financiero** | `/simulador` | Calculadora en tiempo real con cuota nivelada francesa, desglose de intereses, prima y tabla de amortización |
| **Captación de Leads** | Modal interactivo | Formulario para prospectos sin requerir registro, con consentimiento de privacidad explícito |
| **Panel de Administración** | `/admin` | Dashboard para analistas y administradores: métricas de cartera, pipeline de prospectos y gestión de créditos |
| **Portal del Cliente** | `/portal` | **Mi VELTOR**: Saldo de capital actual, cuota exigible, historial de pagos y descargas oficiales en PDF |
| **Acceso Seguro** | `/login` | Autenticación basada en roles (Superadmin, Administrador, Analista de Crédito, Cliente) |

---

## 3. Tecnologías

- **Framework:** React 19 + TypeScript + Vite
- **Estilos:** Tailwind CSS v4 + Vanilla CSS tokens + Glassmorphism
- **Iconografía:** Lucide React
- **Enrutamiento:** React Router DOM v7
- **Cliente API:** Módulo `api/client.ts` con manejo de tokens JWT, headers de empresa y endpoints PDF
- **Servidor Web:** Nginx Alpine para producción

---

## 4. Ejecución Local

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo en Vite
npm run dev
```

La aplicación estará disponible de forma predeterminada en `http://localhost:5173`.

---

## 5. Despliegue en Producción (Railway / Docker)

El proyecto cuenta con un `Dockerfile` multi-etapa y un servidor web Nginx con compresión Gzip y soporte para rutas SPA.

1. Conectar el repositorio `nevorasoftware/veltor-frontend` en Railway.
2. Definir la variable de entorno `VITE_API_URL` apuntando a la URL pública del backend (por ejemplo: `https://backend-production.up.railway.app/api/v1`).
3. Railway construirá la imagen y publicará el servicio web automáticamente.

---

*VELTOR — Una solución tecnológica de Nevora Software*

## Variables de entorno

Ver `.env.example`. La única variable es `VITE_API_URL` (URL de la API con prefijo `/api/v1`), que se inyecta en el build de Vite.

## Multiempresa

- Al iniciar, `TenantProvider` (`src/tenant/`) carga `GET /public/tenant` y aplica el nombre, el logo, el favicon, el título y los colores de la empresa como variables CSS (`--brand-primary`, `--brand-secondary`, `--brand-accent`). Los componentes los leen con `useTenant()`.
- La empresa se resuelve por `?empresa=slug` (se guarda en la pestaña y viaja en el header `X-Tenant`), por el dominio o, en su defecto, la empresa por defecto. Con sesión iniciada manda la empresa del usuario.
- Los montos, fechas y zona horaria usan el `locale`, la `currency` y el `timezone` de la empresa (`src/utils/format.ts`).
- El SUPERADMIN entra a `/plataforma` para crear y editar empresas, activar o desactivar, registrar administradores y "Entrar como soporte" (header `X-Company-Id`, con un aviso visible).
- El ADMIN de cada empresa edita su marca y contactos en **Panel → Mi empresa**.

El sitio no incluye datos de demostración: la marca, los contactos, el catálogo, los parámetros del simulador, los créditos y los gastos provienen únicamente de la API. El contrato está en `docs/MULTITENANT-CONTRATO.md`.
