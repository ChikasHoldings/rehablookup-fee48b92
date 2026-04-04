import { useState, useRef, useEffect, forwardRef } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiSelectDropdownProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
  icon?: React.ReactNode;
  label?: string;
  maxDisplayed?: number;
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
    },
    ref
  ) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const getDisplayText = () => {
    if (selected.length === 0) return placeholder;
    if (selected.length <= maxDisplayed) {
      return selected.join(", ");
    }
    return `${selected.slice(0, maxDisplayed).join(", ")} +${selected.length - maxDisplayed}`;
  };

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
          "flex w-full items-center justify-between gap-2 text-left transition-colors",
          "bg-transparent hover:bg-transparent border-none p-0 h-auto",
          "text-[15px] font-medium focus:outline-none",
          selected.length > 0 ? "text-foreground" : "text-muted-foreground/60"
        )}
      >
        <span className="flex-1 truncate">{getDisplayText()}</span>
        <div className="flex items-center gap-1.5">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="rounded-full p-0.5 hover:bg-muted transition-colors"
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
        <div className="absolute left-0 right-0 top-full z-[9999] mt-2 max-h-64 overflow-auto rounded-xl border border-border bg-card shadow-xl animate-in fade-in-0 zoom-in-95 duration-150">
          <div className="p-1.5">
            {options.map((option) => {
              const isSelected = selected.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleOption(option)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                    isSelected
                      ? "bg-primary/10 text-foreground"
                      : "text-foreground/80 hover:bg-muted"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30"
                    )}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </div>
                  <span className="flex-1 text-sm font-medium">{option}</span>
                </button>
              );
            })}
          </div>
          
          {selected.length > 0 && (
            <div className="border-t border-border p-2">
              <button
                type="button"
                onClick={clearAll}
                className="w-full rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
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
