import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

const PAGE_SIZE_STORAGE_PREFIX = "pageSize:";

function readStoredPageSize(tableId: string | undefined, fallback: PageSize): PageSize {
  if (!tableId || typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(`${PAGE_SIZE_STORAGE_PREFIX}${tableId}`);
    if (!raw) return fallback;
    const parsed = Number(raw);
    return (PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed)
      ? (parsed as PageSize)
      : fallback;
  } catch {
    return fallback;
  }
}

export interface UsePaginationOptions {
  /** Stable id used to persist user's page-size choice in localStorage. */
  tableId?: string;
  /** Initial page size (default 25). Falls back when no stored value. */
  defaultPageSize?: PageSize;
  /** Total number of items — required to clamp `page` and compute `totalPages`. */
  totalItems?: number;
  /**
   * If true, sync `page` and `pageSize` to URL query params (`p`, `ps`).
   * Use only on indexable public pages.
   */
  syncToUrl?: boolean;
  /** Custom URL param names when syncToUrl is true. */
  pageParam?: string;
  pageSizeParam?: string;
}

export interface UsePaginationResult {
  page: number;
  pageSize: PageSize;
  totalPages: number;
  /** Inclusive zero-based start index for slicing client-side arrays. */
  from: number;
  /** Exclusive zero-based end index for slicing client-side arrays. */
  to: number;
  setPage: (page: number) => void;
  setPageSize: (size: PageSize) => void;
  /** Resets to page 1 — call when filters change. */
  reset: () => void;
  /** Slice helper for client-side arrays. */
  paginate: <T>(items: readonly T[]) => T[];
}

/**
 * Numbered-page pagination hook with optional URL sync and per-table
 * persisted page size. Always resets to page 1 when pageSize changes.
 */
export function usePagination(options: UsePaginationOptions = {}): UsePaginationResult {
  const {
    tableId,
    defaultPageSize = 25,
    totalItems,
    syncToUrl = false,
    pageParam = "p",
    pageSizeParam = "ps",
  } = options;

  const [searchParams, setSearchParams] = useSearchParams();

  const initialPageSize = useMemo<PageSize>(() => {
    if (syncToUrl) {
      const raw = Number(searchParams.get(pageSizeParam));
      if ((PAGE_SIZE_OPTIONS as readonly number[]).includes(raw)) return raw as PageSize;
    }
    return readStoredPageSize(tableId, defaultPageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initialPage = useMemo(() => {
    if (syncToUrl) {
      const raw = Number(searchParams.get(pageParam));
      if (Number.isFinite(raw) && raw >= 1) return Math.floor(raw);
    }
    return 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [page, setPageState] = useState<number>(initialPage);
  const [pageSize, setPageSizeState] = useState<PageSize>(initialPageSize);

  const totalPages = useMemo(() => {
    if (typeof totalItems !== "number" || totalItems <= 0) return 1;
    return Math.max(1, Math.ceil(totalItems / pageSize));
  }, [totalItems, pageSize]);

  // Clamp page when totalPages shrinks (e.g., filter narrowed results).
  useEffect(() => {
    if (page > totalPages) setPageState(totalPages);
  }, [page, totalPages]);

  // Persist page size per table id.
  useEffect(() => {
    if (!tableId || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(`${PAGE_SIZE_STORAGE_PREFIX}${tableId}`, String(pageSize));
    } catch {
      /* ignore quota / private mode */
    }
  }, [tableId, pageSize]);

  // URL sync (public pages only).
  useEffect(() => {
    if (!syncToUrl) return;
    const next = new URLSearchParams(searchParams);
    if (page > 1) next.set(pageParam, String(page));
    else next.delete(pageParam);
    if (pageSize !== defaultPageSize) next.set(pageSizeParam, String(pageSize));
    else next.delete(pageSizeParam);
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, syncToUrl]);

  const setPage = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(1, Math.floor(next)), totalPages);
      setPageState(clamped);
    },
    [totalPages],
  );

  const setPageSize = useCallback((size: PageSize) => {
    setPageSizeState(size);
    setPageState(1);
  }, []);

  const reset = useCallback(() => setPageState(1), []);

  const from = (page - 1) * pageSize;
  const to = from + pageSize;

  const paginate = useCallback(
    <T,>(items: readonly T[]): T[] => items.slice(from, to),
    [from, to],
  );

  return { page, pageSize, totalPages, from, to, setPage, setPageSize, reset, paginate };
}
