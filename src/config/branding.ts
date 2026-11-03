// =============================================================================
// Configuración de despliegue del frontend.
// La marca, los contactos, las cuentas bancarias y los colores ya no se definen aquí:
// llegan de la empresa (GET /public/tenant). Ver src/tenant/TenantProvider.tsx.
// =============================================================================

/** URL base de la API, con el prefijo /api/v1. Es la única variable VITE_* que usa la aplicación. */
export const API_URL: string = import.meta.env.VITE_API_URL || 'https://veltor-backend-production.up.railway.app/api/v1';
