/**
 * Utilidades de formateo para documentos oficiales de El Salvador
 * VELTOR — Nevora Software
 */

/**
 * Formatea un número de DUI salvadoreño al estándar: 00000000-0 (8 dígitos, guion, 1 dígito de control)
 * @param value Valor ingresado por el usuario
 * @returns Cadena con formato oficial de DUI salvadoreño
 */
export const formatDUI = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 8) return digits;
  return `${digits.slice(0, 8)}-${digits.slice(8)}`;
};

/**
 * Valida si un DUI tiene el formato y longitud salvadoreña válida (9 dígitos con guión: 00000000-0)
 */
export const isValidDUI = (value: string): boolean => {
  return /^\d{8}-\d{1}$/.test(value);
};

/**
 * Formatea un NIT salvadoreño.
 * Soporta de manera inteligente tanto el NIT homologado al DUI (9 dígitos: 00000000-0)
 * como el NIT tradicional salvadoreño (14 dígitos: 0000-000000-000-0).
 * @param value Valor ingresado por el usuario
 * @returns Cadena con formato oficial de NIT salvadoreño
 */
export const formatNIT = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 14);

  // Si tiene 9 dígitos o menos, formatea con máscara homologada a DUI (00000000-0)
  if (digits.length <= 9) {
    if (digits.length <= 8) return digits;
    return `${digits.slice(0, 8)}-${digits.slice(8)}`;
  }

  // Si pasa de 9 dígitos (10 a 14), formatea según estructura tradicional (0000-000000-000-0)
  let formatted = digits.slice(0, 4);
  if (digits.length > 4) {
    formatted += `-${digits.slice(4, 10)}`;
  }
  if (digits.length > 10) {
    formatted += `-${digits.slice(10, 13)}`;
  }
  if (digits.length > 13) {
    formatted += `-${digits.slice(13, 14)}`;
  }
  return formatted;
};

/**
 * Valida si un NIT cumple con el formato salvadoreño homologado o tradicional
 */
export const isValidNIT = (value: string): boolean => {
  return /^\d{8}-\d{1}$/.test(value) || /^\d{4}-\d{6}-\d{3}-\d{1}$/.test(value);
};
