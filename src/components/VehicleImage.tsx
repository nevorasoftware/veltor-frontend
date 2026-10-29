import React, { useState } from 'react';
import { Car } from 'lucide-react';

interface VehicleImageProps {
  src?: string | null;
  alt: string;
  className?: string;
}

/** Imagen del vehículo con un marcador neutro cuando no hay foto o no carga. */
export const VehicleImage: React.FC<VehicleImageProps> = ({ src, alt, className = '' }) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-slate-800 text-slate-600 ${className}`}>
        <Car className="w-12 h-12" />
      </div>
    );
  }

  return <img src={src} alt={alt} onError={() => setFailed(true)} className={`w-full h-full object-cover ${className}`} />;
};
