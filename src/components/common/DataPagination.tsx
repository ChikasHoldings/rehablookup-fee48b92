import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

interface DataPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** How many siblings to show on each side of current. Default 1. */
  siblingCount?: number;
  className?: string;
}

/**
 * Numbered pagination: `Prev / 1 … current-1 current current+1 … N / Next`.
 * Hidden entirely when totalPages <= 1.
 */
export function DataPagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  className,
}: DataPaginationProps) {
  if (totalPages <= 1) return null;

  const pages = computePageList(currentPage, totalPages, siblingCount);

  const go = (e: React.MouseEvent, page: number) => {
    e.preventDefault();
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);
  };

  return (
    <Pagination className={cn("justify-end", className)}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => go(e, currentPage - 1)}
            aria-disabled={currentPage === 1}
            className={cn(
              currentPage === 1 && "pointer-events-none opacity-50",
            )}
          />
        </PaginationItem>

        {pages.map((p, idx) =>
          p === "ellipsis" ? (
            <PaginationItem key={`e-${idx}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <PaginationLink
                href="#"
                isActive={p === currentPage}
                onClick={(e) => go(e, p)}
              >
                {p}
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => go(e, currentPage + 1)}
            aria-disabled={currentPage === totalPages}
            className={cn(
              currentPage === totalPages && "pointer-events-none opacity-50",
            )}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

function computePageList(
  current: number,
  total: number,
  siblings: number,
): Array<number | "ellipsis"> {
  const totalNumbersToShow = siblings * 2 + 5; // first + last + current + 2*siblings + 2 ellipses
  if (total <= totalNumbersToShow) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const leftSibling = Math.max(current - siblings, 1);
  const rightSibling = Math.min(current + siblings, total);
  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < total - 1;

  const pages: Array<number | "ellipsis"> = [];

  // Always show first page
  pages.push(1);

  if (showLeftEllipsis) pages.push("ellipsis");
  else if (leftSibling === 2) pages.push(2);

  for (let p = Math.max(leftSibling, 2); p <= Math.min(rightSibling, total - 1); p++) {
    pages.push(p);
  }

  if (showRightEllipsis) pages.push("ellipsis");
  else if (rightSibling === total - 1) pages.push(total - 1);

  if (total > 1) pages.push(total);

  // Dedupe (in case rightSibling === total)
  return pages.filter((p, i, arr) => p !== arr[i - 1]);
}
