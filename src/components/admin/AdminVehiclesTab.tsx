import React, { useState } from 'react';
import { Car, Plus, Edit3, Trash2, ImagePlus, X, Eye, EyeOff } from 'lucide-react';
import { api } from '../../api/client';
import { formatUSD } from '../../config/branding';
import { compressAndReadFileAsBase64 } from '../../utils/formatters';
import { VehicleImage } from '../VehicleImage';
import { FUEL_LABELS, TRANSMISSION_LABELS, VEHICLE_STATUS_LABELS } from '../../utils/vehicles';

interface AdminVehiclesTabProps {
  vehicles: any[];
  onChanged: () => void;
}

interface VehicleForm {
  brand: string;
  model: string;
  year: string;
  version: string;
  type: string;
  transmission: string;
  fuel: string;
  engineCc: string;
  mileageKm: string;
  color: string;
  passengers: string;
  description: string;
  features: string;
  salePrice: string;
  minDownPayment: string;
  costPrice: string;
  status: string;
  isPublished: boolean;
  images: { url: string }[];
}

const EMPTY_FORM: VehicleForm = {
  brand: '',
  model: '',
  year: String(new Date().getFullYear()),
  version: '',
  type: '',
  transmission: 'AUTOMATIC',
  fuel: 'GASOLINE',
  engineCc: '',
  mileageKm: '0',
  color: '',
  passengers: '5',
  description: '',
  features: '',
  salePrice: '',
  minDownPayment: '',
  costPrice: '',
  status: 'AVAILABLE',
  isPublished: true,
  images: [],
};

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  RESERVED: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  SOLD: 'bg-sky-500/10 border-sky-500/20 text-sky-300',
  MAINTENANCE: 'bg-slate-500/10 border-slate-500/20 text-slate-300',
  UNPUBLISHED: 'bg-slate-500/10 border-slate-500/20 text-slate-400',
};

const inputClass =
  'w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-white';

const toForm = (v: any): VehicleForm => ({
  brand: v.brand || '',
  model: v.model || '',
  year: String(v.year ?? ''),
  version: v.version || '',
  type: v.type || '',
  transmission: v.transmission || 'AUTOMATIC',
  fuel: v.fuel || 'GASOLINE',
  engineCc: v.engineCc != null ? String(v.engineCc) : '',
  mileageKm: String(v.mileageKm ?? 0),
  color: v.color || '',
  passengers: String(v.passengers ?? 5),
  description: v.description || '',
  features: (v.features || []).join('\n'),
  salePrice: v.salePrice != null ? String(Number(v.salePrice)) : '',
  minDownPayment: v.minDownPayment != null ? String(Number(v.minDownPayment)) : '',
  costPrice: v.costPrice != null ? String(Number(v.costPrice)) : '',
  status: v.status || 'AVAILABLE',
  isPublished: v.isPublished ?? true,
  images: (v.images || []).map((img: any) => ({ url: img.url })),
});

export const AdminVehiclesTab: React.FC<AdminVehiclesTabProps> = ({ vehicles, onChanged }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<VehicleForm>(EMPTY_FORM);
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const set = <K extends keyof VehicleForm>(key: K, value: VehicleForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  const openModal = (vehicle?: any) => {
    setEditing(vehicle || null);
    setForm(vehicle ? toForm(vehicle) : EMPTY_FORM);
    setImageUrl('');
    setError(null);
    setModalOpen(true);
  };

  const addImageFiles = async (files: FileList | null) => {
    if (!files) return;
    try {
      const added: { url: string }[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const { base64 } = await compressAndReadFileAsBase64(file, 1400, 1400, 0.8);
        added.push({ url: base64 });
      }
      setForm((f) => ({ ...f, images: [...f.images, ...added].slice(0, 12) }));
    } catch {
      setError('No se pudo procesar una de las imágenes.');
    }
  };

  const addImageUrl = () => {
    const url = imageUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      setError('La URL de la imagen debe iniciar con http:// o https://');
      return;
    }
    setForm((f) => ({ ...f, images: [...f.images, { url }].slice(0, 12) }));
    setImageUrl('');
    setError(null);
  };

  const removeImage = (idx: number) => setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));

  const makePrimary = (idx: number) =>
    setForm((f) => ({ ...f, images: [f.images[idx], ...f.images.filter((_, i) => i !== idx)] }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const salePrice = Number(form.salePrice);
    const minDownPayment = form.minDownPayment === '' ? undefined : Number(form.minDownPayment);
    if (!(salePrice > 0)) return setError('El precio de venta debe ser mayor a cero.');
    if (minDownPayment !== undefined && minDownPayment > salePrice) {
      return setError('La prima mínima no puede ser mayor al precio de venta.');
    }

    const payload = {
      brand: form.brand.trim(),
      model: form.model.trim(),
      year: Number(form.year),
      version: form.version.trim() || undefined,
      type: form.type.trim(),
      transmission: form.transmission,
      fuel: form.fuel,
      engineCc: form.engineCc === '' ? undefined : Number(form.engineCc),
      mileageKm: Number(form.mileageKm) || 0,
      color: form.color.trim(),
      passengers: Number(form.passengers) || 5,
      description: form.description.trim(),
      features: form.features
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean),
      salePrice,
      minDownPayment,
      costPrice: form.costPrice === '' ? undefined : Number(form.costPrice),
      status: form.status,
      isPublished: form.isPublished,
      images: form.images,
    };

    setSaving(true);
    try {
      if (editing) await api.updateVehicle(editing.id, payload);
      else await api.createVehicle(payload);
      setModalOpen(false);
      onChanged();
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar el vehículo.');
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (v: any) => {
    try {
      await api.updateVehicle(v.id, { isPublished: !v.isPublished });
      onChanged();
    } catch (err: any) {
      window.alert(err.message || 'No se pudo actualizar la publicación.');
    }
  };

  const filtered = statusFilter === 'ALL' ? vehicles : vehicles.filter((v) => v.status === statusFilter);

  return (
    <div className="glass-panel rounded-2xl border border-slate-700/80 bg-[#0F172A]/90 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Car className="w-5 h-5 text-slate-300" />
            <span>Inventario de Vehículos</span>
          </h3>
          <p className="text-xs text-slate-400">
            Solo los vehículos <b>Disponibles</b> y <b>publicados</b> aparecen en el catálogo público.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
          >
            <option value="ALL">Todos los estados</option>
            {Object.entries(VEHICLE_STATUS_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-white text-slate-900 font-bold text-xs uppercase tracking-wider shadow cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Vehículo</span>
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-xs text-slate-400 py-10">
          {vehicles.length === 0 ? 'Aún no hay vehículos registrados. Agrega el primero con "Nuevo Vehículo".' : 'No hay vehículos con este estado.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((v) => (
            <div key={v.id} className="rounded-2xl overflow-hidden border border-slate-700 bg-slate-800/40 flex flex-col">
              <div className="relative h-40 bg-slate-800">
                <VehicleImage src={v.images?.[0]?.url} alt={`${v.brand} ${v.model}`} />
                <span
                  className={`absolute top-2 left-2 px-2 py-0.5 rounded border text-[10px] font-black uppercase ${STATUS_STYLES[v.status] || ''}`}
                >
                  {VEHICLE_STATUS_LABELS[v.status] || v.status}
                </span>
                {!v.isPublished && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-slate-900/80 text-[10px] font-bold text-slate-300">
                    Oculto
                  </span>
                )}
              </div>
              <div className="p-4 space-y-2 flex-1">
                <div className="text-[10px] font-mono text-slate-500">{v.code}</div>
                <h4 className="text-sm font-bold text-white">
                  {v.brand} {v.model} ({v.year})
                </h4>
                <p className="text-[11px] text-slate-400">
                  {v.type} · {TRANSMISSION_LABELS[v.transmission] || v.transmission} · {FUEL_LABELS[v.fuel] || v.fuel} ·{' '}
                  {Number(v.mileageKm || 0).toLocaleString('es-SV')} km
                </p>
                <div className="flex justify-between text-xs pt-1">
                  <span className="text-slate-400">Precio</span>
                  <span className="font-mono font-bold text-white">{formatUSD(v.salePrice)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Prima mínima</span>
                  <span className="font-mono text-slate-300">{formatUSD(v.minDownPayment)}</span>
                </div>
              </div>
              <div className="p-4 pt-0 flex gap-2">
                <button
                  onClick={() => openModal(v)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-700/80 hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-slate-200 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
                <button
                  onClick={() => togglePublished(v)}
                  title={v.isPublished ? 'Ocultar del catálogo' : 'Publicar en el catálogo'}
                  className="px-3 py-2 rounded-lg bg-slate-700/80 hover:bg-slate-700 border border-slate-600 text-slate-200 cursor-pointer"
                >
                  {v.isPublished ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <form
            onSubmit={handleSave}
            className="relative w-full max-w-3xl my-6 rounded-2xl border border-slate-700 bg-[#0F172A] p-6 space-y-5 shadow-2xl text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editing ? `Editar vehículo · ${editing.code}` : 'Nuevo vehículo'}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300">{error}</div>}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="Marca *">
                <input required className={inputClass} value={form.brand} onChange={(e) => set('brand', e.target.value)} />
              </Field>
              <Field label="Modelo *">
                <input required className={inputClass} value={form.model} onChange={(e) => set('model', e.target.value)} />
              </Field>
              <Field label="Año *">
                <input required type="number" min={1950} max={2100} className={inputClass} value={form.year} onChange={(e) => set('year', e.target.value)} />
              </Field>
              <Field label="Versión">
                <input className={inputClass} value={form.version} onChange={(e) => set('version', e.target.value)} />
              </Field>
              <Field label="Tipo de carrocería *">
                <input
                  required
                  list="vehicle-types"
                  placeholder="Sedán, SUV, Pickup..."
                  className={inputClass}
                  value={form.type}
                  onChange={(e) => set('type', e.target.value)}
                />
                <datalist id="vehicle-types">
                  {[...new Set(vehicles.map((v) => v.type))].map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </Field>
              <Field label="Transmisión">
                <select className={inputClass} value={form.transmission} onChange={(e) => set('transmission', e.target.value)}>
                  {Object.entries(TRANSMISSION_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Combustible">
                <select className={inputClass} value={form.fuel} onChange={(e) => set('fuel', e.target.value)}>
                  {Object.entries(FUEL_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Color *">
                <input required className={inputClass} value={form.color} onChange={(e) => set('color', e.target.value)} />
              </Field>
              <Field label="Kilometraje *">
                <input required type="number" min={0} className={inputClass} value={form.mileageKm} onChange={(e) => set('mileageKm', e.target.value)} />
              </Field>
              <Field label="Motor (cc)">
                <input type="number" min={0} className={inputClass} value={form.engineCc} onChange={(e) => set('engineCc', e.target.value)} />
              </Field>
              <Field label="Pasajeros">
                <input type="number" min={1} max={60} className={inputClass} value={form.passengers} onChange={(e) => set('passengers', e.target.value)} />
              </Field>
              <Field label="Estado">
                <select className={inputClass} value={form.status} onChange={(e) => set('status', e.target.value)}>
                  {Object.entries(VEHICLE_STATUS_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Precio de venta (USD) *">
                <input required type="number" min={1} step="0.01" className={inputClass} value={form.salePrice} onChange={(e) => set('salePrice', e.target.value)} />
              </Field>
              <Field label="Prima mínima (USD)">
                <input type="number" min={0} step="0.01" className={inputClass} value={form.minDownPayment} onChange={(e) => set('minDownPayment', e.target.value)} />
              </Field>
              <Field label="Costo interno (USD)">
                <input type="number" min={0} step="0.01" className={inputClass} value={form.costPrice} onChange={(e) => set('costPrice', e.target.value)} />
              </Field>
              <label className="flex items-center gap-2 text-slate-300 font-semibold self-end pb-2">
                <input type="checkbox" checked={form.isPublished} onChange={(e) => set('isPublished', e.target.checked)} />
                Publicado en catálogo
              </label>
            </div>

            <Field label="Descripción">
              <textarea rows={3} className={inputClass} value={form.description} onChange={(e) => set('description', e.target.value)} />
            </Field>
            <Field label="Equipamiento (una característica por línea)">
              <textarea rows={3} className={inputClass} value={form.features} onChange={(e) => set('features', e.target.value)} />
            </Field>

            <div className="space-y-2">
              <span className="block text-slate-300 font-semibold">Fotografías (la primera es la principal, máximo 12)</span>
              <div className="flex flex-wrap gap-3">
                {form.images.map((img, idx) => (
                  <div key={idx} className="relative w-24 h-20 rounded-lg overflow-hidden border border-slate-700 group">
                    <VehicleImage src={img.url} alt={`Foto ${idx + 1}`} />
                    {idx === 0 && (
                      <span className="absolute bottom-0 inset-x-0 text-center text-[9px] bg-emerald-600/90 text-white font-bold">Principal</span>
                    )}
                    <div className="absolute inset-0 hidden group-hover:flex items-center justify-center gap-1 bg-black/60">
                      {idx !== 0 && (
                        <button type="button" onClick={() => makePrimary(idx)} className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-900 text-[9px] font-bold cursor-pointer">
                          Principal
                        </button>
                      )}
                      <button type="button" onClick={() => removeImage(idx)} className="p-1 rounded bg-rose-600 text-white cursor-pointer">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                <label className="w-24 h-20 rounded-lg border border-dashed border-slate-600 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-white hover:border-slate-400 cursor-pointer">
                  <ImagePlus className="w-5 h-5" />
                  <span className="text-[10px]">Subir fotos</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      addImageFiles(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
              <div className="flex gap-2">
                <input
                  className={inputClass}
                  placeholder="o pega la URL de una imagen (https://...)"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                <button
                  type="button"
                  onClick={addImageUrl}
                  className="px-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-semibold cursor-pointer"
                >
                  Agregar
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-white text-slate-900 font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Registrar vehículo'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block space-y-1">
    <span className="block text-slate-300 font-semibold">{label}</span>
    {children}
  </label>
);
