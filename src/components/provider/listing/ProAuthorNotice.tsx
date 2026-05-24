import { Link } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";

/**
 * Amber "Pro" notice shown on EnhancedProfile content sections for Free
 * providers. Per the product decision, Free providers keep authoring
 * this content now (it's masked on the public profile server-side via
 * the public_facility_* / has_active_pro views and goes live on upgrade),
 * so this is an informational notice WITH a clear upgrade CTA — not a
 * hard lock.
 */
export function ProAuthorNotice({ feature }: { feature: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-200/60 bg-amber-50/60 p-3 text-sm">
      <Sparkles className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" aria-hidden />
      <div className="text-amber-900 leading-relaxed">
        <p>
          {feature} are <strong>visible on your public profile only with Pro</strong>.
          Author them here now — they go live the moment you upgrade, nothing is lost.
        </p>
        <Link
          to="/provider/billing?upgrade=pro"
          className="mt-1.5 inline-flex items-center gap-1 font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-950"
        >
          Upgrade to Pro <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
