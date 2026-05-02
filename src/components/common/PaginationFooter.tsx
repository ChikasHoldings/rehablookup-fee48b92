import { DataPagination } from "./DataPagination";
import { PageSizeSelect } from "./PageSizeSelect";
import type { PageSize } from "@/hooks/usePagination";
import { cn } from "@/lib/utils";

interface PaginationFooterProps {
  page: number;
  /**
   * Current page size. Must be one of `PAGE_SIZE_OPTIONS` when the page-size
   * selector is shown; can be any positive integer when `hidePageSize` is true.
   */
  pageSize: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
  /** Singular noun for the count label (e.g. "lead", "facility"). */
  itemLabel?: string;
  className?: string;
  /** Hide the page-size selector (useful for SEO-locked sizes). */
  hidePageSize?: boolean;
}

/**
 * Composed footer used at the bottom of every paginated list/table:
 * `Showing X–Y of Z · [PageSizeSelect] · [DataPagination]`.
 */
export function PaginationFooter({
  page,
  pageSize,
  totalPages,
  totalItems,
  onPageChange,
  onPageSizeChange,
  itemLabel = "result",
  className,
  hidePageSize,
}: PaginationFooterProps) {
  if (totalItems === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);
  const noun = totalItems === 1 ? itemLabel : `${itemLabel}s`;

  return (
    <div
      className={cn(
        "mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="text-xs text-muted-foreground sm:text-sm">
        Showing <span className="font-medium text-foreground">{from.toLocaleString()}</span>
        {to > from && (
          <>
            –<span className="font-medium text-foreground">{to.toLocaleString()}</span>
          </>
        )}{" "}
        of <span className="font-medium text-foreground">{totalItems.toLocaleString()}</span> {noun}
      </p>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {!hidePageSize && (
          <PageSizeSelect value={pageSize as PageSize} onChange={onPageSizeChange} />
        )}
        <DataPagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}
