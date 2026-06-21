import { describe, it, expect } from "vitest";
import {
  responseStatusToLeadStatus,
  validateTransition,
  LEAD_TRANSITIONS,
  type LeadStatusValue,
} from "@/lib/statusTransitions";

describe("responseStatusToLeadStatus — provider-response → pipeline-status forward sync", () => {
  it("maps contacted/responded/closed to a pipeline status", () => {
    expect(responseStatusToLeadStatus("contacted")).toBe("contacted");
    expect(responseStatusToLeadStatus("responded")).toBe("responding");
    expect(responseStatusToLeadStatus("closed")).toBe("closed");
  });

  it("returns null for pending (a correction — never advances the pipeline)", () => {
    expect(responseStatusToLeadStatus("pending")).toBeNull();
  });

  it("returns null for unknown values (no pipeline change)", () => {
    expect(responseStatusToLeadStatus("")).toBeNull();
    expect(responseStatusToLeadStatus("something_else")).toBeNull();
  });

  // The forward-sync write is best-effort and relies on the DB trigger to
  // reject illegal hops. Assert that each mapped target is a *real* lead
  // status, and that the common forward hops from a fresh 'new' lead are
  // legal (so the happy path actually syncs, not silently no-ops).
  it("only ever targets real lead statuses", () => {
    for (const rs of ["contacted", "responded", "closed"]) {
      const mapped = responseStatusToLeadStatus(rs) as LeadStatusValue;
      expect(Object.keys(LEAD_TRANSITIONS)).toContain(mapped);
    }
  });

  it("maps to legal transitions from a fresh 'new' lead", () => {
    for (const rs of ["contacted", "responded", "closed"]) {
      const mapped = responseStatusToLeadStatus(rs) as LeadStatusValue;
      expect(validateTransition("lead", "new", mapped).ok).toBe(true);
    }
  });

  it("maps 'closed' to a terminal-safe hop (rejected from terminal states by the trigger, never crashes the mapping)", () => {
    // converted -> closed is legal; closed -> closed is a same-status no-op.
    expect(validateTransition("lead", "converted", "closed").ok).toBe(true);
    expect(validateTransition("lead", "closed", "closed").ok).toBe(true);
  });
});
