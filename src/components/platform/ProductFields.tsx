import React from 'react';
import type { FinancingProductInput } from '../../tenant/types';
import { companyInputClass, FormField, FormSection } from '../company/CompanyFields';

/** Valores tal como los escribe el superadmin (tasas en %); sin valores precargados. */
export interface ProductFormState {
  name: string;
  minRatePct: string;
  maxRatePct: string;
  defaultRatePct: string;
  minTermMonths: string;
  maxTermMonths: string;
  minDownPercent: string;
  graceDays: string;
  lateRatePct: string;
}

export const EMPTY_PRODUCT_FORM: ProductFormState = {
  name: '',
  minRatePct: '',
  maxRatePct: '',
  defaultRatePct: '',
  minTermMonths: '',
  maxTermMonths: '',
  minDownPercent: '',
  graceDays: '',
  lateRatePct: '',
};

const num = (v: string) => (v.trim() === '' ? NaN : Number(v.replace(',', '.')));
const pctToRate = (v: string) => Number((num(v) / 100).toFixed(6));

/** Errores de validación del producto (vacío = válido). */
export function validateProductForm(p: ProductFormState): string[] {
  const errors: string[] = [];
  if (!p.name.trim()) errors.push('El nombre del producto financiero es obligatorio.');
  const fields: [keyof ProductFormState, string][] = [
    ['minRatePct', 'la tasa mínima'],
    ['maxRatePct', 'la tasa máxima'],
    ['defaultRatePct', 'la tasa por defecto'],
    ['minTermMonths', 'el plazo mínimo'],
    ['maxTermMonths', 'el plazo máximo'],
    ['minDownPercent', 'la prima mínima'],
    ['graceDays', 'los días de gracia'],
  ];
  const missing = fields.filter(([k]) => !Number.isFinite(num(p[k])) || num(p[k]) < 0).map(([, label]) => label);
  if (missing.length) {
    errors.push(`Complete con un número válido: ${missing.join(', ')}.`);
    return errors;
  }
  if (p.lateRatePct.trim() !== '' && (!Number.isFinite(num(p.lateRatePct)) || num(p.lateRatePct) < 0)) {
    errors.push('La tasa de mora debe ser un número válido o quedar vacía.');
  }
  const [minR, maxR, defR] = [num(p.minRatePct), num(p.maxRatePct), num(p.defaultRatePct)];
  if (minR <= 0) errors.push('La tasa mínima debe ser mayor que 0.');
  if (!(minR <= defR && defR <= maxR)) errors.push('La tasa por defecto debe estar entre la mínima y la máxima.');
  if (maxR > 100) errors.push('Las tasas se escriben en porcentaje mensual (p. ej. 1.5 para 1.5 %).');
  const [minT, maxT] = [num(p.minTermMonths), num(p.maxTermMonths)];
  if (!Number.isInteger(minT) || !Number.isInteger(maxT) || minT < 1) errors.push('Los plazos deben ser meses enteros mayores que 0.');
  else if (minT > maxT) errors.push('El plazo mínimo no puede ser mayor que el máximo.');
  if (num(p.minDownPercent) >= 100) errors.push('La prima mínima debe ser menor que 100 %.');
  if (!Number.isInteger(num(p.graceDays))) errors.push('Los días de gracia deben ser un número entero.');
  return errors;
}

/** Producto listo para la API: tasas en decimal mensual (1.5 % → 0.015). */
export function productFormToInput(p: ProductFormState): FinancingProductInput {
  return {
    name: p.name.trim(),
    minMonthlyRate: pctToRate(p.minRatePct),
    maxMonthlyRate: pctToRate(p.maxRatePct),
    defaultMonthlyRate: pctToRate(p.defaultRatePct),
    minTermMonths: num(p.minTermMonths),
    maxTermMonths: num(p.maxTermMonths),
    minDownPercent: num(p.minDownPercent),
    graceDays: num(p.graceDays),
    lateRateMonthly: p.lateRatePct.trim() === '' ? null : pctToRate(p.lateRatePct),
  };
}

/** Parámetros del producto financiero inicial de una empresa nueva. */
export const ProductFields: React.FC<{ value: ProductFormState; onChange: (patch: Partial<ProductFormState>) => void }> = ({
  value,
  onChange,
}) => {
  const field = (key: keyof ProductFormState, label: string, hint?: string, step = 'any', required = true) => (
    <FormField label={label} hint={hint}>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={step}
        required={required}
        value={value[key]}
        onChange={(e) => onChange({ [key]: e.target.value } as Partial<ProductFormState>)}
        className={`${companyInputClass} font-mono`}
      />
    </FormField>
  );

  return (
    <FormSection
      title="Producto financiero"
      description="Condiciones con las que la empresa empieza a cotizar y formalizar créditos. Las tasas se escriben en porcentaje mensual. El administrador podrá ajustarlas después en Parámetros y Tasas."
    >
      <FormField label="Nombre del producto *">
        <input
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
          required
          className={companyInputClass}
        />
      </FormField>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {field('minRatePct', 'Tasa mínima (% mensual) *')}
        {field('defaultRatePct', 'Tasa por defecto (% mensual) *', 'La que usa el simulador público')}
        {field('maxRatePct', 'Tasa máxima (% mensual) *')}
        {field('minTermMonths', 'Plazo mínimo (meses) *', undefined, '1')}
        {field('maxTermMonths', 'Plazo máximo (meses) *', undefined, '1')}
        {field('minDownPercent', 'Prima mínima (%) *')}
        {field('graceDays', 'Días de gracia *', 'Días sin mora después del vencimiento', '1')}
        {field(
          'lateRatePct',
          'Tasa de mora (% mensual, opcional)',
          'Interés moratorio heredado. La mora que se cobra (monto por día o por cuota) se configura en Parámetros de cobranza.',
          'any',
          false,
        )}
      </div>
    </FormSection>
  );
};
