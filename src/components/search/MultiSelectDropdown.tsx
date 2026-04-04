import { useState, useRef, useEffect, useCallback, forwardRef } from "react";
import { Check, ChevronDown, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiSelectDropdownProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
  icon?: React.ReactNode;
  label?: string;
  maxDisplayed?: number;
  searchable?: boolean;
}

export const MultiSelectDropdown = forwardRef<HTMLDivElement, MultiSelectDropdownProps>(
  function MultiSelectDropdown(
    {
      options,
      selected,
      onChange,
      placeholder,
      icon,
      label,
      maxDisplayed = 2,
      searchable = false,
    },
    ref
  ) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setFilterQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus filter input when dropdown opens
  useEffect(() => {
    if (isOpen && filterInputRef.current) {
      filterInputRef.current.focus();
    }
  }, [isOpen]);

  const toggleOption = useCallback((option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  }, [selected, onChange]);

  const clearAll = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  }, [onChange]);

  const filteredOptions = filterQuery
    ? options.filter((o) => o.toLowerCase().includes(filterQuery.toLowerCase()))
    : options;

  const getDisplayText = () => {
    if (selected.length === 0) return placeholder;
    if (selected.length <= maxDisplayed) {
      return selected.join(", ");
    }
    return `${selected.slice(0, maxDisplayed).join(", ")} +${selected.length - maxDisplayed}`;
  };

  const showSearch = searchable || options.length > 8;

  return (
    <div ref={ref || dropdownRef} className="relative">
      {label && (
        <label className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-primary">
          {icon}
          {label}
        </label>
      )}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center justify-between gap-2 text-left transition-colors cursor-pointer",
          "bg-transparent hover:bg-transparent border-none p-0 h-auto",
          "text-[15px] font-medium focus:outline-none",
          selected.length > 0 ? "text-foreground" : "text-muted-foreground/60"
        )}
      >
        <span className="flex-1 truncate">{getDisplayText()}</span>
        <div className="flex items-center gap-1.5">
          {selected.length > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5">
              {selected.length}
            </span>
          )}
          {selected.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="rounded-full p-0.5 hover:bg-muted transition-colors"
              aria-label="Clear selection"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground/50 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-[9999] mt-3 max-h-72 overflow-hidden rounded-xl border border-border/80 bg-card shadow-2xl animate-in fade-in-0 slide-in-from-top-2 duration-200">
          {/* Search filter */}
          {showSearch && (
            <div className="border-b border-border/50 p-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                <input
                  ref={filterInputRef}
                  type="text"
                  placeholder="Type to filter…"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 rounded-lg bg-muted/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
            </div>
          )}

          {/* Selected chips */}
          {selected.length > 0 && (
            <div className="border-b border-border/50 px-2.5 py-2 flex flex-wrap gap-1.5">
              {selected.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => toggleOption(item)}
                    className="rounded-full hover:bg-primary/20 transition-colors"
                    aria-label={`Remove ${item}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Options list */}
          <div className="overflow-auto max-h-48 p-1.5">
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground/70">No results</p>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selected.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleOption(option)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                      isSelected
                        ? "bg-primary/8 text-foreground"
                        : "text-foreground/80 hover:bg-muted/60"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border-[1.5px] transition-all",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                    </div>
                    <span className="flex-1 text-sm font-medium">{option}</span>
                  </button>
                );
              })
            )}
          </div>
          
          {/* Footer */}
          {selected.length > 0 && (
            <div className="border-t border-border/50 p-1.5">
              <button
                type="button"
                onClick={clearAll}
                className="w-full rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                Clear all ({selected.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
