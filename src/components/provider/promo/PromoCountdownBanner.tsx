import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, Clock } from "lucide-react";
import { useActivePromotion, type PromoTarget } from "@/hooks/useActivePromotion";
import { TIER_PRICING, fmtMoneyWhole, applyPromoPercent, type TierKey } from "@/lib/billingPricing";

interface PromoCountdownBannerProps {
  facilityId?: string;
  /** Restrict to specific target products (e.g. ["featured"] on the Featured page). */
  targets?: PromoTarget[];
  className?: string;
}

function targetRoute(target: PromoTarget, promoId: string): string {
  const p = `promo=${promoId}`;
  switch (target) {
    case "pro": return `/provider/billing?upgrade=pro&${p}`;
    case "featured": return `/provider/marketing/featured?${p}`;
    case "concierge": return `/provider/marketing/concierge?${p}`;
  }
}

function useCountdown(endsAtIso: string): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000 * 30);
    return () => window.clearInterval(t);
  }, []);
  const ms = new Date(endsAtIso).getTime() - now;
  if (ms <= 0) return "ending now";
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

/**
 * Polished, time-sensitive FOMO banner for the live conversion promo. Self-hides
 * when there's no live promo for the provider's tier (or none matching `targets`).
 * Shows the discounted price, a live countdown to the promo's end, and a CTA that
 * carries the promo id to checkout (server re-validates + auto-applies the coupon).
 */
export function PromoCountdownBanner({ facilityId, targets, className }: PromoCountdownBannerProps) {
  const { promo } = useActivePromotion(facilityId);
  const countdown = useCountdown(promo?.ends_at ?? new Date().toISOString());

  if (!promo) return null;
  if (targets && !targets.includes(promo.target_product)) return null;

  const tierKey = promo.target_product as TierKey;
  const monthly = TIER_PRICING[tierKey]?.monthlyCents ?? 0;
  const pct = promo.discount_percent ?? 0;
  const discounted = applyPromoPercent(monthly, pct);
  const hasDiscount = pct > 0 && discounted < monthly;
  const durationLabel = promo.discount_duration_months
    ? ` for ${promo.discount_duration_months} mo`
    : "";

  return (
    <div
      className={`rounded-xl border-2 border-amber-300/70 bg-gradient-to-br from-amber-50 via-white to-amber-50/50 p-4 sm:p-5 ${className ?? ""}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md">
          <Sparkles className="h-6 w-6" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm sm:text-base font-bold text-slate-900">{promo.headline}</h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
              <Clock className="h-3 w-3" aria-hidden />
              {promo.urgency_label ? `${promo.urgency_label} · ${countdown}` : countdown}
            </span>
          </div>
          {promo.subcopy && (
            <p className="mt-1 text-xs sm:text-sm text-slate-700 leading-relaxed">{promo.subcopy}</p>
          )}
          {hasDiscount && monthly > 0 && (
            <p className="mt-1.5 text-xs sm:text-sm text-slate-800">
              <span className="font-semibold text-emerald-700">{pct}% off</span>{" "}
              <span className="line-through text-slate-400">{fmtMoneyWhole(monthly)}/mo</span>{" "}
              <span className="font-bold text-slate-900">{fmtMoneyWhole(discounted)}/mo{durationLabel}</span>
              {durationLabel && (
                <span className="text-slate-500">, then {fmtMoneyWhole(monthly)}/mo</span>
              )}
            </p>
          )}
        </div>
        <div className="shrink-0">
          <Link
            to={targetRoute(promo.target_product, promo.id)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-600"
          >
            {promo.cta_label || "Claim this offer"}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
