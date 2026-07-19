import React, { useRef, useEffect, useState, useMemo } from "react";
import { Search } from "lucide-react";

interface SearchItem {
  name: string;
  code?: string;
  ci?: string;
}

interface SearchAutocompleteProps<T extends SearchItem> {
  items: T[];
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: T) => void;
  placeholder?: string;
  dark: boolean;
  maxSuggestions?: number;
}

export function SearchAutocomplete<T extends SearchItem>({
  items,
  value,
  onChange,
  onSelect,
  placeholder = "Buscar...",
  dark,
  maxSuggestions = 5,
}: SearchAutocompleteProps<T>) {
  const [showDropdown, setShowDropdown] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const suggestions = useMemo(() => {
    if (!value.trim()) return [];
    const q = value.toLowerCase();
    return items
      .filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.code && item.code.toLowerCase().includes(q)) ||
          (item.ci && item.ci.toLowerCase().includes(q))
      )
      .slice(0, maxSuggestions);
  }, [value, items, maxSuggestions]);

  return (
    <div className="relative w-full" ref={ref}>
      <Search
        size={14}
        className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
          dark ? "text-white/40" : "text-slate-400"
        }`}
      />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        className={`w-full pl-9 pr-4 py-2 rounded-xl text-sm border outline-none transition-all ${
          dark
            ? "bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-primary/60"
            : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-primary/50 focus:bg-white"
        }`}
      />
      {showDropdown && suggestions.length > 0 && (
        <div
          className={`absolute z-50 w-full mt-1 rounded-xl border shadow-xl overflow-hidden ${
            dark ? "bg-[#1E293B] border-white/10" : "bg-white border-slate-200"
          }`}
        >
          {suggestions.map((item) => (
            <div
              key={item.code || item.name}
              onClick={() => {
                onSelect(item);
                setShowDropdown(false);
              }}
              className={`px-4 py-2.5 text-sm cursor-pointer transition-colors border-b last:border-b-0 ${
                dark
                  ? "hover:bg-primary/20 text-white border-white/5"
                  : "hover:bg-primary/10 text-slate-800 border-slate-50"
              }`}
            >
              <div className="font-medium">{item.name}</div>
              <div
                className={`text-xs mt-0.5 ${
                  dark ? "text-white/50" : "text-slate-500"
                }`}
              >
                <span className="font-mono text-primary">{item.code}</span>
                {item.ci && <span className="ml-2">CI: {item.ci}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
