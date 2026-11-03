import { Search } from 'lucide-react';

interface FilterOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface ListToolbarProps<T extends string> {
  search: string;
  onSearch: (value: string) => void;
  placeholder: string;
  filter?: T;
  onFilter?: (value: T) => void;
  options?: FilterOption<T>[];
}

/** Buscador y filtro compactos para las listas largas del panel (se apilan en el celular). */
export function ListToolbar<T extends string>({ search, onSearch, placeholder, filter, onFilter, options }: ListToolbarProps<T>) {
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <label className="relative flex-1 min-w-0">
        <span className="sr-only">{placeholder}</span>
        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 outline-none focus:border-slate-400"
        />
      </label>
      {options && onFilter && (
        <div className="flex gap-1 p-1 rounded-xl bg-slate-900 border border-slate-700 text-[11px] font-semibold shrink-0 overflow-x-auto">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onFilter(o.value)}
              aria-pressed={filter === o.value}
              className={`px-2.5 py-1 rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
                filter === o.value ? 'bg-brand-accent/20 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {o.label}
              {o.count !== undefined && <span className="ml-1 font-mono opacity-70">{o.count}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
