import { Card, CardContent } from "@/components/ui/card";
import { fmtMoney } from "@/lib/billingPricing";

export type CancellationScope = "all" | "addon-featured" | "addon-concierge";

export interface CancellationPiece {
  tier: "pro" | "featured" | "concierge";
  paidAmountCents: number;
  monthsUsed: number;
  chargeForUseCents: number;
  refundCents: number;
}

export interface CancellationPreviewData {
  billing_period: "monthly" | "annual" | null;
  period_end: string | null;
  scope: CancellationScope;
  pieces: CancellationPiece[];
  total_refund_cents: number;
  no_refund_monthly: boolean;
}

interface CancellationPreviewProps {
  data: CancellationPreviewData;
}

const TIER_LABEL: Record<CancellationPiece["tier"], string> = {
  pro: "Pro",
  featured: "Featured",
  concierge: "Concierge Partner",
};

/**
 * Renders the math the user sees BEFORE confirming cancellation.
 * Monthly: "no refund, access through period_end" disclosure (no math).
 * Annual: per-piece breakdown — paid / months used / refund.
 */
export function CancellationPreview({ data }: CancellationPreviewProps) {
  const periodEndStr = data.period_end
    ? new Date(data.period_end).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      })
    : null;

  if (data.no_refund_monthly) {
    return (
      <Card>
        <CardContent className="p-5 space-y-3 text-sm">
          <p className="font-semibold text-slate-900 text-base">
            You're on a monthly plan.
          </p>
          <p className="text-slate-700">
            Cancellation takes effect at the end of your current billing month
            {periodEndStr ? <> (<strong>{periodEndStr}</strong>)</> : null}.
            You keep full access until then. <strong>No refund needed</strong> — you paid for
            the month you got.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-5 space-y-4 text-sm">
        <p className="font-semibold text-slate-900 text-base">
          You're on an annual plan. Here's the math:
        </p>

        <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3 font-mono text-xs leading-6 overflow-x-auto">
          {data.pieces.map((piece) => (
            <div key={piece.tier} className="mb-3 last:mb-0">
              <div className="font-sans font-semibold text-slate-900 text-sm not-italic mb-1">
                {TIER_LABEL[piece.tier]}
              </div>
              <div>Paid for the year:               {fmtMoney(piece.paidAmountCents).padStart(12)}</div>
              <div>
                Months used ({piece.monthsUsed.toString().padStart(2)}):                {`-${fmtMoney(piece.chargeForUseCents)}`.padStart(12)}
              </div>
              <div>──────────────────────────────────────────</div>
              <div className="font-semibold">
                Refund:                          {fmtMoney(piece.refundCents).padStart(12)}
              </div>
            </div>
          ))}
          {data.pieces.length > 1 && (
            <div className="border-t border-slate-300 pt-2 mt-2 font-semibold">
              Total refund:                    {fmtMoney(data.total_refund_cents).padStart(12)}
            </div>
          )}
        </div>

        <p className="text-xs text-slate-500">
          Refunds issue to your original payment method within 5-10 business days.
          Subscription ends immediately upon confirmation. The months-used charge
          uses the full monthly rate ($99 / $599 / $1,000) — the 15% annual
          discount is forfeited on partial years.
        </p>
      </CardContent>
    </Card>
  );
}
