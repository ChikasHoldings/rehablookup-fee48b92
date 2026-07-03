/**
 * Regression test for the admin idle-timeout hook.
 *
 * The bug: the activity throttle compared `now` against the last ACTIVITY
 * timestamp (bumped on every event) instead of the last RESET, so during
 * sustained activity with sub-10s gaps the timer was never re-armed and an
 * actively-working admin was logged out at exactly 30 minutes. These tests
 * pin the fixed behaviour: sustained activity keeps the session alive, and a
 * genuinely idle session still times out.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: vi.fn().mockResolvedValue({ data: null, error: null }) },
}));
vi.mock("sonner", () => ({ toast: { warning: vi.fn() } }));

import { useAdminIdleTimeout } from "../useAdminIdleTimeout";

const IDLE_MS = 30 * 60 * 1000;

describe("useAdminIdleTimeout", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });

  it("does NOT log out an admin who stays continuously active", () => {
    const onTimeout = vi.fn();
    renderHook(() => useAdminIdleTimeout({ userId: "u1", enabled: true, onTimeout }));

    // 60 minutes of activity, one event every 5s (gaps < the 10s throttle) —
    // the exact scenario that defeated the old debounce.
    for (let elapsed = 0; elapsed < 60 * 60 * 1000; elapsed += 5000) {
      vi.advanceTimersByTime(5000);
      document.dispatchEvent(new Event("keydown"));
    }

    expect(onTimeout).not.toHaveBeenCalled();
  });

  it("logs out after the idle window elapses with no activity", () => {
    const onTimeout = vi.fn();
    renderHook(() => useAdminIdleTimeout({ userId: "u1", enabled: true, onTimeout }));

    vi.advanceTimersByTime(IDLE_MS + 1000);

    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("does nothing when disabled", () => {
    const onTimeout = vi.fn();
    renderHook(() => useAdminIdleTimeout({ userId: "u1", enabled: false, onTimeout }));
    vi.advanceTimersByTime(IDLE_MS + 1000);
    expect(onTimeout).not.toHaveBeenCalled();
  });
});
