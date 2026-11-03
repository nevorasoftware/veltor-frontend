import React, { useState } from 'react';

interface TenantLogoProps {
  name: string;
  src?: string;
  /** Tamaño en clases Tailwind (alto y ancho). */
  className?: string;
  textClassName?: string;
}

/** Logo de la empresa; si no tiene (o no carga) muestra su inicial sobre el color de acento. */
export const TenantLogo: React.FC<TenantLogoProps> = ({ name, src, className = 'w-10 h-10', textClassName = 'text-lg' }) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (src && failedSrc !== src) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setFailedSrc(src)}
        className={`${className} rounded-xl object-contain bg-white/5`}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className={`${className} rounded-xl flex items-center justify-center font-black shadow-lg bg-brand-accent text-brand-on-accent`}
    >
      <span className={textClassName}>{(name.trim()[0] || '?').toUpperCase()}</span>
    </div>
  );
};
