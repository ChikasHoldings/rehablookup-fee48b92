/**
 * CenterInsurance
 * ───────────────
 * Insurance & Payment section. Renders each plan as a chip. When sliding
 * scale / financial assistance is in the list, surfaces a callout so
 * cost-sensitive visitors don't bounce. Empty state nudges visitors to
 * verify coverage rather than rendering "—".
 */
import { Link } from "react-router-dom";

function Chip({ label, highlight }: { label: string; highlight?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
        highlight
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-slate-50 text-slate-700 border border-slate-200"
      }`}
    >
      {label}
    </span>
  );
}

const KNOWN_HIGHLIGHTS = new Set([
  "Medicare",
  "Medicaid",
  "Tricare",
  "Self-Pay/Private Pay",
]);

interface CenterInsuranceProps {
  insurance: string[];
}

export function CenterInsurance({ insurance }: CenterInsuranceProps) {
  const hasSlidingScale = insurance.some((i) =>
    /sliding|financial assistance/i.test(i),
  );

  return (
    <section id="insurance" className="scroll-mt-24">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">Insurance &amp; Payment</h2>
      {insurance.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {insurance.map((i) => (
            <Chip key={i} label={i} highlight={KNOWN_HIGHLIGHTS.has(i)} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-600">
          Contact the center to verify insurance coverage.
        </p>
      )}
      {hasSlidingScale && (
        <p className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-900">
          Sliding-scale fees and financial assistance may be available — verify
          with the center.
        </p>
      )}
      <p className="mt-4 text-xs text-slate-500">
        Not sure if your plan is accepted?{" "}
        <Link to="/insurance-verification" className="text-emerald-700 hover:underline font-medium">
          Verify your insurance →
        </Link>
      </p>
    </section>
  );
}
