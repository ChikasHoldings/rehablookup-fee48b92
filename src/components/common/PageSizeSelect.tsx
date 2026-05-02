import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAGE_SIZE_OPTIONS, type PageSize } from "@/hooks/usePagination";
import { cn } from "@/lib/utils";

interface PageSizeSelectProps {
  value: PageSize;
  onChange: (size: PageSize) => void;
  className?: string;
  /** Aria label for screen readers. */
  label?: string;
}

/**
 * Compact page-size selector used inside a PaginationFooter. Persistence is
 * handled by the parent `usePagination({ tableId })`.
 */
export function PageSizeSelect({
  value,
  onChange,
  className,
  label = "Rows per page",
}: PageSizeSelectProps) {
  return (
    <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      <span className="hidden sm:inline">Rows per page</span>
      <Select
        value={String(value)}
        onValueChange={(v) => onChange(Number(v) as PageSize)}
      >
        <SelectTrigger
          aria-label={label}
          className="h-8 w-[72px] text-xs"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAGE_SIZE_OPTIONS.map((opt) => (
            <SelectItem key={opt} value={String(opt)} className="text-xs">
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
