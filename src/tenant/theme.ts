// Colores de la empresa como variables CSS (--brand-primary, --brand-secondary, --brand-accent).

const HEX = /^#([0-9a-f]{6})$/i;

export const isHexColor = (value: string) => HEX.test(value);

/** Luminancia relativa (WCAG) de un color #RRGGBB. */
export function luminance(hex: string): number {
  const m = HEX.exec(hex);
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** Color de texto legible (oscuro o blanco) sobre el color dado. */
export function readableOn(hex: string): string {
  return luminance(hex) > 0.45 ? '#0f172a' : '#ffffff';
}

export interface BrandColors {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

/** Variables CSS para un juego de colores (sirve también para la vista previa). */
export function brandCssVars(colors: BrandColors): Record<string, string> {
  const vars: Record<string, string> = {};
  const set = (name: string, value: string) => {
    if (!isHexColor(value)) return;
    vars[`--brand-${name}`] = value;
    vars[`--brand-on-${name}`] = readableOn(value);
  };
  set('primary', colors.primaryColor);
  set('secondary', colors.secondaryColor);
  set('accent', colors.accentColor);
  return vars;
}

export function applyBrandColors(colors: BrandColors) {
  const root = document.documentElement;
  Object.entries(brandCssVars(colors)).forEach(([k, v]) => root.style.setProperty(k, v));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colors.primaryColor);
}

/** Favicon SVG con la inicial de la empresa sobre su color de acento (cuando no tiene logo). */
export function initialFavicon(name: string, accent: string): string {
  const letter = (name.trim()[0] || '?').toUpperCase().replace(/[<>&"']/g, '');
  const bg = isHexColor(accent) ? accent : '#64748b';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${bg}"/>` +
    `<text x="32" y="44" font-family="system-ui,sans-serif" font-size="36" font-weight="900" text-anchor="middle" fill="${readableOn(bg)}">${letter}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function applyFavicon(url: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.removeAttribute('type');
  link.href = url;
}
