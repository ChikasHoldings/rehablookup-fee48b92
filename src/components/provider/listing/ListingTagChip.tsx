import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ListingTagChipProps {
  label: string;
  onRemove: () => void;
  variant?: "default" | "service" | "insurance";
}

export function ListingTagChip({
  label,
  onRemove,
  variant = "default"
}: ListingTagChipProps) {
  const variantStyles = {
    default: "bg-secondary hover:bg-secondary/80",
    service: "bg-teal-500/10 text-teal-700 border-teal-200 hover:bg-teal-500/20 dark:text-teal-400 dark:border-teal-800",
    insurance: "bg-amber-500/10 text-amber-700 border-amber-200 hover:bg-amber-500/20 dark:text-amber-400 dark:border-amber-800"
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 pr-1.5 py-1.5 text-sm font-normal transition-all duration-200",
        variantStyles[variant]
      )}
    >
      {label}
      <button
        onClick={onRemove}
        className="ml-1 rounded-full p-0.5 hover:bg-foreground/10 transition-colors"
        aria-label={`Remove ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

interface EmptyTagsStateProps {
  type: "services" | "insurance" | "age-groups";
}

export function ListingEmptyTagsState({ type }: EmptyTagsStateProps) {
  const messages = {
    services: "No services added yet. Add your treatment services to help families find the right care.",
    insurance: "No insurance providers added yet. Add accepted insurance to help families understand their options.",
    "age-groups": "No age groups specified yet. Add age groups to help families find appropriate care."
  };

  return (
    <div className="py-4 px-3 rounded-lg border border-dashed border-border bg-muted/30 text-center">
      <p className="text-sm text-muted-foreground">{messages[type]}</p>
    </div>
  );
}
