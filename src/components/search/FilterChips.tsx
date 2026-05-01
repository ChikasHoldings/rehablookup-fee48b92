import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterChipOption {
  value: string;
  label: string;
}

interface ChipGroupProps {
  heading: string;
  options: FilterChipOption[];
  selected: string[];
  onToggle: (value: string) => void;
}

function ChipGroup({ heading, options, selected, onToggle }: ChipGroupProps) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80 px-1">
        {heading}
      </div>
      <div
        className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1 snap-x"
        role="group"
        aria-label={`${heading} filters`}
      >
        {options.map((opt) => {
          const isActive = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onToggle(opt.value)}
              aria-pressed={isActive}
              className={cn(
                "shrink-0 snap-start inline-flex items-center gap-1.5 h-8 rounded-full border px-3 text-xs font-medium transition-all",
                "hover:border-primary/50 hover:bg-primary/5 active:scale-[0.97]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-foreground border-border"
              )}
            >
              {isActive && <Check className="h-3 w-3" aria-hidden />}
              <span>{opt.label}</span>
              {isActive && <X className="h-3 w-3 opacity-70" aria-hidden />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface FilterChipsProps {
  treatmentOptions: FilterChipOption[];
  insuranceOptions: FilterChipOption[];
  distanceOptions: FilterChipOption[];
  selectedTreatments: string[];
  selectedInsurance: string[];
  selectedDistance: string;
  onToggleTreatment: (value: string) => void;
  onToggleInsurance: (value: string) => void;
  onSetDistance: (value: string) => void;
  onClearAll?: () => void;
  className?: string;
}

/**
 * Horizontally-scrollable quick filter chips that mirror the sidebar filters.
 * Used at the top of Rehab Centers search results so users can refine without
 * opening the side-sheet. All state lives in the URL via the parent.
 */
export function FilterChips({
  treatmentOptions,
  insuranceOptions,
  distanceOptions,
  selectedTreatments,
  selectedInsurance,
  selectedDistance,
  onToggleTreatment,
  onToggleInsurance,
  onSetDistance,
  onClearAll,
  className,
}: FilterChipsProps) {
  const activeCount =
    selectedTreatments.length +
    selectedInsurance.length +
    (selectedDistance ? 1 : 0);

  return (
    <section
      aria-label="Quick filters"
      className={cn(
        "rounded-xl border border-border bg-card/50 p-3 sm:p-4 space-y-3",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-foreground">
          Refine results
          {activeCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
              {activeCount}
            </span>
          )}
        </h2>
        {activeCount > 0 && onClearAll && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-medium text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      <ChipGroup
        heading="Treatment type"
        options={treatmentOptions}
        selected={selectedTreatments}
        onToggle={onToggleTreatment}
      />
      <ChipGroup
        heading="Insurance accepted"
        options={insuranceOptions}
        selected={selectedInsurance}
        onToggle={onToggleInsurance}
      />
      <ChipGroup
        heading="Distance"
        options={distanceOptions}
        selected={selectedDistance ? [selectedDistance] : []}
        onToggle={(value) => onSetDistance(selectedDistance === value ? "" : value)}
      />
    </section>
  );
}
