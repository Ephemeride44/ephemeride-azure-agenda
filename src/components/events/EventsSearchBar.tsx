import { X } from "lucide-react";

interface EventsSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  theme?: 'light' | 'dark';
}

const EventsSearchBar = ({ value, onChange, placeholder, theme }: EventsSearchBarProps) => (
  <div className="flex justify-end">
    <div className="relative w-full max-w-xs">
      <input
        type="text"
        placeholder={placeholder || "Rechercher..."}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={
          theme === 'light'
            ? 'px-3 py-2 rounded border border-[#f3e0c7] bg-white text-[#1B263B] w-full pr-10 h-10'
            : 'px-3 py-2 rounded border border-white/20 bg-white/10 text-white w-full pr-10 h-10'
        }
      />
      {value && (
        <button
          type="button"
          className={
            'absolute right-2 top-1/2 -translate-y-1/2 focus:outline-none ' +
            (theme === 'light' ? 'text-[#1B263B]/60 hover:text-[#1B263B]' : 'text-white/60 hover:text-white')
          }
          onClick={() => onChange("")}
          tabIndex={0}
          aria-label="Effacer la recherche"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  </div>
);

export default EventsSearchBar; 