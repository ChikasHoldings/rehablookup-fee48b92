import { ShieldAlert } from "lucide-react";

/**
 * Persistent reminder banner displayed at the top of every concierge
 * admin page. Communicates the advisor compensation structure
 * inline — evidence (if ever asked) that we surface the salary-not-
 * commission framing to advisors at the point of work.
 *
 * Single line, brand-navy, subtle. Not dismissible.
 */
export function AdvisorReminder() {
  return (
    <div
      role="note"
      aria-label="Advisor compensation reminder"
      className="rounded-md border border-[#1B365D]/20 bg-[#1B365D]/[0.04] px-3 py-2 text-xs text-slate-700 flex items-start gap-2"
    >
      <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#1B365D]" aria-hidden />
      <span>
        <strong className="text-[#1B365D]">RehabLookup advisors are compensated on salary</strong>
        , not per introduction or per admission. Questions about advisor
        compensation should be directed to the compliance team.
      </span>
    </div>
  );
}
