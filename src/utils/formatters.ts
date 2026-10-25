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

/**
 * Optimiza y convierte un archivo a Base64.
 * Si es una imagen (JPEG/PNG/WebP), la escala en canvas a resolución legible (Full HD)
 * manteniendo la nitidez de texto y números de documento, reduciendo drásticamente
 * el peso de 5MB-15MB a ~250KB-400KB para evitar 'Request Entity Too Large'.
 * Si es un documento PDF, lo convierte directamente a Base64.
 */
export const compressAndReadFileAsBase64 = (
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.82,
): Promise<{ base64: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    // Si es PDF u otro documento que no sea imagen, leer directamente
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve({ base64: reader.result as string, mimeType: file.type || 'application/pdf' });
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ base64: e.target?.result as string, mimeType: file.type });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve({ base64: compressedBase64, mimeType: 'image/jpeg' });
      };
      img.onerror = () => {
        resolve({ base64: e.target?.result as string, mimeType: file.type });
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};
