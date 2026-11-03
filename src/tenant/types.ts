export interface BankAccount {
  bank: string;
  detail: string;
}

/** Empresa resuelta por GET /public/tenant (marca, contactos y formatos). */
export interface Tenant {
  id: string;
  slug: string;
  name: string;
  legalName: string | null;
  tagline: string | null;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  contactPhone: string | null;
  contactEmail: string | null;
  contactHours: string | null;
  paymentsEmail: string | null;
  paymentsWhatsapp: string | null;
  bankAccounts: BankAccount[];
  bankAccountHolder: string | null;
  locale: string;
  currency: string;
  timezone: string;
}

/** Empresa vista desde la plataforma (superadmin) o desde "Mi empresa". */
export interface Company extends Tenant {
  isActive: boolean;
  isDefault: boolean;
  domains: string[];
  createdAt?: string;
  updatedAt?: string;
}

/** Campos editables de la marca y los contactos. */
export interface CompanyBrandingInput {
  name: string;
  legalName?: string | null;
  tagline?: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  contactHours?: string | null;
  paymentsEmail?: string | null;
  paymentsWhatsapp?: string | null;
  bankAccounts: BankAccount[];
  bankAccountHolder?: string | null;
  locale: string;
  currency: string;
  timezone: string;
}

/** Producto financiero inicial de la empresa. Tasas en decimal mensual (0.015 = 1.5 %); prima en %. */
export interface FinancingProductInput {
  name: string;
  minMonthlyRate: number;
  maxMonthlyRate: number;
  defaultMonthlyRate: number;
  minTermMonths: number;
  maxTermMonths: number;
  minDownPercent: number;
  graceDays: number;
  lateRateMonthly: number;
}

export interface CreateCompanyInput extends CompanyBrandingInput {
  slug: string;
  domains: string[];
  adminEmail: string;
  adminName: string;
  product: FinancingProductInput;
}

/** Respuesta de POST /platform/companies. */
export interface CreateCompanyResult {
  company: Company;
  admin?: { emailStatus?: string; temporaryPassword?: string; message?: string };
}

export interface UpdateCompanyInput extends Partial<CompanyBrandingInput> {
  slug?: string;
  domains?: string[];
}
