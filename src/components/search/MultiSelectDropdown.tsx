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
      maxDisplayed = 1,
      searchable = false,
    },
    ref
  ) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const internalRef = useRef<HTMLDivElement>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const el = internalRef.current;
      if (el && !el.contains(e.target as Node)) {
        setIsOpen(false);
        setFilterQuery("");
        setHighlightedIndex(-1);
      }
    };
    // Close on Escape
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setFilterQuery("");
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  // Focus filter input when dropdown opens
  useEffect(() => {
    if (isOpen && filterInputRef.current) {
      setTimeout(() => filterInputRef.current?.focus(), 50);
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
    setFilterQuery("");
  }, [onChange]);

  const filteredOptions = filterQuery
    ? options.filter((o) => o.toLowerCase().includes(filterQuery.toLowerCase()))
    : options;

  // Keyboard navigation in filter
  const handleFilterKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, filteredOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
      e.preventDefault();
      toggleOption(filteredOptions[highlightedIndex]);
    }
  }, [filteredOptions, highlightedIndex, toggleOption]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-option]");
      items[highlightedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  // Reset highlight when filter changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [filterQuery]);

  const getDisplayText = () => {
    if (selected.length === 0) return placeholder;
    if (selected.length <= maxDisplayed) {
      return selected.join(", ");
    }
    return `${selected[0]} +${selected.length - 1} more`;
  };

  const showSearch = searchable || options.length > 6;

  return (
    <div ref={internalRef} className="relative">
      {label && (
        <label className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-primary">
          {icon}
          {label}
        </label>
      )}
      
      <button
        type="button"
        onClick={() => { setIsOpen(!isOpen); setFilterQuery(""); setHighlightedIndex(-1); }}
        className={cn(
          "flex w-full items-center justify-between gap-2 text-left transition-colors cursor-pointer",
          "bg-transparent hover:bg-transparent border-none p-0 h-auto",
          "text-[15px] font-medium focus:outline-none",
          selected.length > 0 ? "text-foreground" : "text-muted-foreground/60"
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="flex-1 truncate">{getDisplayText()}</span>
        <div className="flex items-center gap-1">
          {selected.length > 0 && (
            <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">
              {selected.length}
            </span>
          )}
          {selected.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="rounded-full p-0.5 hover:bg-muted/80 transition-colors"
              aria-label="Clear selection"
            >
              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </button>
          )}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground/40 transition-transform duration-200",
              isOpen && "rotate-180 text-primary"
            )}
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-0 min-w-[260px] top-full z-[9999] mt-3 overflow-hidden rounded-xl border border-border/60 bg-card shadow-2xl animate-in fade-in-0 slide-in-from-top-1 duration-150">
          {/* Search filter */}
          {showSearch && (
            <div className="p-2.5 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                <input
                  ref={filterInputRef}
                  type="text"
                  placeholder={`Search ${label?.toLowerCase() || "options"}…`}
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  onKeyDown={handleFilterKeyDown}
                  className="w-full h-9 pl-8 pr-3 rounded-lg border border-border/50 bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:bg-background transition-colors"
                />
              </div>
            </div>
          )}

          {/* Selected summary chips */}
          {selected.length > 0 && (
            <div className="border-t border-border/30 px-2.5 py-1.5 flex flex-wrap gap-1">
              {selected.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 rounded-md bg-primary/10 pl-2 pr-1 py-0.5 text-[11px] font-semibold text-primary"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => toggleOption(item)}
                    className="rounded-full p-0.5 hover:bg-primary/20 transition-colors"
                    aria-label={`Remove ${item}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-border/30" />

          {/* Options list */}
          <div ref={listRef} className="overflow-auto max-h-52 py-1 px-1" role="listbox">
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-5 text-center text-sm text-muted-foreground/60">No matches found</p>
            ) : (
              filteredOptions.map((option, idx) => {
                const isSelected = selected.includes(option);
                const isHighlighted = idx === highlightedIndex;
                return (
                  <button
                    key={option}
                    type="button"
                    data-option
                    onClick={() => toggleOption(option)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-left transition-all duration-100",
                      isHighlighted && "bg-muted/80",
                      isSelected && !isHighlighted && "bg-primary/[0.06]",
                      !isSelected && !isHighlighted && "hover:bg-muted/50"
                    )}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border-[1.5px] transition-all duration-150",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground scale-100"
                          : "border-muted-foreground/25 scale-95"
                      )}
                    >
                      {isSelected && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                    </div>
                    <span className={cn(
                      "flex-1 text-[13px] transition-colors",
                      isSelected ? "font-semibold text-foreground" : "font-medium text-foreground/75"
                    )}>{option}</span>
                    {isSelected && (
                      <Check className="h-3 w-3 text-primary shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
          
          {/* Footer */}
          {selected.length > 0 && (
            <div className="border-t border-border/30 px-2 py-1.5 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground/60 pl-1">{selected.length} selected</span>
              <button
                type="button"
                onClick={clearAll}
                className="rounded-md px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
