/**
 * Reactivity tests for usePagination.
 *
 * Goal: lock down behaviour that page consumers depend on so that filter /
 * tab / search changes never strand the user on a no-longer-existent page,
 * and `totalPages` always reflects the latest `totalItems`.
 *
 * Scenarios covered:
 *   1. totalItems shrinks (filter narrows result set) → `page` auto-clamps
 *      so the user never sees an empty page. `totalPages` updates.
 *   2. totalItems grows (filter loosens / tab broadens) → `page` stays put,
 *      `totalPages` updates.
 *   3. pageSize change always resets to page 1 (documented contract).
 *   4. `reset()` returns to page 1 — this is the hook the consumer pages
 *      MUST call in their tab/filter onChange handlers to land users on
 *      page 1 of the new view.
 *   5. totalItems = 0 → totalPages clamps to 1 (never 0 / NaN).
 */

import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { usePagination } from "../usePagination";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

describe("usePagination — totalItems reactivity", () => {
  it("clamps page when totalItems shrinks below current page", () => {
    let totalItems = 100; // 4 pages at pageSize 25
    const { result, rerender } = renderHook(
      () => usePagination({ totalItems, defaultPageSize: 25 }),
      { wrapper },
    );

    act(() => result.current.setPage(4));
    expect(result.current.page).toBe(4);
    expect(result.current.totalPages).toBe(4);

    // Filter narrows result set: 100 → 30 (only 2 pages now).
    totalItems = 30;
    rerender();

    expect(result.current.totalPages).toBe(2);
    expect(result.current.page).toBe(2); // clamped from 4 → 2
  });

  it("does not move page when totalItems grows", () => {
    let totalItems = 50; // 2 pages
    const { result, rerender } = renderHook(
      () => usePagination({ totalItems, defaultPageSize: 25 }),
      { wrapper },
    );

    act(() => result.current.setPage(2));
    expect(result.current.page).toBe(2);

    // Filter loosens: 50 → 200 (8 pages).
    totalItems = 200;
    rerender();

    expect(result.current.totalPages).toBe(8);
    expect(result.current.page).toBe(2); // unchanged — user keeps their place
  });

  it("recomputes totalPages when pageSize changes and resets to page 1", () => {
    const { result } = renderHook(
      () => usePagination({ totalItems: 100, defaultPageSize: 25 }),
      { wrapper },
    );

    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);
    expect(result.current.totalPages).toBe(4);

    act(() => result.current.setPageSize(10));
    expect(result.current.totalPages).toBe(10);
    expect(result.current.page).toBe(1); // setPageSize MUST reset
  });

  it("`reset()` returns to page 1 (consumer pages MUST call this on tab/filter change)", () => {
    const { result } = renderHook(
      () => usePagination({ totalItems: 100, defaultPageSize: 25 }),
      { wrapper },
    );

    act(() => result.current.setPage(4));
    expect(result.current.page).toBe(4);

    act(() => result.current.reset());
    expect(result.current.page).toBe(1);
  });

  it("totalItems = 0 → totalPages = 1 (no NaN, no 0)", () => {
    const { result } = renderHook(
      () => usePagination({ totalItems: 0, defaultPageSize: 25 }),
      { wrapper },
    );
    expect(result.current.totalPages).toBe(1);
    expect(result.current.page).toBe(1);
  });

  it("paginate() returns the correct slice for the current page", () => {
    const items = Array.from({ length: 53 }, (_, i) => i);
    const { result } = renderHook(
      () => usePagination({ totalItems: items.length, defaultPageSize: 25 }),
      { wrapper },
    );

    expect(result.current.paginate(items)).toEqual(items.slice(0, 25));

    act(() => result.current.setPage(2));
    expect(result.current.paginate(items)).toEqual(items.slice(25, 50));

    act(() => result.current.setPage(3));
    expect(result.current.paginate(items)).toEqual(items.slice(50, 53));
  });

  it("setPage clamps to [1, totalPages]", () => {
    const { result } = renderHook(
      () => usePagination({ totalItems: 30, defaultPageSize: 10 }),
      { wrapper },
    );

    act(() => result.current.setPage(99));
    expect(result.current.page).toBe(3); // clamped to totalPages

    act(() => result.current.setPage(-5));
    expect(result.current.page).toBe(1); // clamped to 1
  });
});
